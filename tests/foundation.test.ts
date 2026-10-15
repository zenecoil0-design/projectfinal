import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { baseline, asUser, A, B, PA, PB, LA, LB, sections } from "./helpers/baseline";

const sql = (name: string) => readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
async function migrated() {
  const db = await baseline();
  await db.exec(await sql("202610130001_atomic_portfolio_selection"));
  await db.exec(await sql("202610150001_portfolio_foundation"));
  return db;
}

test("foundation denies cross-account direct writes despite baseline permissive policies; RPC still works", async () => {
  const db = await migrated();
  try {
    await asUser(db, A);
    for (const [kind, plural] of sections) {
      assert.equal((await db.query(`TABLE portfolio_${plural}`)).rows.length, 1);
      await assert.rejects(db.query(`INSERT INTO portfolio_${plural}(portfolio_id,${kind}_id) VALUES($1,$2)`, [PA, LB]), /row-level security/);
      await assert.rejects(db.query(`UPDATE portfolio_${plural} SET ${kind}_id=$1 WHERE portfolio_id=$2`, [LB, PA]), /row-level security/);
      assert.equal((await db.query(`UPDATE portfolio_${plural} SET sort_order=9 WHERE portfolio_id=$1 RETURNING id`, [PB])).rows.length, 0);
      assert.equal((await db.query(`DELETE FROM portfolio_${plural} WHERE portfolio_id=$1 RETURNING id`, [PB])).rows.length, 0);
      await assert.rejects(db.query("SELECT replace_portfolio_selection($1,$2,$3::uuid[])", [PA, kind, [LB]]), /access denied/);
      await db.query("SELECT replace_portfolio_selection($1,$2,$3::uuid[])", [PA, kind, []]);
      await db.query("SELECT replace_portfolio_selection($1,$2,$3::uuid[])", [PA, kind, [LA]]);
      assert.deepEqual((await db.query(`SELECT ${kind}_id AS id,sort_order FROM portfolio_${plural}`)).rows, [{id: LA, sort_order: 0}]);
    }
    await db.exec("RESET ROLE");
    await asUser(db, B);
    assert.deepEqual((await db.query("SELECT activity_id FROM portfolio_activities")).rows, [{activity_id: LB}]);
  } finally { await db.close(); }
});

test("foundation keeps one section per portfolio, rejects blank titles and grants safe activity image updates", async () => {
  const db = await migrated();
  try {
    await asUser(db, A);
    for (const section of ["covers", "profiles", "prefaces"]) {
      await db.query(`INSERT INTO ${section}(portfolio_id) VALUES($1)`, [PA]);
      await assert.rejects(db.query(`INSERT INTO ${section}(portfolio_id) VALUES($1)`, [PA]), /unique constraint/);
      await assert.rejects(db.query(`INSERT INTO ${section}(portfolio_id) VALUES($1)`, [PB]), /row-level security/);
    }
    for (const plural of ["activities", "certificates"]) {
      for (const title of ["", "  ", "\n\t"]) {
        await assert.rejects(db.query(`INSERT INTO user_library_${plural}(user_id,title) VALUES($1,$2)`, [A,title]), /check constraint/);
      }
      await db.query(`INSERT INTO user_library_${plural}(user_id,title) VALUES($1,'ชื่อทดสอบ')`, [A]);
    }
    await db.query("INSERT INTO user_library_activity_images(activity_id,image_url) VALUES($1,'test.png')", [LA]);
    assert.equal((await db.query("UPDATE user_library_activity_images SET sort_order=3 RETURNING sort_order")).rows[0].sort_order, 3);
    await assert.rejects(db.query("UPDATE user_library_activity_images SET activity_id=$1", [LB]), /row-level security/);
    await db.exec("RESET ROLE");
    await asUser(db, B);
    assert.equal((await db.query("UPDATE user_library_activity_images SET sort_order=9 RETURNING id")).rows.length, 0);
  } finally { await db.close(); }
});

test("portfolio cascade removes sections and relations, keeps library, accounts and Storage; source delete removes all links", async () => {
  const db = await migrated();
  try {
    for (const table of ["covers","profiles","prefaces","activities","certificates","educations"]) {
      await db.query(`INSERT INTO ${table}(portfolio_id) VALUES($1)`, [PA]);
    }
    await asUser(db, A);
    await db.query("DELETE FROM portfolios WHERE id=$1", [PA]);
    await db.exec("RESET ROLE");
    for (const table of ["covers","profiles","prefaces","activities","certificates","educations"]) {
      assert.equal((await db.query(`TABLE ${table}`)).rows.length, 0);
    }
    for (const [,plural] of sections) {
      assert.equal((await db.query(`TABLE user_library_${plural}`)).rows.length, 2);
      assert.equal((await db.query(`TABLE portfolio_${plural}`)).rows.length, 1);
    }
    assert.equal((await db.query("TABLE auth.users")).rows.length, 2);
    assert.equal((await db.query("TABLE public.users")).rows.length, 2);
    assert.equal((await db.query("TABLE storage.objects")).rows.length, 1);
    // Copies are separate portfolios referencing the same library source.
    await db.query("INSERT INTO portfolios(user_id) VALUES($1)", [B]);
    await db.query("INSERT INTO portfolio_activities(portfolio_id,activity_id) SELECT id,$1 FROM portfolios WHERE user_id=$2 AND id<>$3", [LB,B,PB]);
    await asUser(db, B);
    await db.query("DELETE FROM user_library_activities WHERE id=$1", [LB]);
    await db.exec("RESET ROLE");
    assert.equal((await db.query("TABLE portfolio_activities")).rows.length, 0);
  } finally { await db.close(); }
});

test("foundation reruns safely, limits grants, retains signup/email triggers and rejects anonymous RPC", async () => {
  const db = await migrated();
  try {
    await db.exec(await sql("202610150001_portfolio_foundation"));
    const C = "00000000-0000-0000-0000-000000000003";
    await db.query("INSERT INTO auth.users VALUES($1,'c@example.invalid')", [C]);
    await db.query("UPDATE auth.users SET email='updated@example.invalid' WHERE id=$1", [C]);
    assert.equal((await db.query("SELECT email FROM public.users WHERE id=$1", [C])).rows[0].email,"updated@example.invalid");
    const tables = (await db.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows;
    for (const {tablename} of tables) {
      for (const role of ["anon","authenticated"]) {
        for (const privilege of role === "anon" ? ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"] : ["TRUNCATE","REFERENCES","TRIGGER"]) {
          assert.equal((await db.query("SELECT has_table_privilege($1,$2,$3) AS allowed", [role,`public.${tablename}`,privilege])).rows[0].allowed,false,`${role}.${tablename}.${privilege}`);
        }
      }
    }
    await asUser(db, A);
    await assert.rejects(db.exec("TRUNCATE public.portfolios CASCADE"), /permission denied/);
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE anon");
    await assert.rejects(db.exec("SELECT * FROM portfolios"), /permission denied/);
    await assert.rejects(db.query("SELECT replace_portfolio_selection($1,'activity',ARRAY[]::uuid[])", [PA]), /permission denied/);
  } finally { await db.close(); }
});

test("invalid existing data aborts migration atomically without silently deleting it", async () => {
  const db = await baseline();
  try {
    await db.query("INSERT INTO portfolio_activities(portfolio_id,activity_id) VALUES($1,$2)", [PA,LB]);
    await assert.rejects(db.exec(await sql("202610150001_portfolio_foundation")), /Cross-owner relations/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("TABLE portfolio_activities")).rows.length,3);
    // Earlier NOT NULL and FK changes were rolled back too.
    await db.exec("INSERT INTO portfolios DEFAULT VALUES");
    assert.equal((await db.query("SELECT confdeltype FROM pg_constraint WHERE conname='covers_portfolio_id_fkey'")).rows[0].confdeltype,"a");
  } finally { await db.close(); }
});

test("complete SQL Editor sequence resets test data, installs both migrations and verifies the report", async () => {
  const db = await baseline();
  try {
    await db.exec(await readFile(new URL("../scripts/maintenance/reset-test-data.sql", import.meta.url), "utf8"));
    await db.exec(await sql("202610130001_atomic_portfolio_selection"));
    await db.exec(await sql("202610150001_portfolio_foundation"));
    const result = await db.query<{foundation_report: {
      accounts: Record<string, number>;
      remaining: Record<string, number>;
      foundation: Record<string, number | boolean>;
    }}>(await readFile(new URL("../scripts/inspection/verify-foundation.sql", import.meta.url), "utf8"));
    const report = result.rows[0].foundation_report;
    assert.deepEqual(report.accounts, {auth_users:2,public_users:2,auth_without_public_user:0});
    assert.deepEqual(report.remaining, {portfolios:0,library_items:0,sections:0,tags:0,storage_objects:1});
    assert.deepEqual(report.foundation, {safe_table_grants:true,rpc_installed:true,restrictive_relation_policies:3,single_section_constraints:3,section_cascade_constraints:6,title_constraints:2});
    await asUser(db, A);
    await db.query("INSERT INTO portfolios(id,user_id,title) VALUES($1,$2,'New portfolio')", [PA,A]);
    await db.query("INSERT INTO covers(portfolio_id) VALUES($1)", [PA]);
  } finally { await db.close(); }
});

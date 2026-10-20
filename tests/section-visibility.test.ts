import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { baseline, asUser, A, B, PA, PB } from "./helpers/baseline";
import { defaultVisibility, parseVisibilityRows, showContents, visibilitySections } from "../src/lib/editor/section-visibility";

const migration = () => readFile(new URL("../supabase/migrations/20261020084510_section_visibility.sql", import.meta.url), "utf8");
async function fixture() {
  const db = await baseline();
  await db.exec(await readFile(new URL("../supabase/migrations/202610150001_portfolio_foundation.sql", import.meta.url), "utf8"));
  await db.exec(await migration());
  return db;
}

test("visibility defaults are all on only after a valid read; invalid/incomplete payload never becomes success", () => {
  assert.deepEqual(parseVisibilityRows([]), defaultVisibility());
  assert.deepEqual(Object.values(defaultVisibility()), [true, true, true, true, true, true]);
  const values = parseVisibilityRows([{ section: "profile", visible: false }]);
  assert.equal(values.profile, false); assert.equal(values.toc, true);
  for (const data of [null, undefined, {}, [{ section: "cover", visible: false }], [{ section: "toc", visible: "false" }], [{ section: "toc", visible: null }], [{ section: "toc", visible: true }, { section: "toc", visible: false }]]) {
    assert.throws(() => parseVisibilityRows(data));
  }
  for (const section of ["profile", "education", "activity", "certificate"] as const) values[section] = false;
  assert.equal(showContents(values), false); assert.equal(values.toc, true);
  values.education = true; assert.equal(showContents(values), true);
  values.toc = false; assert.equal(showContents(values), false);
});

test("visibility additive migration preserves existing content, accounts, files and default document", async () => {
  const db = await baseline();
  try {
    await db.query("INSERT INTO covers(portfolio_id) VALUES($1)", [PA]);
    const tables = ["portfolios", "covers", "profiles", "user_library_activities", "portfolio_activities", "auth.users", "public.users", "storage.objects"];
    const before = await Promise.all(tables.map(table => db.query(`TABLE ${table}`)));
    await db.exec(await migration());
    for (const [index, table] of tables.entries()) assert.deepEqual((await db.query(`TABLE ${table}`)).rows, before[index].rows, table);
    await asUser(db, A);
    assert.deepEqual(parseVisibilityRows((await db.query("SELECT section,visible FROM portfolio_section_visibility WHERE portfolio_id=$1", [PA])).rows), defaultVisibility());
  } finally { await db.close(); }
});

test("visibility permits only six sections and booleans, so cover cannot be disabled even via direct SQL", async () => {
  const db = await fixture();
  try {
    await asUser(db, A);
    for (const section of visibilitySections) {
      await db.query("INSERT INTO portfolio_section_visibility(portfolio_id,section) VALUES($1,$2)", [PA, section]);
    }
    assert.equal((await db.query<{ n: number }>("SELECT count(*)::int n FROM portfolio_section_visibility WHERE visible=true")).rows[0].n, 6);
    for (const section of ["cover", "unknown", "", null]) await assert.rejects(db.query("INSERT INTO portfolio_section_visibility VALUES($1,$2,false)", [PA, section]), /check constraint|not-null constraint/);
    await assert.rejects(db.query("UPDATE portfolio_section_visibility SET visible=null WHERE section='toc'"), /not-null constraint/);
    await assert.rejects(db.query("UPDATE portfolio_section_visibility SET visible='not-a-boolean' WHERE section='toc'"), /invalid input syntax/);
    await assert.rejects(db.query("UPDATE portfolio_section_visibility SET section='cover' WHERE section='toc'"), /check constraint/);
    assert.equal((await db.query("TABLE portfolio_section_visibility")).rows.length, 6);
  } finally { await db.close(); }
});

test("visibility enforces ownership for select/insert/update/upsert and denies anonymous/direct delete", async () => {
  const db = await fixture();
  try {
    await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'profile',false)", [PB]);
    await asUser(db, A);
    assert.equal((await db.query("TABLE portfolio_section_visibility")).rows.length, 0);
    await assert.rejects(db.query("INSERT INTO portfolio_section_visibility VALUES($1,'toc',false)", [PB]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO portfolio_section_visibility VALUES($1,'profile',true) ON CONFLICT(portfolio_id,section) DO UPDATE SET visible=excluded.visible", [PB]), /row-level security/);
    assert.equal((await db.query("UPDATE portfolio_section_visibility SET visible=true WHERE portfolio_id=$1 RETURNING section", [PB])).rows.length, 0);
    await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'toc',false)", [PA]);
    await assert.rejects(db.query("UPDATE portfolio_section_visibility SET portfolio_id=$1", [PB]), /row-level security/);
    await assert.rejects(db.exec("DELETE FROM portfolio_section_visibility"), /permission denied/);
    await db.exec("RESET ROLE"); await asUser(db, B);
    assert.deepEqual((await db.query("SELECT section,visible FROM portfolio_section_visibility")).rows, [{ section: "profile", visible: false }]);
    await db.exec("RESET ROLE; SET ROLE anon");
    await assert.rejects(db.exec("TABLE portfolio_section_visibility"), /permission denied/);
  } finally { await db.close(); }
});

test("section-targeted writes survive stale maps, persist per portfolio and never overwrite other portfolio fields", async () => {
  const db = await fixture();
  try {
    await db.query("UPDATE portfolios SET template_key='minimal',theme_color='green',title='Keep title' WHERE id=$1", [PA]);
    const before = (await db.query("TABLE portfolios")).rows;
    await asUser(db, A);
    // Different tabs can both start with all-on; each writes only its own key.
    const write = (section: string, visible: boolean) => db.query("INSERT INTO portfolio_section_visibility VALUES($1,$2,$3) ON CONFLICT(portfolio_id,section) DO UPDATE SET visible=excluded.visible RETURNING section,visible", [PA, section, visible]);
    await write("profile", false); await write("activity", false);
    const read = () => db.query("SELECT section,visible FROM portfolio_section_visibility WHERE portfolio_id=$1", [PA]);
    assert.equal(parseVisibilityRows((await read()).rows).profile, false);
    assert.equal(parseVisibilityRows((await read()).rows).activity, false);
    await write("profile", true);
    assert.equal(parseVisibilityRows((await read()).rows).activity, false);
    await db.exec("RESET ROLE");
    assert.deepEqual((await db.query("TABLE portfolios")).rows, before);
    assert.deepEqual(parseVisibilityRows((await db.query("SELECT section,visible FROM portfolio_section_visibility WHERE portfolio_id=$1", [PB])).rows), defaultVisibility());
  } finally { await db.close(); }
});

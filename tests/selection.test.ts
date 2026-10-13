import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { packPages } from "../src/lib/editor/pagination";

test("page packing preserves every item, ordering, empty page and oversized cards", () => {
  assert.deepEqual(packPages([], 840), [[]]);
  assert.deepEqual(packPages([400, 400, 400], 840), [[0, 1], [2]]);
  assert.deepEqual(packPages([900, 100], 840), [[0], [1]]);
  assert.deepEqual(packPages([840, 1], 840), [[0], [1]]);
});

test("selection transaction checks ownership and rolls back deletion when insert fails", async () => {
  const db = new PGlite();
  const user = "00000000-0000-0000-0000-000000000001";
  const other = "00000000-0000-0000-0000-000000000002";
  const port = "10000000-0000-0000-0000-000000000001";
  const old = "20000000-0000-0000-0000-000000000001";
  const next = "20000000-0000-0000-0000-000000000002";
  const foreign = "20000000-0000-0000-0000-000000000003";
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table portfolios (id uuid primary key, user_id uuid not null);
    insert into portfolios values ('${port}', '${user}');
    select set_config('request.jwt.claim.sub', '${user}', false);`);
  for (const [kind, plural] of [["education", "educations"], ["activity", "activities"], ["certificate", "certificates"]]) {
    await db.exec(`create table user_library_${plural} (id uuid primary key, user_id uuid not null);
      create table portfolio_${plural} (portfolio_id uuid, ${kind}_id uuid references user_library_${plural}, sort_order integer, unique(portfolio_id, ${kind}_id));
      insert into user_library_${plural} values ('${old}', '${user}'), ('${next}', '${user}'), ('${foreign}', '${other}');`);
  }
  await db.exec(await readFile(new URL("../supabase/migrations/202610130001_atomic_portfolio_selection.sql", import.meta.url), "utf8"));
  const save = (kind: string, ids: string[]) => db.query("select replace_portfolio_selection($1, $2, $3::uuid[])", [port, kind, ids]);
  for (const [kind, plural] of [["education", "educations"], ["activity", "activities"], ["certificate", "certificates"]]) {
    await save(kind, [next, old]);
    const rows = await db.query(`select ${kind}_id as id, sort_order from portfolio_${plural} order by sort_order`);
    assert.deepEqual(rows.rows, [{id: next, sort_order: 0}, {id: old, sort_order: 1}]);
    await assert.rejects(save(kind, [foreign]), /access denied/);
    await assert.rejects(save(kind, [next, next]), /Duplicate/);
    assert.equal((await db.query(`select * from portfolio_${plural}`)).rows.length, 2);
    await save(kind, []);
    assert.equal((await db.query(`select * from portfolio_${plural}`)).rows.length, 0);
  }
  await save("activity", [old]);
  await db.exec(`alter table portfolio_activities add constraint reject_new_for_test check (activity_id <> '${next}');`);
  await assert.rejects(save("activity", [next]), /reject_new_for_test/);
  assert.deepEqual((await db.query("select activity_id from portfolio_activities")).rows, [{ activity_id: old }]);
  await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
  await assert.rejects(save("activity", []), /access denied/);
  await db.exec("select set_config('request.jwt.claim.sub', '', false);");
  await assert.rejects(save("activity", []), /Authentication required/);
  await db.close();
});

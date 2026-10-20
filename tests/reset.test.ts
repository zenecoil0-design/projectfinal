import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { baseline, A, PA } from "./helpers/baseline";
const reset = () => readFile(new URL("../scripts/maintenance/reset-test-data.sql", import.meta.url), "utf8");
test("reset clears only application test data and preserves accounts, signup trigger and Storage metadata", async () => {
  const db = await baseline();
  try {
    const authBefore = (await db.query("TABLE auth.users")).rows;
    const usersBefore = (await db.query("TABLE public.users")).rows;
    await db.exec(`INSERT INTO covers(portfolio_id) VALUES('${PA}'); INSERT INTO profiles(portfolio_id) VALUES('${PA}'); INSERT INTO prefaces(portfolio_id) VALUES('${PA}');`);
    await db.exec(await reset());
    assert.deepEqual((await db.query("TABLE auth.users")).rows, authBefore);
    assert.deepEqual((await db.query("TABLE public.users")).rows, usersBefore);
    for (const table of (await db.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'users'")).rows) {
      assert.equal((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.${table.tablename}`)).rows[0].n, 0, table.tablename);
    }
    assert.equal((await db.query("TABLE storage.objects")).rows.length, 1);
    await db.query("UPDATE auth.users SET email='changed@example.invalid' WHERE id=$1", [A]);
    assert.equal((await db.query<{ email: string }>("SELECT email FROM public.users WHERE id=$1", [A])).rows[0].email, "changed@example.invalid");
  } finally { await db.close(); }
});
test("reset rejects an expanded inventory and unknown external FK without losing data", async () => {
  const db = await baseline();
  try {
    await db.query("INSERT INTO portfolios(user_id) SELECT $1::uuid FROM generate_series(1,13)", [A]);
    await assert.rejects(db.exec(await reset()), /Inventory changed/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("TABLE portfolios")).rows.length,15);
    await db.query("DELETE FROM portfolios WHERE id<>$1 AND id NOT IN (SELECT portfolio_id FROM portfolio_activities)", [PA]);
    await db.exec(`CREATE TABLE storage.external_reference(id uuid REFERENCES portfolios(id)); INSERT INTO storage.external_reference VALUES('${PA}');`);
    await assert.rejects(db.exec(await reset()), /foreign key constraint/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("TABLE portfolios")).rows.length,2);
    assert.equal((await db.query("TABLE portfolio_activities")).rows.length,2);
  } finally { await db.close(); }
});

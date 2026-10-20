import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { baseline, asUser, A, PA, PB } from "./helpers/baseline";

test("cover name migration preserves displayed names, upserts only own cover and respects cleared names on rerun", async () => {
  const db = await baseline();
  const migration = await readFile(new URL("../supabase/migrations/202610150002_cover_names.sql", import.meta.url), "utf8");
  try {
    await db.exec(`ALTER TABLE profiles ADD COLUMN first_name text, ADD COLUMN last_name text;
      ALTER TABLE covers ADD COLUMN title text;
      INSERT INTO profiles(portfolio_id,first_name,last_name) VALUES('${PA}','เดิม','ทดสอบ');
      INSERT INTO covers(portfolio_id,title) VALUES('${PA}','Original'),('${PB}','Other');`);
    await db.exec(await readFile(new URL("../supabase/migrations/202610150001_portfolio_foundation.sql", import.meta.url), "utf8"));
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT first_name,last_name FROM covers WHERE portfolio_id=$1",[PA])).rows,[{first_name:'เดิม',last_name:'ทดสอบ'}]);
    assert.deepEqual((await db.query("SELECT first_name,last_name FROM covers WHERE portfolio_id=$1",[PB])).rows,[{first_name:'',last_name:''}]);
    await asUser(db,A);
    const save = (id:string, first:string, last:string) => db.query(`INSERT INTO covers(portfolio_id,title,first_name,last_name) VALUES($1,'Edited',$2,$3)
      ON CONFLICT(portfolio_id) DO UPDATE SET title=excluded.title,first_name=excluded.first_name,last_name=excluded.last_name`,[id,first,last]);
    await save(PA,'ใหม่','บนปก');
    await save(PA,'ใหม่','บนปก');
    assert.equal((await db.query("TABLE covers")).rows.length,1);
    assert.equal((await db.query<{ first_name: string | null }>("SELECT first_name FROM profiles")).rows[0].first_name,'เดิม');
    await assert.rejects(save(PB,'ข้าม','บัญชี'),/row-level security/);
    await save(PA,'','');
    await db.exec("RESET ROLE");
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT first_name,last_name FROM covers WHERE portfolio_id=$1",[PA])).rows,[{first_name:'',last_name:''}]);
    assert.equal((await db.query<{ title: string | null }>("SELECT title FROM covers WHERE portfolio_id=$1",[PB])).rows[0].title,'Other');
  } finally { await db.close(); }
});

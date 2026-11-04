import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {buildSnapshotMigration,migrationPath} from '../../../scripts/build/snapshot-migration.mjs';
import {snapshotSetup} from './setup.mjs';
const sql=readFileSync(migrationPath,'utf8');
async function baseline(){
 const db=new PGlite();
 for(const part of snapshotSetup().slice(0,-2))await db.exec(part.replace(/\\set ON_ERROR_STOP on/g,'').replace("current_database() <> 'section_visibility_integration'",'false').replace(":'authenticator_password'","'synthetic-only'"));
 return db;
}
test('release is exactly generated from reviewed proposals and used by API runner',()=>{
 assert.equal(sql,buildSnapshotMigration());assert.equal(snapshotSetup().at(-2),sql);
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
});
test('late policy conflict rolls back all Snapshot DDL and preserves existing selections',async()=>{
 const db=await baseline();try{
  const before=(await db.query('SELECT * FROM portfolio_activities ORDER BY portfolio_id')).rows;
  await db.exec('CREATE POLICY portfolio_images_retained_delete ON storage.objects FOR DELETE USING(false)');
  await assert.rejects(db.exec(sql),{code:'42710'});await db.exec('ROLLBACK');
  assert.deepEqual((await db.query('SELECT * FROM portfolio_activities ORDER BY portfolio_id')).rows,before);
  assert.equal((await db.query("SELECT to_regnamespace('portfolio_private') AS schema")).rows[0].schema,null);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='portfolio_activities' AND column_name='snapshot_data'")).rows[0].n,0);
 }finally{await db.close();}
});
test('successful installation is explicit and duplicate installation stops without rewriting data',async()=>{
 const db=await baseline();try{
  await db.exec(sql);
  const rows=(await db.query('SELECT snapshot_data,snapshot_version FROM portfolio_activities')).rows;
  assert.ok(rows.length>0);assert.ok(rows.every(row=>row.snapshot_data===null&&Number(row.snapshot_version)===0));
  assert.deepEqual((await db.query('SELECT * FROM portfolio_private.asset_config')).rows,[]);
  await assert.rejects(db.exec(sql),{code:'55000'});await db.exec('ROLLBACK');
  assert.deepEqual((await db.query('SELECT snapshot_data,snapshot_version FROM portfolio_activities')).rows,rows);
 }finally{await db.close();}
});

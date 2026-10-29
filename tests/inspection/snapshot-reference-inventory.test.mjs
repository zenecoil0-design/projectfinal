import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=readFileSync(new URL('../../scripts/inspection/snapshot-reference-inventory.sql',import.meta.url),'utf8');
test('counts shared snapshot URLs without exposing values; malformed data and limited roles stay incomplete',async()=>{
 const db=new PGlite();
 try {
  for(const name of ['educations','activities','certificates']) await db.exec(`CREATE TABLE portfolio_${name}(snapshot_data jsonb)`);
  const payload={item:{image_url:'private-legacy'},images:[{image_url:'private-image'},{image_url:'private-image'}]};
  await db.query('INSERT INTO portfolio_certificates VALUES($1),($1)',[JSON.stringify(payload)]);
  const read=async()=>(await db.exec(sql)).find(r=>r.rows.length).rows[0].inventory;
  const result=await read();
  assert.equal(result.reference_count,6);assert.equal(result.snapshot_count,2);
  assert.equal(result.status,'INVENTORY_ONLY_NOT_DELETE_APPROVAL');assert.equal(result.deletion_authorized,false);
  assert.doesNotMatch(JSON.stringify(result),/private-/);
  await db.exec('INSERT INTO portfolio_activities VALUES(NULL)');
  for(const bad of [null,{}, {item:{},images:{}},{item:{},images:[null]},{item:{},images:[{image_url:123}]},{item:{logo_url:42},images:[]}]) {
   await db.query('UPDATE portfolio_activities SET snapshot_data=$1',[JSON.stringify(bad)]);
   assert.equal((await read()).status,'INCOMPLETE_SNAPSHOT_DATA');
  }
  await db.exec('CREATE ROLE limited; GRANT SELECT ON ALL TABLES IN SCHEMA public TO limited; SET ROLE limited');
  assert.equal((await read()).status,'INCOMPLETE_RLS_VISIBILITY');
 } finally {await db.close();}
});
test('missing schema fails and script is read-only',async()=>{
 assert.doesNotMatch(sql.replace(/--[^\n]*/g,''),/\b(DELETE|INSERT|UPDATE|CREATE|ALTER|DROP|TRUNCATE)\b/i);
 const db=new PGlite();try {await assert.rejects(db.exec(sql));}finally{await db.close();}
});

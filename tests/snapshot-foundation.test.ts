import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseline, asUser, A, B, PA, PB, LA, LB, sections } from './helpers/baseline';
const sql=readFileSync(new URL('../supabase/proposals/portfolio-item-snapshots.sql',import.meta.url),'utf8');
type Snapshot={data:{item:{title:string};images:{image_url:string}[]};revision:string;latest_revision:string;version:number};
for(const [kind,plural] of sections) test(`${kind}: capture, reorder, refresh, ownership and cascade`,async()=>{
 const db=await baseline();
 try {
  await db.exec(sql);
  if(kind!=='education') await db.exec(`INSERT INTO user_library_${kind}_images(${kind}_id,image_url,sort_order) VALUES('${LA}','first.png',1),('${LA}','second.png',0)`);
  await asUser(db,A);
  const capture=async(refresh=false,revision:string|null=null)=>(await db.query<{result:Snapshot}>(`SELECT public.capture_portfolio_item_snapshot($1,$2,$3,$4,$5) AS result`,[PA,kind,LA,refresh,revision])).rows[0].result;
  const p2='10000000-0000-0000-0000-000000000003';
  await db.query('INSERT INTO portfolios(id,user_id) VALUES($1,$2)',[p2,A]);
  await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[p2,kind,[LA]]);
  const first=await capture(); assert.equal(first.version,1); assert.equal(first.data.item.title,'Test');
  if(kind!=='education') assert.deepEqual(first.data.images.map(i=>i.image_url),['second.png','first.png']);
  await db.query(`UPDATE user_library_${plural} SET title='Changed' WHERE id=$1`,[LA]);
  await db.exec('RESET ROLE');
  if(kind!=='education') await db.query(`UPDATE user_library_${kind}_images SET image_url='changed.png' WHERE ${kind}_id=$1 AND image_url='first.png'`,[LA]);
  await asUser(db,A);
  const old=await capture();assert.equal(old.data.item.title,'Test');assert.notEqual(old.latest_revision,old.revision);
  await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[PA,kind,[LA]]);
  assert.deepEqual((await capture()).data,first.data);
  await assert.rejects(capture(true,first.revision));
  assert.equal((await capture()).version,1);
  const accepted=await capture(true,old.latest_revision); assert.equal(accepted.version,2);assert.equal(accepted.data.item.title,'Changed');
  assert.equal((await capture(true,old.latest_revision)).version,2);
  if(kind!=='education') assert.deepEqual(accepted.data.images.map(i=>i.image_url),['second.png','changed.png']);
  const second=(await db.query<{result:Snapshot}>('SELECT capture_portfolio_item_snapshot($1,$2,$3) AS result',[p2,kind,LA])).rows[0].result;
  assert.deepEqual(second.data,first.data); // another portfolio retains its original text and URLs

  await assert.rejects(db.query(`UPDATE portfolio_${plural} SET snapshot_data='{}' WHERE portfolio_id=$1`,[PA]));
  await assert.rejects(db.query('SELECT capture_portfolio_item_snapshot($1,$2,$3)',[PB,kind,LB]));
  await assert.rejects(db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[PA,kind,[LA,LB]]));
  assert.equal((await capture()).version,2); // failed selection preserved the old snapshot
  await db.exec('RESET ROLE'); await asUser(db,B);
  assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE portfolio_id=$1`,[PA])).rows.length,0);
  await db.exec('RESET ROLE'); await asUser(db,A);
  await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[PA,kind,[]]);
  assert.equal((await db.query(`SELECT * FROM user_library_${plural} WHERE id=$1`,[LA])).rows.length,1);
  await db.query('SELECT replace_portfolio_selection($1,$2,$3::uuid[])',[PA,kind,[LA]]);
  await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`,[LA]);
  assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE portfolio_id=$1`,[PA])).rows.length,0);
  assert.equal((await db.query(`SELECT * FROM portfolio_${plural} WHERE portfolio_id=$1`,[p2])).rows.length,0);
 } finally {await db.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { snapshotSetup } from './setup.mjs';
import { A,B,PA,PB } from './cases.mjs';
const item='20000000-0000-0000-0000-000000000001';
const sections=[['education','educations'],['activity','activities'],['certificate','certificates']];
type Edition={data:{item:Record<string,unknown>;images:{id:string;image_url:string}[]};revision:string;latest_revision:string;version:number};
async function fixture(){
 const db=new PGlite();
 for(const sql of snapshotSetup())await db.exec(sql.replace(/\\set ON_ERROR_STOP on/g,'').replace("current_database() <> 'section_visibility_integration'",'false').replace(":'authenticator_password'","'synthetic-fixture-only'"));
 return db;
}
async function user(db:PGlite,owner:string){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:owner})]);await db.exec('SET ROLE authenticated');}
async function read(db:PGlite,kind:string,port=PA){return(await db.query<{r:{items:Edition[]}}>('SELECT read_portfolio_item_snapshots($1,$2) r',[port,kind])).rows[0].r.items;}

test('complete fixture: explicit preparation, source updates and copies preserve accepted editions',async()=>{
 const db=await fixture();try{
  await user(db,A);for(const [kind] of sections)await assert.rejects(read(db,kind),{code:'55000'});
  const prep=()=>db.query<{r:{prepared_count:number}}>('SELECT prepare_portfolio_item_snapshots($1) r',[PA]);
  assert.equal((await prep()).rows[0].r.prepared_count,3);assert.equal((await prep()).rows[0].r.prepared_count,0);
  const original=new Map<string,Edition>();
  for(const [kind] of sections){
   const first=(await read(db,kind))[0];original.set(kind,first);
   const fields=kind==='education'?{school_name:'Updated',level:'School'}:{title:'Updated',description:'New'};
   const images=first.data.images.map(({id,image_url})=>({id,image_url})).reverse();
   await db.query('SELECT update_library_item_atomic($1,$2,$3,$4,$5::uuid[])',[kind,item,JSON.stringify(fields),JSON.stringify(images),[]]);
   const later=(await read(db,kind))[0];assert.deepEqual(later.data,first.data);assert.notEqual(later.latest_revision,first.revision);
  }
  const copy=(await db.query<{r:{portfolio_id:string}}>("SELECT perform_portfolio_action('50000000-0000-0000-0000-000000000001','duplicate',$1,'Copy') r",[PA])).rows[0].r.portfolio_id;
  for(const [kind] of sections){
   assert.deepEqual((await read(db,kind,copy))[0].data,original.get(kind)!.data);
   const before=(await read(db,kind))[0];
   await assert.rejects(db.query('SELECT capture_portfolio_item_snapshot($1,$2,$3,true,$4)',[PA,kind,item,before.revision]),{code:'PT409'});
   assert.deepEqual((await read(db,kind))[0],before);
   await db.query('SELECT capture_portfolio_item_snapshot($1,$2,$3,true,$4)',[PA,kind,item,before.latest_revision]);
   // Replaying the same accepted revision must not increment it again.
   await db.query('SELECT capture_portfolio_item_snapshot($1,$2,$3,true,$4)',[PA,kind,item,before.latest_revision]);
   assert.equal((await read(db,kind))[0].version,2);assert.equal((await read(db,kind,copy))[0].version,1);
  }
  assert.deepEqual((await db.query('SELECT age_mode,manual_age FROM profiles WHERE portfolio_id=$1',[copy])).rows,[{age_mode:'manual',manual_age:0}]);
  assert.deepEqual((await db.query('SELECT section,visible FROM portfolio_section_visibility WHERE portfolio_id=$1',[copy])).rows,[{section:'activity',visible:false}]);
 }finally{await db.close();}
});
test('fixture roles isolate owners, revoke direct writes and roll back late failures',async()=>{
 const db=await fixture();try{
  await user(db,A);await db.query('SELECT prepare_portfolio_item_snapshots($1)',[PA]);
  await user(db,B);await assert.rejects(read(db,'activity'),{code:'42501'});await db.query('SELECT prepare_portfolio_item_snapshots($1)',[PB]);assert.equal((await read(db,'activity',PB))[0].data.item.user_id,B);
  await user(db,A);await assert.rejects(db.query("UPDATE user_library_activities SET title='Direct' WHERE id=$1",[item]),{code:'42501'});await assert.rejects(db.exec('DELETE FROM user_library_activity_images'),{code:'42501'});
  const before=await read(db,'activity');
  await db.exec("RESET ROLE; CREATE FUNCTION fixture_fail_tag() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic late error'; END $$; CREATE TRIGGER fixture_fail_tag BEFORE INSERT ON user_library_activity_tags FOR EACH ROW EXECUTE FUNCTION fixture_fail_tag();");
  await user(db,A);await assert.rejects(db.query("SELECT update_library_item_atomic('activity',$1,'{\"title\":\"Bad save\"}','[]',ARRAY['30000000-0000-0000-0000-000000000001']::uuid[])",[item]),{code:'P0001'});assert.deepEqual(await read(db,'activity'),before);
 }finally{await db.close();}
});
test('fixture upload validation, stale acceptance and deletion cascade work together',async()=>{
 const db=await fixture();try{
  await user(db,A);await db.query('SELECT prepare_portfolio_item_snapshots($1)',[PA]);const old=(await read(db,'activity'))[0];
  const path=`users/${A}/activities/${item}/60000000-0000-0000-0000-000000000001.png`,url='https://snapshot-fixture.invalid/storage/v1/object/public/portfolio-images/'+path;
  const save=()=>db.query("SELECT update_library_item_atomic('activity',$1,'{\"title\":\"Uploaded\"}',$2,'{}')",[item,JSON.stringify([{image_url:url}])]);
  await assert.rejects(save(),{code:'42501'});await db.exec('RESET ROLE');await db.query("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('portfolio-images',$1,$2)",[path,A]);await user(db,A);await save();
  await assert.rejects(db.query("SELECT capture_portfolio_item_snapshot($1,'activity',$2,true,$3)",[PA,item,old.revision]),{code:'PT409'});const current=(await read(db,'activity'))[0];assert.deepEqual(current.data,old.data);
  await db.query("SELECT capture_portfolio_item_snapshot($1,'activity',$2,true,$3)",[PA,item,current.latest_revision]);assert.equal((await read(db,'activity'))[0].data.images[0].image_url,url);
  for(const [kind,plural] of sections){await db.query(`DELETE FROM user_library_${plural} WHERE id=$1`,[item]);assert.deepEqual(await read(db,kind),[]);}
 }finally{await db.close();}
});

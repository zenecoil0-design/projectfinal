import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actionDatabase} from './helpers/portfolio-actions';
import {asUser,A,PA,PB} from './helpers/baseline';
const request='30000000-0000-0000-0000-000000000001';
test('transactional copy/replay, ownership and delete preserve shared library',async()=>{
 const db=await actionDatabase();try{
 await db.query("INSERT INTO covers(portfolio_id,first_name) VALUES($1,'Original')",[PA]);
 await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'profile',false)",[PA]);
 await asUser(db,A);
 const call=async(id:string,action='duplicate',source=PA,title='สำเนา')=>(await db.query<{r:{portfolio_id:string;status:string}}>('SELECT perform_portfolio_action($1,$2,$3,$4) r',[id,action,source,title])).rows[0].r;
 const result=await call(request);assert.equal(result.status,'confirmed');assert.notEqual(result.portfolio_id,PA);
 assert.deepEqual(await call(request),result);
 assert.equal((await db.query('TABLE portfolios')).rows.length,2);
 assert.deepEqual((await db.query('SELECT first_name FROM covers WHERE portfolio_id=$1',[result.portfolio_id])).rows,[{first_name:'Original'}]);
 assert.deepEqual((await db.query('SELECT section,visible FROM portfolio_section_visibility WHERE portfolio_id=$1',[result.portfolio_id])).rows,[{section:'profile',visible:false}]);
 await assert.rejects(call(request,'duplicate',PA,'changed'),/different arguments/);
 await assert.rejects(db.exec('DELETE FROM portfolio_action_receipts'),/permission denied/);
 assert.equal((await call('30000000-0000-0000-0000-000000000002','delete',PB,'')).status,'rejected');
 const deleted=await call('30000000-0000-0000-0000-000000000003','delete',PA,'');assert.equal(deleted.status,'confirmed');
 assert.equal((await db.query('TABLE portfolios')).rows.length,1);
 assert.equal((await db.query('TABLE user_library_activities')).rows.length,1);
 }finally{await db.close();}
});
test('late error rolls back new portfolio and receipt before same-key retry',async()=>{
 const db=await actionDatabase();try{
 await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'profile',false)",[PA]);
 await db.exec("CREATE FUNCTION fail_copy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$; CREATE TRIGGER fail_copy BEFORE INSERT ON portfolio_section_visibility FOR EACH ROW EXECUTE FUNCTION fail_copy()");
 await asUser(db,A);
 await assert.rejects(db.query("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy')",[request,PA]),/injected failure/);
 assert.equal((await db.query('TABLE portfolios')).rows.length,1);assert.equal((await db.query('TABLE portfolio_action_receipts')).rows.length,0);
 await db.exec('RESET ROLE; DROP TRIGGER fail_copy ON portfolio_section_visibility');
 await asUser(db,A);
 const recovered=(await db.query<{r:{status:string;portfolio_id:string}}>("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy') r",[request,PA])).rows[0].r;
 assert.equal(recovered.status,'confirmed');
 assert.notEqual(recovered.portfolio_id,PA);
 assert.equal((await db.query('TABLE portfolios')).rows.length,2);
 assert.equal((await db.query('TABLE portfolio_action_receipts')).rows.length,1);
 const replay=(await db.query<{r:unknown}>("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy') r",[request,PA])).rows[0].r;
 assert.deepEqual(replay,recovered);
 assert.equal((await db.query('TABLE portfolios')).rows.length,2);

 }finally{await db.close();}
});

test('copy preserves every populated section field and ordered shared references; delete removes only its portfolio', async () => {
 const db = await actionDatabase();
 try {
  const fixtures: Record<string, Record<string, unknown>> = {
   covers: {cover_image_url:'shared-cover.png',title:'PORTFOLIO',subtitle:'ไทย',school_name:'School',first_name:'Cover',last_name:'Name'},
   prefaces: {content:'First paragraph\nSecond paragraph',signature_name:'Author'},
   profiles: Object.fromEntries(['profile_image_url','first_name','last_name','nickname','date_of_birth','blood_group','address','phone','contact_email','talents','motto','nationality','ethnicity','religion','school','plan','gpax'].map(k=>[k,k==='date_of_birth'?'2005-02-28':`value-${k}`])),
   activities: {title:'Legacy activity',description:'รายละเอียด',images:['second.png','first.png']},
   certificates: {title:'Legacy certificate',description:null,image_url:'shared-cert.png'},
   educations: {level:'มัธยม',school_name:'School',major:'Science',gpa:'0'}
  };
  fixtures.profiles.social_links=[{name:'Website',link:'https://example.invalid'}];
  fixtures.profiles.custom_fields=[{label:'Extra',value:'ไทย'}];
  for(const [table, row] of Object.entries(fixtures)) {
   const keys=Object.keys(row);
   await db.query(`INSERT INTO ${table}(portfolio_id,${keys.join(',')}) SELECT $1,${keys.join(',')} FROM jsonb_populate_record(NULL::${table},$2::jsonb)`,[PA,JSON.stringify(row)]);
  }
  await db.query("UPDATE portfolios SET template_key='minimal',theme_color='#123456' WHERE id=$1",[PA]);
  await db.query("INSERT INTO portfolio_section_visibility VALUES($1,'profile',false),($1,'toc',false)",[PA]);
  const tables=[...Object.keys(fixtures),'portfolio_activities','portfolio_certificates','portfolio_educations','portfolio_section_visibility'];
  const snapshot=async(id:string)=>Promise.all(tables.map(async table=>(await db.query(`SELECT to_jsonb(t)-'id'-'portfolio_id' AS value FROM ${table} t WHERE portfolio_id=$1 ORDER BY (to_jsonb(t)-'id'-'portfolio_id')::text`,[id])).rows));
  const original=await snapshot(PA);
  const libraryBefore=(await db.query('SELECT * FROM user_library_activities ORDER BY id')).rows;
  const storageBefore=(await db.query('TABLE storage.objects')).rows;
  await asUser(db,A);
  const copied=(await db.query<{r:{portfolio_id:string}}>("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy') r",[request,PA])).rows[0].r.portfolio_id;
  await db.exec('RESET ROLE');
  assert.deepEqual(await snapshot(copied),original);
  assert.deepEqual((await db.query('SELECT template_key,theme_color FROM portfolios WHERE id=$1',[copied])).rows,[{template_key:'minimal',theme_color:'#123456'}]);
  await db.query("UPDATE covers SET first_name='Independent' WHERE portfolio_id=$1",[copied]);
  assert.deepEqual(await snapshot(PA),original);
  await asUser(db,A);
  await db.query("SELECT perform_portfolio_action($1,'delete',$2,'')",['30000000-0000-0000-0000-000000000099',copied]);
  await db.exec('RESET ROLE');
  for(const rows of await snapshot(copied)) assert.deepEqual(rows,[]);
  assert.deepEqual(await snapshot(PA),original);
  assert.deepEqual((await db.query('SELECT * FROM user_library_activities ORDER BY id')).rows,libraryBefore);
  assert.deepEqual((await db.query('TABLE storage.objects')).rows,storageBefore);
 } finally {await db.close();}
});

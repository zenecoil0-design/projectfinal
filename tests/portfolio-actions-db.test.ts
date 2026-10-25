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

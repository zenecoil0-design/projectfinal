import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseManualAge,displayedAge} from '../src/lib/age';
import {actionDatabase} from './helpers/portfolio-actions';
import {asUser,A,B,PA,PB} from './helpers/baseline';
const sql=readFileSync(new URL('../supabase/migrations/20261026175325_profile_age_override.sql',import.meta.url),'utf8');
test('manual age keeps zero and rejects invalid representations; birthday never overrides manual',()=>{
 for(const v of ['', ' ', '-1','1.5','1e2','12\n','+1','NaN','2147483648']) assert.equal(parseManualAge(v),null,v);
 assert.equal(parseManualAge('0'),0);assert.equal(parseManualAge('19'),19);
 assert.equal(displayedAge('2000-01-01','manual','17',new Date(2040,5,15)),17);
 assert.equal(displayedAge('2000-01-01','auto','17',new Date(2040,5,15)),40);
});
test('migration preserves old data, validates manual values and copies both modes with receipts',async()=>{
 const db=await actionDatabase();try{
 await db.query("INSERT INTO profiles(portfolio_id,first_name,date_of_birth) VALUES($1,'Alpha','2000-01-01')",[PA]);
 await db.exec(sql);
 assert.deepEqual((await db.query('SELECT first_name,date_of_birth,age_mode,manual_age FROM profiles')).rows,[{first_name:'Alpha',date_of_birth:'2000-01-01',age_mode:'auto',manual_age:null}]);
 await asUser(db,A);
 for(const statement of ["age_mode='invalid'", "age_mode='manual'", "manual_age=-1", "age_mode=NULL"]) await assert.rejects(db.exec(`UPDATE profiles SET ${statement}`));
 for(const [i,mode] of ['manual','auto'].entries()) {
 await db.query('UPDATE profiles SET age_mode=$1,manual_age=0 WHERE portfolio_id=$2',[mode,PA]);
 const request=`30000000-0000-0000-0000-00000000000${i+1}`;
 const args=[request,'duplicate',PA,'Copy'];
 const result=(await db.query<{r:{portfolio_id:string}}>('SELECT perform_portfolio_action($1,$2,$3,$4) r',args)).rows[0].r;
 assert.deepEqual((await db.query('SELECT age_mode,manual_age FROM profiles WHERE portfolio_id=$1',[result.portfolio_id])).rows,[{age_mode:mode,manual_age:0}]);
 assert.deepEqual((await db.query<{r:unknown}>('SELECT perform_portfolio_action($1,$2,$3,$4) r',args)).rows[0].r,result);
 }
 }finally{await db.close();}
});
test('new columns retain owner isolation and RPC execute restrictions',async()=>{
 const db=await actionDatabase();try{
 await db.exec(sql);
 await db.query('INSERT INTO profiles(portfolio_id,age_mode,manual_age) VALUES($1,\'manual\',18),($2,\'manual\',21)',[PA,PB]);
 await asUser(db,A);
 assert.deepEqual((await db.query('SELECT manual_age FROM profiles')).rows,[{manual_age:18}]);
 assert.equal((await db.query('UPDATE profiles SET manual_age=99 WHERE portfolio_id=$1 RETURNING id',[PB])).rows.length,0);
 await assert.rejects(db.query('INSERT INTO profiles(portfolio_id,age_mode,manual_age) VALUES($1,\'manual\',19)',[PB]),/row-level security/);
 await db.exec('RESET ROLE');await asUser(db,B);
 assert.deepEqual((await db.query('SELECT manual_age FROM profiles')).rows,[{manual_age:21}]);
 await db.exec('RESET ROLE;SET ROLE anon');
 await assert.rejects(db.query("SELECT perform_portfolio_action($1,'duplicate',$2,'Copy')",['30000000-0000-0000-0000-000000000001',PA]),/permission denied/);
 }finally{await db.close();}
});

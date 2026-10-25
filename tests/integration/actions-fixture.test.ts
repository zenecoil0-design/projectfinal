import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('actions API fixture and both migrations apply, duplicate preserves palette',async()=>{
 const db=new PGlite();
 try{
  const fixture=readFileSync(new URL('./actions/fixture.sql',import.meta.url),'utf8')
   .replace(/\\set ON_ERROR_STOP on/g,'')
   .replace("current_database() <> 'section_visibility_integration'",'false')
   .replace(":'authenticator_password'","'synthetic-local-password'");
  await db.exec(fixture);
  for(const file of ['20261020084510_section_visibility.sql','20261024131223_portfolio_actions.sql'])await db.exec(readFileSync(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);`);
  const r=await db.query<{result:{status:string;portfolio_id:string}}>("SELECT perform_portfolio_action('30000000-0000-0000-0000-000000000001','duplicate','10000000-0000-0000-0000-000000000001','Copy') result");
  assert.equal(r.rows[0].result.status,'confirmed');
  const rows=await db.query<{theme_color:string}>('select theme_color from portfolios where id=$1',[r.rows[0].result.portfolio_id]);
  assert.equal(JSON.parse(rows.rows[0].theme_color).text,'#703344');
 }finally{await db.close();}
});

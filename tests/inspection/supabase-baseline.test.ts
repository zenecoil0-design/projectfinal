// Diagnostic fixtures copied from user-supplied metadata; NOT tests of the live database.
// These document baseline weaknesses, not the target security acceptance criteria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const A='00000000-0000-0000-0000-000000000001';
const B='00000000-0000-0000-0000-000000000002';
const PA='10000000-0000-0000-0000-000000000001';
const LA='20000000-0000-0000-0000-000000000001';
const LB='20000000-0000-0000-0000-000000000002';

test('metadata baseline: direct relation insert checks portfolio owner but permits another owner library ID', async () => {
 const db=new PGlite();
 try {
  await db.exec(`create role authenticated; create schema auth;
   create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated;
   create table portfolios(id uuid primary key,user_id uuid);
   create table user_library_activities(id uuid primary key,user_id uuid not null);
   create table portfolio_activities(id uuid primary key default gen_random_uuid(),portfolio_id uuid not null references portfolios(id) on delete cascade,activity_id uuid not null references user_library_activities(id) on delete cascade,sort_order integer not null default 0,unique(portfolio_id,activity_id));
   insert into portfolios values ('${PA}','${A}');
   insert into user_library_activities values ('${LA}','${A}'),('${LB}','${B}');
   alter table portfolios enable row level security;
   alter table user_library_activities enable row level security;
   alter table portfolio_activities enable row level security;
   create policy own_portfolios on portfolios for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
   create policy own_activities on user_library_activities for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
   create policy relation_owner on portfolio_activities for all using(exists(select 1 from portfolios where portfolios.id=portfolio_activities.portfolio_id and portfolios.user_id=auth.uid())) with check(exists(select 1 from portfolios where portfolios.id=portfolio_activities.portfolio_id and portfolios.user_id=auth.uid()));
   grant select,insert,update,delete on portfolios,user_library_activities,portfolio_activities to authenticated;
   select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
  assert.equal((await db.query('select * from user_library_activities where id=$1',[LB])).rows.length,0);
  await db.query('insert into portfolio_activities(portfolio_id,activity_id) values ($1,$2)',[PA,LB]);
  assert.equal((await db.query('select * from portfolio_activities')).rows.length,1);
  // Existing RPC rejects foreign library IDs, but does not remove the direct-table route.
  await db.exec('reset role; create role anon;');
  await db.exec(await readFile(new URL('../../supabase/migrations/202610130001_atomic_portfolio_selection.sql',import.meta.url),'utf8'));
  await db.exec('set role authenticated;');
  await assert.rejects(db.query('select replace_portfolio_selection($1,$2,$3::uuid[])',[PA,'activity',[LB]]),/access denied/);
 } finally {await db.close();}
});

test('metadata baseline: TRUNCATE privilege bypasses row filters when SQL execution is available',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role authenticated;create table records(id integer);insert into records values(1);
   alter table records enable row level security;
   grant select,truncate on records to authenticated;set role authenticated;`);
  assert.equal((await db.query('select * from records')).rows.length,0);
  await db.exec('truncate records;reset role;');
  assert.equal((await db.query('select count(*)::int as n from records')).rows[0].n,0);
 } finally {await db.close();}
});

test('inventory distinguishes image rows, legacy URL deduplication, ownership mismatches and duplicate sections',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create schema storage;create table storage.objects(bucket_id text);
   create table users(id uuid);create table portfolios(id uuid,user_id uuid);
   create table covers(portfolio_id uuid);create table prefaces(portfolio_id uuid);create table profiles(portfolio_id uuid);
   create table activities(id uuid);create table certificates(id uuid);create table educations(id uuid);
   create table user_library_activities(id uuid,user_id uuid,title text,activity_date date,organization text);
   create table user_library_certificates(id uuid,user_id uuid,title text,issued_date date,issued_by text,image_url text);
   create table user_library_educations(id uuid,user_id uuid);
   create table user_library_activity_images(id uuid,activity_id uuid,image_url text);
   create table user_library_certificate_images(id uuid,certificate_id uuid,image_url text);
   create table portfolio_activities(portfolio_id uuid,activity_id uuid);
   create table portfolio_certificates(portfolio_id uuid,certificate_id uuid);
   create table portfolio_educations(portfolio_id uuid,education_id uuid);
   create table user_tags(id uuid,user_id uuid);
   create table user_library_activity_tags(activity_id uuid,tag_id uuid);
   create table user_library_certificate_tags(certificate_id uuid,tag_id uuid);
   create table user_library_education_tags(education_id uuid,tag_id uuid);`);
  const sql=await readFile(new URL('../../scripts/inspection/supabase-data-inventory.sql',import.meta.url),'utf8');
  const empty=await db.query<{inventory_report:{row_counts:{portfolios:number}}}>(sql);
  assert.equal(empty.rows[0].inventory_report.row_counts.portfolios,0);
  await db.query('insert into portfolios values($1,$2)',[PA,A]);
  await db.query('insert into covers values($1),($1),(null)',[PA]);
  await db.query('insert into user_library_activities(id,user_id,title) values($1,$2,$3)',[LB,B,' \t\n']);
  await db.query('insert into portfolio_activities values($1,$2)',[PA,LB]);
  await db.query('insert into user_library_certificates(id,user_id,title,image_url) values($1,$2,$3,$4)',[LA,A,'Test','image-1']);
  for(const url of ['image-1','image-2'])await db.query('insert into user_library_certificate_images values(gen_random_uuid(),$1,$2)',[LA,url]);
  const boundary=await db.query<{inventory_report:{image_limits:Record<string,number>}}>(sql);
  assert.equal(boundary.rows[0].inventory_report.image_limits.certificates_over_2_distinct_urls_including_legacy,0,'legacy URL duplicates an image row and must not count as a third image');
  await db.query('insert into user_library_certificate_images values(gen_random_uuid(),$1,$2)',[LA,'image-3']);
  for(let i=0;i<5;i++)await db.query('insert into user_library_activity_images values(gen_random_uuid(),$1,$2)',[LB,`image-${i}`]);
  const result=await db.query<{inventory_report:{image_limits:Record<string,number>,invalid_drafts_or_ownership:{blank_activity_titles:number,relations:Array<{section:string,mismatched_relations:number}>},single_section_duplicates:Array<{section:string,portfolios_with_duplicate_rows:number,rows_without_portfolio:number}>}}>(sql);
  const report=result.rows[0].inventory_report;
  assert.equal(report.image_limits.certificates_over_2_image_rows,1);
  assert.equal(report.image_limits.certificates_over_2_distinct_urls_including_legacy,1);
  assert.equal(report.image_limits.activities_over_4_image_rows,1);
  assert.equal(report.invalid_drafts_or_ownership.blank_activity_titles,1);
  assert.equal(report.invalid_drafts_or_ownership.relations.find(r=>r.section==='activities')?.mismatched_relations,1);
  assert.equal(report.single_section_duplicates.find(r=>r.section==='covers')?.portfolios_with_duplicate_rows,1);
  // sum(bigint) may be represented as numeric/string by the driver.
  assert.equal(Number(report.single_section_duplicates.find(r=>r.section==='covers')?.rows_without_portfolio),1);
  assert.ok(!JSON.stringify(report).includes(A),'no owner UUIDs in the aggregate response');
 }finally{await db.close();}
});

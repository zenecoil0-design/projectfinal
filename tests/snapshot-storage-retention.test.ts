import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const proposal=readFileSync('supabase/proposals/snapshot-storage-retention.sql','utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA storage;
 CREATE TABLE storage.objects(bucket_id text NOT NULL,name text NOT NULL,owner_id text NOT NULL,metadata jsonb,PRIMARY KEY(bucket_id,name));
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO authenticated,anon;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;
 CREATE POLICY own_objects ON storage.objects FOR ALL TO authenticated
 USING(owner_id=current_setting('test.owner',true)) WITH CHECK(owner_id=current_setting('test.owner',true));
 INSERT INTO storage.objects VALUES('portfolio-images','old.png','A','{"value":"original"}'),('other','other.png','A','{}');`);
 await db.exec(proposal);
 await db.exec("SET test.owner='A'; SET ROLE authenticated");
 return db;
}
test('retention preserves reads/new uploads but blocks delete, overwrite, rename and bucket moves',async()=>{
 const db=await fixture();try{
  assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='portfolio-images'")).rows.length,1);
  await db.exec("INSERT INTO storage.objects VALUES('portfolio-images','new.png','A','{}')");
  for(const sql of ["DELETE FROM storage.objects WHERE bucket_id='portfolio-images' RETURNING name", "UPDATE storage.objects SET metadata='{}' WHERE bucket_id='portfolio-images' RETURNING name", "UPDATE storage.objects SET name='moved.png' WHERE name='old.png' RETURNING name", "UPDATE storage.objects SET bucket_id='other' WHERE name='old.png' RETURNING name"])
   assert.deepEqual((await db.query(sql)).rows,[]);
  await assert.rejects(db.exec("UPDATE storage.objects SET bucket_id='portfolio-images' WHERE name='other.png'"),{code:'42501'});
  await assert.rejects(db.exec("INSERT INTO storage.objects VALUES('portfolio-images','old.png','A','{}') ON CONFLICT(bucket_id,name) DO UPDATE SET metadata=EXCLUDED.metadata"),{code:'42501'});
  assert.deepEqual((await db.query("SELECT metadata FROM storage.objects WHERE name='old.png'")).rows,[{metadata:{value:'original'}}]);
  assert.equal((await db.query("UPDATE storage.objects SET metadata='{}' WHERE bucket_id='other' RETURNING name")).rows.length,1);
  assert.equal((await db.query("DELETE FROM storage.objects WHERE bucket_id='other' RETURNING name")).rows.length,1);
 }finally{await db.close();}
});
test('owner/anon isolation stays intact and permissive policies cannot override retention',async()=>{
 const db=await fixture();try{
  await db.exec("SET test.owner='B'");
  assert.deepEqual((await db.query('SELECT * FROM storage.objects')).rows,[]);
  await assert.rejects(db.exec("INSERT INTO storage.objects VALUES('portfolio-images','foreign.png','A','{}')"),{code:'42501'});
  await db.exec('RESET ROLE; SET ROLE anon');
  assert.deepEqual((await db.query('SELECT * FROM storage.objects')).rows,[]);
  await assert.rejects(db.exec("INSERT INTO storage.objects VALUES('portfolio-images','anon.png','A','{}')"),{code:'42501'});
  await db.exec('RESET ROLE; CREATE POLICY synthetic_broad_grant ON storage.objects FOR ALL TO PUBLIC USING(true) WITH CHECK(true); SET ROLE anon');
  assert.deepEqual((await db.query('DELETE FROM storage.objects WHERE bucket_id=\'portfolio-images\' RETURNING name')).rows,[]);
  assert.deepEqual((await db.query("UPDATE storage.objects SET metadata='{}' WHERE bucket_id='portfolio-images' RETURNING name")).rows,[]);
 }finally{await db.close();}
});
test('installation stops without RLS; privileged maintenance remains outside client guarantee',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');
  assert.equal((await db.query("UPDATE storage.objects SET metadata='{}' WHERE name='old.png' RETURNING name")).rows.length,1);
  await db.exec('DROP POLICY portfolio_images_immutable_update ON storage.objects; DROP POLICY portfolio_images_retained_delete ON storage.objects; ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY');
  await assert.rejects(db.exec(proposal),{code:'55000'});
  await db.exec('ROLLBACK');
 }finally{await db.close();}
});

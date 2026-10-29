import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotLibraryDatabase,snapshotProposal} from './helpers/snapshot';
import {asUser,A,B,LA,sections} from './helpers/baseline';
const base='https://assets.example.invalid/storage/v1/object/public/portfolio-images/';
const file='60000000-0000-0000-0000-000000000001.png';
for(const [kind,plural] of sections) test(`${kind}: new upload must match configured origin, owner, source and stored object`,async()=>{
 const db=await snapshotLibraryDatabase();
 try {
  await db.exec('ALTER TABLE storage.objects ADD COLUMN owner_id text');
  await db.exec(snapshotProposal('snapshot-upload-validation'));
  const folder=kind==='education'?'education':plural;
  const path=`users/${A}/${folder}/${LA}/${file}`;
  const save=(url:string)=>db.query('SELECT update_library_item_atomic($1,$2,$3,$4,$5::uuid[])',[kind,LA,JSON.stringify(kind==='education'?{logo_url:url}:{title:'New'}),JSON.stringify(kind==='education'?[]:[{image_url:url}]),[]]);
  await asUser(db,A);
  await assert.rejects(save(base+path),/origin not configured/);
  await db.exec('RESET ROLE');
  await db.query('INSERT INTO portfolio_private.asset_config(public_base_url) VALUES($1)',[base]);
  await db.query("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('portfolio-images',$1,$2)",[path,A]);
  await asUser(db,A);
  for(const url of [base.replace('assets.example.invalid','evil.example.invalid')+path,base+path+'?x=1',base+path+'\n',base+path.replace(A,B),base+path.replace(file,'../'+file)]) await assert.rejects(save(url),/Invalid upload reference/);
  await assert.rejects(save(base+path.replace(file,'70000000-0000-0000-0000-000000000001.png')),/Owned upload not found/);
  await save(base+path);
  await assert.rejects(db.query('SELECT * FROM portfolio_private.asset_config'),/permission denied/);
  await db.exec('RESET ROLE');
  await db.query('UPDATE storage.objects SET owner_id=$1 WHERE name=$2',[B,path]);
  if(kind==='education') await db.query('UPDATE user_library_educations SET logo_url=NULL WHERE id=$1',[LA]);
  await asUser(db,A);
  await assert.rejects(save(base+path),/Owned upload not found/);
 }finally{await db.close();}
});

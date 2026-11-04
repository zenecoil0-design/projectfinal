import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const ownerA='00000000-0000-0000-0000-000000000001';
export const ownerB='00000000-0000-0000-0000-000000000002';
// Valid tiny PNG, synthetic only. Second upload is a different byte sequence.
const original=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const replacement=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
// Decodable 2x2 lossless WEBP generated from a synthetic solid-color image.
const webp=Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQvI7Ut/+BiOh/AAA=','base64');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function storageCases({request,check}){
 const a=`users/${ownerA}/activities/item/old.png`,b=`users/${ownerB}/activities/item/own.png`;
 const object=key=>'object/portfolio-images/'+key;
 const upload=(who,key,bytes=original,method='POST',extra={})=>request(who,method,object(key),bytes,{'Content-Type':'image/png',...extra});
 const rejected=r=>assert.ok([400,401,403,404,409].includes(r.status),`Expected denial, got ${r.status}`);
 const unchanged=async()=>{const r=await request(null,'GET','object/public/portfolio-images/'+a);assert.equal(r.status,200);assert.equal(hash(r.bytes),hash(original));};
 await check('new owner upload and public download preserve exact bytes',async()=>{assert.equal((await upload('A',a)).status,200);await unchanged();});
 await check('WEBP upload preserves MIME and exact bytes and cannot be overwritten',async()=>{
  const key=a.replace('old.png','original.webp');
  assert.equal((await upload('A',key,webp,'POST',{'Content-Type':'image/webp'})).status,200);
  const read=async()=>{
   const r=await request(null,'GET','object/public/portfolio-images/'+key);
   assert.equal(r.status,200);assert.equal(r.contentType.split(';')[0],'image/webp');
   assert.equal(hash(r.bytes),hash(webp));
  };
  await read();rejected(await upload('A',key,replacement,'PUT'));await read();
 });
 await check('another owner can upload only into own path',async()=>{assert.equal((await upload('B',b)).status,200);rejected(await upload('B',a.replace('old.png','foreign.png')));});
 await check('anonymous upload is rejected',async()=>{rejected(await upload(null,a.replace('old.png','anon.png')));});
 await check('owner overwrite and upsert cannot change retained bytes',async()=>{rejected(await upload('A',a,replacement,'PUT'));await unchanged();rejected(await upload('A',a,replacement,'POST',{'x-upsert':'true'}));await unchanged();});
 await check('owner and foreign delete leave the original downloadable',async()=>{
  for(const who of ['A','B']){const r=await request(who,'DELETE','object/portfolio-images',{prefixes:[a]});
   if(r.status===200){assert.deepEqual(JSON.parse(r.bytes.toString()),[]);}else rejected(r);
   await unchanged();
  }
 });
 await check('move cannot remove original or create a moved copy',async()=>{
  const moved=a.replace('old.png','moved.png');rejected(await request('A','POST','object/move',{bucketId:'portfolio-images',sourceKey:a,destinationKey:moved}));await unchanged();
  rejected(await request(null,'GET','object/public/portfolio-images/'+moved));
 });
 await check('fresh replacement upload keeps the old file unchanged',async()=>{
  const newer=a.replace('old.png','new.png');assert.equal((await upload('A',newer,replacement)).status,200);
  const r=await request(null,'GET','object/public/portfolio-images/'+newer);assert.equal(r.status,200);assert.equal(hash(r.bytes),hash(replacement));await unchanged();
 });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLibrarySaveAttempt, sameLibrarySave, saveAtomicLibrary } from '../src/lib/atomic-library-save';
const owner='00000000-0000-0000-0000-000000000001';
for(const section of ['education','activity','certificate'] as const) {
 test(section+': uploads first, one atomic mutation, stable retry and owner/lifetime checks',async()=>{
  const input={section,ownerId:owner,itemId:null,fields:{title:'Title'},images:[],files:[new File(['bytes'],'image.png',{type:'image/png'})],tagIds:['tag']};
  const attempt=makeLibrarySaveAttempt(input);
  const calls:Array<{name:string;args:Record<string,unknown>}>=[];
  let uploads=0;let fail=true;let current=true;let user=owner;
  const client={
   auth:{getUser:async()=>({data:{user:{id:user}},error:null})},
   storage:{from:()=>({upload:async()=>{uploads++;return {error:null};},getPublicUrl:(path:string)=>({data:{publicUrl:'https://example.invalid/'+path}})})},
   rpc:async(name:string,args:Record<string,unknown>)=>{
    calls.push({name,args});return {data:{id:attempt.id,status:'confirmed'},error:fail?{message:'SECRET'}:null};
   },
  };
  await assert.rejects(saveAtomicLibrary(client,attempt,()=>current),e=>e instanceof Error&&!e.message.includes('SECRET'));
  assert.equal(uploads,1);assert.equal(calls.length,1);
  assert.equal(calls[0].name,'create_library_item_atomic');
  fail=false;
  await saveAtomicLibrary(client,attempt,()=>current);
  assert.equal(uploads,1);assert.deepEqual(calls[0],calls[1]);
  assert.equal(sameLibrarySave(attempt,input),true);
  assert.equal(sameLibrarySave(attempt,{...input,fields:{title:'changed'}}),false);
  user='other';await assert.rejects(saveAtomicLibrary(client,attempt,()=>current));
  user=owner;current=false;await assert.rejects(saveAtomicLibrary(client,attempt,()=>current));
  assert.equal(calls.length,2);
 });
}
test('upload completion after invalidation never starts a database write',async()=>{
 let current=true;let writes=0;
 const attempt=makeLibrarySaveAttempt({section:'activity',ownerId:owner,itemId:null,fields:{title:'A'},images:[],files:[new File(['x'],'x.png',{type:'image/png'})],tagIds:[]});
 const client={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},
 storage:{from:()=>({upload:async()=>{current=false;return {error:null};},getPublicUrl:()=>({data:{publicUrl:'never'}})})},
 rpc:async()=>{writes++;return {data:null,error:null};}};
 await assert.rejects(saveAtomicLibrary(client,attempt,()=>current));assert.equal(writes,0);
});
test('update rejects wrong row and preserves retained image IDs and order',async()=>{
 const attempt=makeLibrarySaveAttempt({section:'certificate',ownerId:owner,itemId:'item',fields:{title:'New'},images:[{id:'first',image_url:'old1'},{id:'second',image_url:'old2'}],files:[],tagIds:[]});
 let response:unknown={id:'item',item:{id:'item',user_id:owner,title:'Wrong'}};
 const client={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},
 storage:{from:()=>({upload:async()=>({error:null}),getPublicUrl:()=>({data:{publicUrl:''}})})},
 rpc:async(name:string,args:Record<string,unknown>)=>{
  assert.equal(name,'update_library_item_atomic');assert.deepEqual(args.p_images,attempt.input.images);
  return {data:response,error:null};}};
 await assert.rejects(saveAtomicLibrary(client,attempt,()=>true));
 response={id:'item',item:{id:'item',user_id:owner,title:'New'}};
 assert.equal(await saveAtomicLibrary(client,attempt,()=>true),'item');
});

for (const section of ['education', 'activity', 'certificate'] as const) {
 test(section + ': WEBP keeps original file bytes, MIME and upload reference', async () => {
  const file = new File(['original-webp-bytes'], 'photo.webp', {type: 'image/webp'});
  const attempt = makeLibrarySaveAttempt({section, ownerId: owner, itemId: null,
   fields: {}, images: [], files: [file], tagIds: []});
  let uploadedPath = '';
  const client = {
   auth: {getUser: async () => ({data: {user: {id: owner}}, error: null})},
   storage: {from: () => ({
    upload: async (path: string, received: File, options: {contentType: string}) => {
     uploadedPath = path;
     assert.match(path, /\.webp$/);
     assert.equal(received, file);
     assert.equal(await received.text(), 'original-webp-bytes');
     assert.equal(options.contentType, 'image/webp');
     return {error: null};
    },
    getPublicUrl: (path: string) => ({data: {publicUrl: 'https://example.invalid/' + path}}),
   })},
   rpc: async (_name: string, args: Record<string, unknown>) => {
    const url = 'https://example.invalid/' + uploadedPath;
    if (section === 'education') assert.deepEqual(args.p_fields, {logo_url: url});
    else assert.deepEqual(args.p_images, [{image_url: url}]);
    return {data: {id: attempt.id, status: 'confirmed'}, error: null};
   },
  };
  await saveAtomicLibrary(client, attempt, () => true);
 });
}
test('unsupported file MIME cannot upload or mutate', async () => {
 for (const type of ['image/gif', 'image/svg+xml', 'application/octet-stream', '']) {
  const attempt = makeLibrarySaveAttempt({section: 'activity', ownerId: owner, itemId: null,
   fields: {}, images: [], files: [new File(['x'], 'disguised.webp', {type})], tagIds: []});
  const client = {
   auth: {getUser: async () => ({data: {user: {id: owner}}, error: null})},
   storage: {from: () => {throw new Error('must not reach storage');}},
   rpc: async () => {throw new Error('must not reach mutation');},
  };
  await assert.rejects(saveAtomicLibrary(client, attempt, () => true),
   error => error instanceof Error && !error.message.startsWith('must not'));
 }
});

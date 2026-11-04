import assert from 'node:assert/strict';
export const A='00000000-0000-0000-0000-000000000001';
export const B='00000000-0000-0000-0000-000000000002';
export const PA='10000000-0000-0000-0000-000000000001';
export const PB='10000000-0000-0000-0000-000000000002';
const LA='20000000-0000-0000-0000-000000000001',LB='20000000-0000-0000-0000-000000000002';
const TA='30000000-0000-0000-0000-000000000001',TB='30000000-0000-0000-0000-000000000002';
const sections=[['education','educations'],['activity','activities'],['certificate','certificates']];
const ok=r=>{assert.equal(r.status,200);return r.data;};
const saved=r=>assert.ok([200,204].includes(r.status));
const error=(r,code)=>{assert.ok(r.status>=400);assert.equal(r.data.code,code);if(code==='PT409')assert.equal(r.status,409);};
const denied=r=>{assert.ok([401,403].includes(r.status));assert.equal(r.data.code,'42501');};

export async function snapshotCases({request,admin,check,blockedUpdate}) {
 const rpc=(who,name,args)=>request(who,'POST','rpc/'+name,args);
 const read=async(kind,port=PA,who='A')=>ok(await rpc(who,'read_portfolio_item_snapshots',{p_portfolio_id:port,p_section:kind}));
 const prepare=(port=PA,who='A')=>rpc(who,'prepare_portfolio_item_snapshots',{p_portfolio_id:port});
 const accept=(kind,revision,port=PA,who='A')=>rpc(who,'capture_portfolio_item_snapshot',{p_portfolio_id:port,p_section:kind,p_item_id:LA,p_refresh:true,p_expected_revision:revision});
 const save=(kind,fields,images=[],tags=[],id=LA,who='A',create=false)=>rpc(who,create?'create_library_item_atomic':'update_library_item_atomic',{p_section:kind,p_item_id:id,p_fields:fields,p_images:images,p_tag_ids:tags});
 const fields=(kind,name)=>kind==='education'?{level:'School',school_name:name}:{title:name,description:name};
 const images=async(kind,id=LA)=>kind==='education'?[]:ok(await request('A','GET',`user_library_${kind}_images?${kind}_id=eq.${id}&select=id,image_url&order=sort_order,id`));
 const action=(id,type,source,title)=>rpc('A','perform_portfolio_action',{p_request_id:id,p_action:type,p_source_id:source,p_title:title});
 const old=new Map(),created=new Map();
 await check('old portfolio reads and blocked copy never prepare implicitly',async()=>{
  for(const [kind] of sections)error(await rpc('A','read_portfolio_item_snapshots',{p_portfolio_id:PA,p_section:kind}),'55000');
  error(await action('50000000-0000-0000-0000-000000000001','duplicate',PA,'Copy'),'55000');
  for(const [,plural] of sections)assert.deepEqual(ok(await request('A','GET',`portfolio_${plural}?portfolio_id=eq.${PA}&select=snapshot_data,snapshot_version`)),[{snapshot_data:null,snapshot_version:0}]);
 });
 await check('explicit preparation captures once and preserves order and hidden preference',async()=>{
  assert.equal(ok(await prepare()).prepared_count,3);assert.equal(ok(await prepare()).prepared_count,0);
  for(const [kind] of sections){const r=await read(kind);assert.equal(r.items.length,1);assert.equal(r.items[0].sort_order,7);assert.equal(r.items[0].version,1);old.set(kind,r.items[0]);if(kind!=='education')assert.deepEqual(r.items[0].data.images.map(x=>x.image_url),['legacy-first.png','legacy-second.png']);}
  assert.deepEqual(ok(await request('A','GET',`portfolio_section_visibility?portfolio_id=eq.${PA}&select=section,visible`)),[{section:'activity',visible:false}]);
 });
 await check('two owners and anon cannot read prepare capture or change foreign content',async()=>{
  for(const [kind] of sections){
   denied(await rpc('B','read_portfolio_item_snapshots',{p_portfolio_id:PA,p_section:kind}));denied(await accept(kind,old.get(kind).revision,PA,'B'));
   denied(await save(kind,fields(kind,'Foreign'),[],[],LA,'B'));
   denied(await rpc(null,'read_portfolio_item_snapshots',{p_portfolio_id:PA,p_section:kind}));
   denied(await rpc('A','replace_portfolio_selection',{p_portfolio_id:PA,p_section:kind,p_item_ids:[LB]}));
   error(await save(kind,fields(kind,'Foreign tag'),[],[TB]),'42501');
  }
  denied(await prepare(PA,'B'));denied(await prepare(PB,'A'));assert.equal(ok(await prepare(PB,'B')).prepared_count,3);
  assert.equal((await read('activity',PB,'B')).items[0].data.item.user_id,B);
 });
 await check('direct content image snapshot receipt writes and anonymous mutations are denied',async()=>{
  for(const [kind,plural] of sections){
   denied(await request('A','PATCH',`user_library_${plural}?id=eq.${LA}`,fields(kind,'Bypass')));
   denied(await request('A','PATCH',`portfolio_${plural}?portfolio_id=eq.${PA}`,{snapshot_version:999}));
   if(kind!=='education')denied(await request('A','DELETE',`user_library_${kind}_images?${kind}_id=eq.${LA}`));
   denied(await save(kind,fields(kind,'Anonymous'),[],[],LA,null));
  }
  denied(await request('A','DELETE','library_create_receipts'));
  denied(await request('A','POST','library_create_receipts',{user_id:A,item_id:LA,section:'activity',request_fingerprint:'fake'}));
 });
 for(const [index,[kind,plural]] of sections.entries()){
  await check(`${kind}: concurrent create replay has one item and receipt; changed intent rejected`,async()=>{
   const id=`40000000-0000-0000-0000-00000000000${index+1}`;created.set(kind,id);const input=fields(kind,'New source');
   const [a,b]=await Promise.all([save(kind,input,[],[TA],id,'A',true),save(kind,input,[],[TA],id,'A',true)]);
   assert.deepEqual(ok(a),{id,status:'confirmed'});assert.deepEqual(b,a);
   assert.equal(ok(await request('A','GET',`user_library_${plural}?id=eq.${id}`)).length,1);
   assert.equal(ok(await request('A','GET',`library_create_receipts?item_id=eq.${id}`)).length,1);
   assert.deepEqual(ok(await request('B','GET',`library_create_receipts?item_id=eq.${id}`)),[]);
   error(await save(kind,fields(kind,'Changed'),[],[TA],id,'A',true),'22023');
  });
  await check(`${kind}: library edit and image reorder preserve accepted snapshot`,async()=>{
   ok(await save(kind,fields(kind,'Changed source'),(await images(kind)).reverse(),[TA]));
   const r=(await read(kind)).items[0];assert.deepEqual(r.data,old.get(kind).data);assert.equal(r.version,1);assert.notEqual(r.latest_revision,r.revision);
   if(kind!=='education')assert.deepEqual((await images(kind)).map(x=>x.image_url),['legacy-second.png','legacy-first.png']);
  });
 }
 let copied;
 await check('copy keeps old editions image order hidden preference colors and manual age',async()=>{
  copied=ok(await action('50000000-0000-0000-0000-000000000002','duplicate',PA,'Snapshot copy')).portfolio_id;assert.ok(copied&&copied!==PA);
  for(const [kind] of sections)assert.deepEqual((await read(kind,copied)).items,(await read(kind)).items);
  assert.deepEqual(ok(await request('A','GET',`portfolios?id=eq.${copied}&select=template_key,theme_color`)),ok(await request('A','GET',`portfolios?id=eq.${PA}&select=template_key,theme_color`)));
  assert.deepEqual(ok(await request('A','GET',`profiles?portfolio_id=eq.${copied}&select=age_mode,manual_age`)),[{age_mode:'manual',manual_age:0}]);
  assert.deepEqual(ok(await request('A','GET',`portfolio_section_visibility?portfolio_id=eq.${copied}&select=section,visible`)),[{section:'activity',visible:false}]);
 });
 for(const [kind] of sections){
  await check(`${kind}: concurrent acceptance increments once without changing copy`,async()=>{
   const pending=(await read(kind)).items[0];error(await accept(kind,pending.revision),'PT409');
   const [a,b]=await Promise.all([accept(kind,pending.latest_revision),accept(kind,pending.latest_revision)]);
   assert.deepEqual(ok(a),ok(b));assert.equal(a.data.version,2);assert.deepEqual((await read(kind,copied)).items[0].data,old.get(kind).data);
  });
  await check(`${kind}: late tag failure rolls back text and images`,async()=>{
   const before=await read(kind),beforeImages=await images(kind);
   await admin(`CREATE FUNCTION fail_snapshot_test_tag() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture late failure'; END $$; CREATE TRIGGER fail_snapshot_test_tag BEFORE INSERT ON user_library_${kind}_tags FOR EACH ROW EXECUTE FUNCTION fail_snapshot_test_tag();`);
   try{error(await save(kind,fields(kind,'Rollback'),[],[TA]),'P0001');}finally{await admin(`DROP TRIGGER fail_snapshot_test_tag ON user_library_${kind}_tags; DROP FUNCTION fail_snapshot_test_tag();`);}
   assert.deepEqual(await read(kind),before);assert.deepEqual(await images(kind),beforeImages);
  });
 }
 await check('new image reference requires matching origin path owner and stored object',async()=>{
  for(const extension of ['png','webp']) {
  const id=created.get('activity'),path=`users/${A}/activities/${id}/60000000-0000-0000-0000-000000000001.${extension}`;
  const url='https://snapshot-fixture.invalid/storage/v1/object/public/portfolio-images/'+path;
  error(await save('activity',{title:'Missing'},[{image_url:url}],[],id),'42501');
  await admin(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('portfolio-images','${path}','${A}');`);
  error(await save('activity',{title:'Wrong origin'},[{image_url:url.replace('snapshot-fixture.invalid','other.invalid')}],[],id),'22023');
  ok(await save('activity',{title:'Owned upload'},[{image_url:url}],[],id));assert.equal((await images('activity',id))[0].image_url,url);
  }
 });
 for(const [kind,plural] of sections)await check(`${kind}: row-locked source update blocks capture and rejects stale revision`,async()=>{
  const before=(await read(kind)).items[0],nextImages=(await images(kind)).reverse();
  await blockedUpdate(plural,()=>save(kind,fields(kind,'Race committed'),nextImages,[TA]),()=>accept(kind,before.latest_revision),async(write,capture)=>{
   ok(write);error(capture,'PT409');const after=(await read(kind)).items[0];assert.deepEqual(after.data,before.data);assert.notEqual(after.latest_revision,before.latest_revision);
   const accepted=ok(await accept(kind,after.latest_revision));assert.equal(accepted.data.item[kind==='education'?'school_name':'title'],'Race committed');
   if(kind!=='education')assert.deepEqual(accepted.data.images.map(i=>i.image_url),nextImages.map(i=>i.image_url));
  });
 });
 await check('selection reorder and removal are portfolio-local and retain accepted data',async()=>{
  const before=(await read('activity')).items[0],id=created.get('activity');
  saved(await rpc('A','replace_portfolio_selection',{p_portfolio_id:PA,p_section:'activity',p_item_ids:[id,LA]}));
  const rows=(await read('activity')).items;assert.deepEqual(rows.map(x=>x.item_id),[id,LA]);assert.deepEqual(rows[1].data,before.data);
  saved(await rpc('A','replace_portfolio_selection',{p_portfolio_id:PA,p_section:'activity',p_item_ids:[LA]}));
  assert.deepEqual((await read('activity')).items.map(x=>x.item_id),[LA]);assert.equal(ok(await request('A','GET',`user_library_activities?id=eq.${id}`)).length,1);
  assert.deepEqual((await read('activity',copied)).items[0].data,old.get('activity').data);
 });
 await check('library deletion removes snapshots from original and hidden copy but preserves tags',async()=>{
  for(const [kind,plural] of sections){
   assert.equal(ok(await request('A','DELETE',`user_library_${plural}?id=eq.${LA}&user_id=eq.${A}`)).length,1);
   assert.deepEqual((await read(kind)).items,[]);assert.deepEqual((await read(kind,copied)).items,[]);
   error(await save(kind,fields(kind,'Stale')),'42501');assert.deepEqual(ok(await request('A','GET',`user_library_${plural}?id=eq.${LA}`)),[]);
  }
  assert.equal(ok(await request('A','GET',`user_tags?id=eq.${TA}`)).length,1);
 });
 await check('portfolio deletion keeps library and replay cannot resurrect deleted source',async()=>{
  assert.equal(ok(await action('50000000-0000-0000-0000-000000000003','delete',copied,'')).status,'confirmed');
  for(const [kind,plural] of sections){
   const id=created.get(kind);assert.equal(ok(await request('A','GET',`user_library_${plural}?id=eq.${id}`)).length,1);
   assert.equal(ok(await request('A','DELETE',`user_library_${plural}?id=eq.${id}&user_id=eq.${A}`)).length,1);
   assert.equal(ok(await save(kind,fields(kind,'New source'),[],[TA],id,'A',true)).status,'confirmed');
   assert.deepEqual(ok(await request('A','GET',`user_library_${plural}?id=eq.${id}`)),[]);
  }
 });
}

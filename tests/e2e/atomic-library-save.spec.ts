import { test, expect } from '@playwright/test';

const sections = [
  { key: 'education', plural: 'educations', tab: 'ประวัติการศึกษา', add: 'เพิ่มประวัติการศึกษา', edit: 'แก้ไขประวัติการศึกษา', title: 'ชื่อสถานศึกษา *', titleKey: 'school_name' },
  { key: 'activity', plural: 'activities', tab: 'ผลงานและกิจกรรม', add: 'เพิ่มผลงานหรือกิจกรรม', edit: 'แก้ไขผลงานหรือกิจกรรม', title: 'ชื่อผลงาน / กิจกรรม *', titleKey: 'title' },
  { key: 'certificate', plural: 'certificates', tab: 'เกียรติบัตร', add: 'เพิ่มเกียรติบัตร', edit: 'แก้ไขเกียรติบัตร', title: 'ชื่อเกียรติบัตร / รางวัล *', titleKey: 'title' },
] as const;
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});


for(const config of sections) test(config.key+': atomic create retry and edit avoid direct table writes',async({page,request})=>{
 let row:Record<string,unknown>|null=null;
 const calls:Record<string,unknown>[]=[];
 let fail=true;let directWrites=0;
 const png=await (await request.get('http://127.0.0.1:54321/sample.png')).body();
 const uploads:Buffer[]=[];let storageDeletes=0;
 let images:Record<string,unknown>[]=[];
 await page.route('**/storage/v1/**',route=>{
  if(route.request().method()==='POST')uploads.push(route.request().postDataBuffer()!);
  if(route.request().method()==='DELETE')storageDeletes++;
  return route.request().method()==='GET'?route.fulfill({contentType:'image/png',body:png}):route.fulfill({json:{Key:'uploaded'}});
 });
 await page.route('**/rest/v1/user_library_**',route=>{
  if(route.request().method()!=='GET') { directWrites++;return route.fulfill({status:500,json:{}}); }
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('user_library_'+config.plural))return route.fulfill({json:row?[row]:[]});
  if(path.endsWith(config.key+'_images'))return route.fulfill({json:images});
  return route.fulfill({json:[]});
 });
 await page.route('**/rest/v1/rpc/*_library_item_atomic',route=>{
  const args=route.request().postDataJSON();calls.push(args);
  if(fail)return route.fulfill({status:500,json:{message:'PRIVATE'}});
  row={id:args.p_item_id,user_id:user.id,...args.p_fields};
  images=args.p_images.map((image:{id?:string;image_url:string},index:number)=>({...image,id:image.id??'40000000-0000-0000-0000-000000000001',sort_order:index,[config.key+'_id']:args.p_item_id}));
  return route.fulfill({json:route.request().url().includes('create_')?
   {id:args.p_item_id,status:'confirmed'}:{id:args.p_item_id,item:row}});
 });
 await page.goto('/my-data');
 await page.getByRole('group',{name:'หมวดคลังข้อมูล'}).getByRole('button',{name:config.tab,exact:true}).click();
 await page.getByRole('button',{name:config.add,exact:true}).click();
 const dialog=page.locator('main div[role=dialog]');
 await dialog.getByLabel(config.title,{exact:true}).fill('Atomic item');
 if(config.key==='education')await dialog.getByLabel('ระดับการศึกษา *',{exact:true}).fill('School');
 await dialog.locator('input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});
 await page.locator('dialog').getByRole('button',{name:'ตัดรูปและใช้รูปนี้',exact:true}).click();
 await expect(page.locator('dialog')).toHaveCount(0);
 await expect(dialog.locator('img')).toHaveCount(1);
 const bytes=Buffer.from(await dialog.locator('img').evaluate(async element=>{
  if(!(element instanceof HTMLImageElement))throw new Error('Missing image');
  return Array.from(new Uint8Array(await (await fetch(element.src)).arrayBuffer()));
 }));
 page.on('dialog',async alert=>{expect(alert.message()).not.toContain('PRIVATE');await alert.accept();});
 await dialog.getByRole('button',{name:/^บันทึก/}).click();
 await expect.poll(()=>calls.length).toBe(1);
 await expect(dialog.getByLabel(config.title,{exact:true})).toHaveValue('Atomic item');
 fail=false;
 await dialog.getByRole('button',{name:/^บันทึก/}).click();
 await expect(dialog).toHaveCount(0);
 expect(calls[0]).toEqual(calls[1]);
 const retainedImages=images.map(({id,image_url})=>({id,image_url}));
 if(config.key!=='education')expect(retainedImages).toHaveLength(1);
 await page.locator('article').filter({hasText:'Atomic item'}).getByRole('button',{name:/แก้ไข/}).click();
 await dialog.getByLabel(config.title,{exact:true}).fill('Edited item');
 await dialog.getByRole('button',{name:/^บันทึก/}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Edited item',exact:true})).toBeVisible();
 expect(directWrites).toBe(0);
 expect(calls).toHaveLength(3);
 expect(uploads).toHaveLength(1);expect(uploads[0].includes(bytes)).toBe(true);
 expect(storageDeletes).toBe(0);
 if(config.key!=='education')expect(calls[2].p_images).toEqual(retainedImages);
 else expect(calls[2].p_fields).toMatchObject({logo_url:(calls[1].p_fields as Record<string,unknown>).logo_url});
});

for(const config of sections) test(config.key+': account change during upload stops old mutation',async({page,request})=>{
 let account=user.id;
 await page.route('**/auth/v1/user',route=>route.fulfill({json:{...user,id:account}}));
 await page.route('**/rest/v1/user_library_**',route=>route.fulfill({json:[]}));
 const png=await (await request.get('http://127.0.0.1:54321/sample.png')).body();
 let release=()=>{};let uploading=false;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/storage/v1/**',async route=>{
  if(route.request().method()!=='POST')return route.fulfill({contentType:'image/png',body:png});
  uploading=true;await pending;await route.fulfill({json:{Key:'uploaded'}});
 });
 await page.goto('/my-data');
 const open=async()=>{
  await page.getByRole('group',{name:'หมวดคลังข้อมูล'}).getByRole('button',{name:config.tab,exact:true}).click();
  await page.getByRole('button',{name:config.add,exact:true}).click();
 };
 await open();
 const form=page.locator('main div[role=dialog]');
 await form.getByLabel(config.title,{exact:true}).fill('Old draft');
 if(config.key==='education')await form.getByLabel('ระดับการศึกษา *',{exact:true}).fill('School');
 await form.locator('input[type=file]').setInputFiles({name:'late.png',mimeType:'image/png',buffer:png});
 await page.locator('dialog').getByRole('button',{name:'ตัดรูปและใช้รูปนี้',exact:true}).click();
 await expect(page.locator('dialog')).toHaveCount(0);
 await expect(form.locator('img')).toHaveCount(1);
 await form.getByRole('button',{name:/^บันทึก/}).click();
 await expect.poll(()=>uploading).toBe(true);
 account='00000000-0000-0000-0000-000000000002';
 await page.evaluate(({account,user})=>{
  const channel=new BroadcastChannel('sb-127-auth-token');
  channel.postMessage({event:'SIGNED_IN',session:{user:{...user,id:account}}});channel.close();
 },{account,user});
 await expect(form).toHaveCount(0);
 await open();
 await form.getByLabel(config.title,{exact:true}).fill('New owner draft');
 const writes:string[]=[];
 page.on('request',req=>{if(req.url().includes('/rest/v1/')&&req.method()!=='GET')writes.push(req.url());});
 const finished=page.waitForResponse(res=>res.url().includes('/storage/v1/')&&res.request().method()==='POST');
 release();await finished;
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(form.getByLabel(config.title,{exact:true})).toHaveValue('New owner draft');
 expect(writes).toEqual([]);
});

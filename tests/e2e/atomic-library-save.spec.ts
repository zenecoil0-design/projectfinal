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


for(const config of sections) test(config.key+': atomic create retry and edit avoid direct table writes',async({page})=>{
 let row:Record<string,unknown>|null=null;
 const calls:Record<string,unknown>[]=[];
 let fail=true;let directWrites=0;
 await page.route('**/rest/v1/user_library_**',route=>{
  if(route.request().method()!=='GET') { directWrites++;return route.fulfill({status:500,json:{}}); }
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('user_library_'+config.plural))return route.fulfill({json:row?[row]:[]});
  return route.fulfill({json:[]});
 });
 await page.route('**/rest/v1/rpc/*_library_item_atomic',route=>{
  const args=route.request().postDataJSON();calls.push(args);
  if(fail)return route.fulfill({status:500,json:{message:'PRIVATE'}});
  row={id:args.p_item_id,user_id:user.id,...args.p_fields};
  return route.fulfill({json:route.request().url().includes('create_')?
   {id:args.p_item_id,status:'confirmed'}:{id:args.p_item_id,item:row}});
 });
 await page.goto('/my-data');
 await page.getByRole('group',{name:'หมวดคลังข้อมูล'}).getByRole('button',{name:config.tab,exact:true}).click();
 await page.getByRole('button',{name:config.add,exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel(config.title,{exact:true}).fill('Atomic item');
 if(config.key==='education')await dialog.getByLabel('ระดับการศึกษา *',{exact:true}).fill('School');
 page.on('dialog',async alert=>{expect(alert.message()).not.toContain('PRIVATE');await alert.accept();});
 await dialog.getByRole('button',{name:/^บันทึก/}).click();
 await expect.poll(()=>calls.length).toBe(1);
 await expect(dialog.getByLabel(config.title,{exact:true})).toHaveValue('Atomic item');
 fail=false;
 await dialog.getByRole('button',{name:/^บันทึก/}).click();
 await expect(dialog).toHaveCount(0);
 expect(calls[0]).toEqual(calls[1]);
 await page.locator('article').filter({hasText:'Atomic item'}).getByRole('button',{name:/แก้ไข/}).click();
 await dialog.getByLabel(config.title,{exact:true}).fill('Edited item');
 await dialog.getByRole('button',{name:/^บันทึก/}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Edited item',exact:true})).toBeVisible();
 expect(directWrites).toBe(0);
 expect(calls).toHaveLength(3);
});

import { test, expect, type Page } from '@playwright/test';
const owner = '00000000-0000-0000-0000-000000000001';
const user = { id:owner,aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value:object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = {access_token:`${part({alg:'HS256'})}.${part({sub:owner,exp:4102444800})}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user};
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+part(session),domain:'127.0.0.1',path:'/'}]);
});
const sections = [
  {kind:'education',plural:'educations',tab:'ประวัติการศึกษา',title:'Saved School'},
  {kind:'activity',plural:'activities',tab:'ผลงานและกิจกรรม',title:'Saved Activity'},
  {kind:'certificate',plural:'certificates',tab:'เกียรติบัตร',title:'Saved Certificate'},
] as const;
const deletion = (page:Page) => page.getByRole('dialog',{name:'ลบรายการจากคลัง',exact:true});
async function open(page:Page, section:typeof sections[number]) {
  await page.goto('/my-data');
  await page.getByRole('group',{name:'หมวดคลังข้อมูล'}).getByRole('button',{name:section.tab,exact:true}).click();
  await expect(page.getByRole('heading',{name:section.title,exact:true})).toBeVisible();
  return page.locator('article').filter({has:page.getByRole('heading',{name:section.title,exact:true})});
}

for (const section of sections) test(`${section.kind}: impact/cancel and same-turn delete use one owner-filtered returning request; files retained`, async ({page}) => {
  const card = await open(page,section); let deletes=0,storageDeletes=0;
  page.on('request',request=>{
    if(request.method()!=='DELETE')return;
    if(request.url().includes('/storage/v1/'))storageDeletes++;
    if(!request.url().includes(`/rest/v1/user_library_${section.plural}?`))return;
    deletes++;
    const url=new URL(request.url());expect(url.searchParams.get('id')).toBe(`eq.${section.kind}-a`);expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`);
    expect(request.headers().prefer).toContain('return=representation');
  });
  await card.getByRole('button',{name:/ลบ/}).click();
  await expect(deletion(page)).toContainText('Portfolio A');
  await expect(deletion(page)).toContainText('พอร์ตที่ได้รับผลกระทบ 1 พอร์ต');
  await deletion(page).getByRole('button',{name:'ยกเลิก',exact:true}).click();
  await expect(card).toBeVisible();expect(deletes).toBe(0);
  await card.getByRole('button',{name:/ลบ/}).click();
  const confirm=deletion(page).getByRole('button',{name:'ลบจากคลังและทุกพอร์ต',exact:true});
  await expect(confirm).toBeVisible();
  await confirm.evaluate(button=>{if(!(button instanceof HTMLButtonElement))throw new Error('button');button.click();button.click();});
  await expect(deletion(page).getByRole('status')).toContainText('รูปใน Storage ยังไม่ได้ลบ');
  await expect(card).toHaveCount(0);expect(deletes).toBe(1);expect(storageDeletes).toBe(0);
  await deletion(page).getByRole('button',{name:'ปิด',exact:true}).click();
});

test('certificate: legacy four images remain visible/editable, cannot add, deliberate image removal needs confirmation',async ({page})=>{
  const pictures=Array.from({length:4},(_,sort_order)=>({id:`legacy-${sort_order}`,certificate_id:'certificate-a',image_url:'http://127.0.0.1:54321/sample.png',sort_order}));
  await page.route('**/rest/v1/user_library_certificate_images?**',route=>route.fulfill({json:pictures}));
  const card=await open(page,sections[2]);await card.getByRole('button',{name:/แก้ไข/}).click();
  const form=page.locator('main div[role=dialog]');await expect(form.locator('img')).toHaveCount(4);
  await expect(form.getByRole('button',{name:'เพิ่มรูปไม่ได้ (สูงสุด 2 รูป)',exact:true})).toBeDisabled();
  await form.getByLabel('ชื่อเกียรติบัตร / รางวัล *',{exact:true}).fill('Legacy text saved');
  await form.getByRole('button',{name:/^บันทึก/}).click();
  await expect(page.getByRole('heading',{name:'Legacy text saved',exact:true})).toBeVisible();
  await page.locator('article').getByRole('button',{name:/แก้ไข/}).click();await expect(form.locator('img')).toHaveCount(4);
  const warning=page.waitForEvent('dialog').then(dialog=>dialog.dismiss());
  await Promise.all([warning,form.getByRole('button',{name:'ลบรูป',exact:true}).nth(0).click()]);
  await expect(form.locator('img')).toHaveCount(4);
});

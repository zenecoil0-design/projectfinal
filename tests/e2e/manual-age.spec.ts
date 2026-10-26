import {test,expect,type Page} from '@playwright/test';
import {openEditorSection} from './helpers/editor';
const user={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
test.beforeEach(async({context,request,page})=>{
 await request.get('http://127.0.0.1:54321/__reset');
 await page.clock.setFixedTime(new Date('2040-06-15T12:00:00Z'));
 const part=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const session={access_token:`${part({alg:'HS256'})}.${part({sub:user.id,exp:4102444800})}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user};
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+part(session),domain:'127.0.0.1',path:'/'}]);
});
async function ready(page:Page,id='a'){
 await page.goto(`/editor?portfolio=${id}`);
 await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await openEditorSection(page,'profile');
}
const preview=(page:Page)=>page.locator('main [data-portfolio-page][data-page-section=profile]');
const input=(page:Page)=>page.getByRole('textbox',{name:'อายุ (ปี)',exact:true});
const save=(page:Page)=>page.locator('#editor-panel-profile button[type=submit]');
test('manual persists across save/reload; birthday changes do not override and automatic mode retains previous manual value',async({page})=>{
 await ready(page);await page.getByLabel('วันเกิด',{exact:true}).fill('2000-01-01');
 await page.getByLabel('กรอกอายุเอง').check();await input(page).fill('17');
 await page.getByLabel('วันเกิด',{exact:true}).fill('2001-01-01');
 await expect(preview(page)).toContainText(/อายุ\s*:?\s*17 ปี/);
 await openEditorSection(page, 'colors');
 await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true})).toBeDisabled();
 await openEditorSection(page,'profile');
 await save(page).click();await expect(page.locator('#editor-heading-education')).toHaveAttribute('aria-expanded','true');
 await ready(page);await expect(input(page)).toHaveValue('17');await expect(page.getByLabel('กรอกอายุเอง')).toBeChecked();
 await page.getByLabel('กรอกอายุเอง').uncheck();
 await expect(page.locator('#editor-panel-profile output')).toHaveText('39');
 await save(page).click();await expect(page.locator('#editor-heading-education')).toHaveAttribute('aria-expanded','true');
 await ready(page);await expect(page.getByLabel('กรอกอายุเอง')).not.toBeChecked();
 await page.getByLabel('กรอกอายุเอง').check();await expect(input(page)).toHaveValue('17');
});
test('invalid manual input never uploads/writes; zero is valid; failed save preserves draft until retry',async({page})=>{
 await ready(page);let writes=0;let fail=true;
 await page.route('**/rest/v1/profiles?**',route=>{
  if(route.request().method()!=='PATCH')return route.continue();writes++;
  expect(route.request().postDataJSON()).toMatchObject({age_mode:'manual',manual_age:0});
  return fail?route.fulfill({status:500,json:{message:'PRIVATE_FAILURE'}}):route.continue();
 });
 await page.getByLabel('กรอกอายุเอง').check();
 for(const invalid of ['', '-1','1.5','1e2']){
  await input(page).fill(invalid);await save(page).click();
  await expect(page.locator('#editor-panel-profile [role=alert]')).toContainText('กรุณากรอกอายุเป็นจำนวนเต็ม');
  expect(writes).toBe(0);
 }
 await input(page).fill('0');await save(page).click();
 await expect(page.locator('#editor-panel-profile [role=alert]')).toContainText('ยืนยันการบันทึก');
 await expect(input(page)).toHaveValue('0');await expect(preview(page)).toContainText(/อายุ\s*:?\s*0 ปี/);
 await expect(page.getByText('PRIVATE_FAILURE')).toHaveCount(0);
 fail=false;await save(page).click();await expect(page.locator('#editor-heading-education')).toHaveAttribute('aria-expanded','true');
 await ready(page);await expect(input(page)).toHaveValue('0');expect(writes).toBe(2);
});
for(const width of [1440,390])test(`manual age appears in all templates and no previous portfolio value at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await ready(page);
 await page.getByLabel('กรอกอายุเอง').check();await input(page).fill('18');
 for(const template of ['classic','modern','minimal']){
  await page.getByLabel('เทมเพลต',{exact:true}).selectOption(template);
  await expect(preview(page)).toContainText(/อายุ\s*:?\s*18 ปี/);
 }
 await page.screenshot({path:`test-results/manual-age-${width}.png`,fullPage:true});
 // A fresh document/session must not inherit A's unsaved mode or value.
 page.on('dialog',dialog=>dialog.accept());await ready(page,'b');
 await expect(page.getByLabel('กรอกอายุเอง')).not.toBeChecked();await expect(page.locator('#editor-panel-profile output')).toHaveText('—');
});
test('malformed stored mode blocks profile/export rather than silently replacing with automatic age',async({page,request})=>{
 await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a',{data:{age_mode:'unexpected',manual_age:18}});
 await page.goto('/editor?portfolio=a');await openEditorSection(page,'profile');
 await expect(page.locator('#editor-panel-profile [role=alert]')).toContainText('โหลดข้อมูลประวัติส่วนตัวไม่สำเร็จ');
 await openEditorSection(page, 'colors');
 await expect(page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true})).toBeDisabled();
 await openEditorSection(page,'profile');
});

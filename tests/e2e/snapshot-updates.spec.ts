import { test, expect } from '@playwright/test';
import { openEditorSection } from './helpers/editor';
const owner='00000000-0000-0000-0000-000000000001';
const portfolio='10000000-0000-0000-0000-000000000001';
const item='20000000-0000-0000-0000-000000000001';
for(const section of ['education','activity','certificate'] as const) {
 test(section+': explicit update and read-only recovery',async({page,context,request})=>{
  await request.get('http://127.0.0.1:54321/__reset');
  await request.post('http://127.0.0.1:54321/rest/v1/portfolios',{data:{id:portfolio,user_id:owner,title:'Snapshot',template_key:'classic'}});
  const part=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const user={id:owner,aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+part({access_token:part({alg:'HS256'})+'.'+part({sub:owner,exp:4102444800})+'.test',refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}),domain:'127.0.0.1',path:'/'}]);
  let accepted=false;let failRead=false;let captures=0;
  const captured=()=>({data:{item:{id:item,user_id:owner,title:accepted?'New edition':'Old edition',school_name:accepted?'New edition':'Old edition',level:'',study_plan:null,gpa:null,logo_url:null,start_year:null,end_year:null,description:'',activity_date:null,organization:null,issued_date:null,issued_by:null,image_url:null},images:[]},revision:(accepted?'b':'a').repeat(32),latest_revision:'b'.repeat(32),version:accepted?2:1});
  await page.route('**/rest/v1/rpc/read_portfolio_item_snapshots',route=>{
   const args=route.request().postDataJSON();
   if(failRead && args.p_section===section)return route.fulfill({status:500,json:{message:'PRIVATE_FAILURE'}});
   return route.fulfill({json:{format_version:1,portfolio_id:portfolio,section:args.p_section,items:args.p_section===section?[{...captured(),item_id:item,sort_order:0}]:[]}});
  });
  await page.route('**/rest/v1/rpc/capture_portfolio_item_snapshot',route=>{
   captures++;accepted=true;failRead=true;
   expect(route.request().postDataJSON().p_expected_revision).toBe('b'.repeat(32));
   return route.fulfill({json:captured()});
  });
  await page.goto('/editor?portfolio='+portfolio);
  await openEditorSection(page,section);
  const panel=page.getByLabel('ฉบับข้อมูลในพอร์ต').filter({visible:true});
  await expect(panel).toContainText('Old edition');
  const checkbox=page.locator('form:visible').getByRole('checkbox').first();
  await checkbox.check();
  await expect(panel.getByRole('button',{name:'รับอัปเดตรายการนี้'})).toBeDisabled();
  await checkbox.uncheck();
  await expect(panel.getByRole('button',{name:'รับอัปเดตรายการนี้'})).toBeEnabled();
  page.on('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'รับอัปเดตรายการนี้'}).click();
  await expect(panel.getByRole('alert')).toContainText('ยังยืนยัน');
  expect(captures).toBe(1);
  failRead=false;
  await panel.getByRole('button',{name:'ตรวจสอบฉบับปัจจุบัน'}).click();
  await expect(panel.getByRole('alert')).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'รับอัปเดตรายการนี้'})).toHaveCount(0);
  expect(captures).toBe(1);
  await expect(page.locator('[data-portfolio-page]').filter({hasText:'New edition'}).first()).toBeAttached();
 });
}

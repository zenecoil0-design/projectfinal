import { openEditorSection } from './helpers/editor';
import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});


for(const template of ['classic','modern','minimal'])test(`${template}: long descriptions preserve text and export`,async({page,request},info)=>{
 const text=Array.from({length:90},(_,i)=>`รายละเอียดที่ ${i} ทดสอบการแบ่งหน้าข้อความภาษาไทย`).join('\n');
 for(const [table,id] of [['activities','activity-a'],['certificates','certificate-a']])await request.patch(`http://127.0.0.1:54321/rest/v1/user_library_${table}?id=eq.${id}`,{data:{description:text}});
 const image = await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=120;const x=c.getContext('2d')!;x.fillStyle='navy';x.fillRect(0,0,240,120);return c.toDataURL();});
 for(const kind of ['activity','certificate'])await request.post(`http://127.0.0.1:54321/rest/v1/user_library_${kind}_images`,{data:{id:`${kind}-split-img`,[`${kind}_id`]:`${kind}-a`,image_url:image,sort_order:0}});
 await page.setViewportSize({width:390,height:900});await page.goto('/editor?portfolio=a');await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await page.getByLabel('เทมเพลต',{exact:true}).selectOption(template);
 for(const kind of ['activity','certificate']){
 const cards=page.locator(`main .${kind}-card`);await expect.poll(()=>cards.count()).toBeGreaterThan(1);
 await expect(cards.locator('img')).toHaveCount(1);
 expect((await cards.locator('[data-split-description]').allTextContents()).join('')).toBe(text);
 }
 await openEditorSection(page,'colors');const count=await page.locator('main [data-portfolio-page]').count();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true}).click();
 const path=info.outputPath(template+'.pdf');await(await download).saveAs(path);
 const {execFileSync}=await import('node:child_process');const audit=JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['tests/pdf-inspect.py',path],{encoding:'utf8'}));expect(audit.pages).toBe(count);
});

import { openEditorSection } from './helpers/editor';
import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});


for (const template of ['classic','modern','minimal']) test(`${template}: long preface exports complete hidden mobile pages`,async({page},info)=>{
 await page.setViewportSize({width:390,height:900});await page.goto('/editor?portfolio=a');
 await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
 await page.getByLabel('เทมเพลต',{exact:true}).selectOption(template);await openEditorSection(page,'preface');
 const text=Array.from({length:65},(_,i)=>`ย่อหน้า ${i} ทดสอบภาษาไทย กิ้ 👩‍👩‍👧‍👦 ข้อมูลครบและเรียงลำดับ`).join('\n');
 await page.locator('#preface-text').fill(text);
 const pages=page.locator('main [data-portfolio-page][data-page-section=preface]');
 await expect.poll(()=>pages.count()).toBeGreaterThan(1);
 expect((await pages.locator('[data-preface-text]').allTextContents()).join('')).toBe(text);
 await page.locator('#editor-panel-preface button[type=submit]').click();
 await expect(page.locator('#editor-heading-profile')).toHaveAttribute('aria-expanded','true');
 await openEditorSection(page,'colors');const count=await page.locator('main [data-portfolio-page]').count();
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true}).click();
 const path=info.outputPath(template+'.pdf');await(await downloading).saveAs(path);
 const {execFileSync}=await import('node:child_process');
 const audit=JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['tests/pdf-inspect.py',path],{encoding:'utf8'}));
 expect(audit.pages).toBe(count);for(const [w,h] of audit.boxes){expect(w).toBeCloseTo(595.28,1);expect(h).toBeCloseTo(841.89,1);}
 await openEditorSection(page,'preface');await page.locator('#preface-text').fill('คำนำสั้น');await expect(pages).toHaveCount(1);
 await expect(pages.locator('[data-preface-text]')).toHaveText('คำนำสั้น');
});

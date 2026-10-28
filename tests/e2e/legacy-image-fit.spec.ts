import { expectCurrentContents } from './helpers/toc';
import { openEditorSection } from './helpers/editor';
import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});



for (const template of ['classic', 'modern', 'minimal']) test(`${template}: long fields with four legacy images preserve order and export`, async ({page, request}, info) => {
  const title = 'โรงเรียนและผลงานภาษาไทยยาว '.repeat(120);
  const detail = 'เนื้อหาประกอบการเรียนรู้ '.repeat(140);
  const organization = 'หน่วยงานทดสอบภาษาไทย '.repeat(60);
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_educations?id=eq.education-a', {data:{school_name:title, study_plan:detail, logo_url:'http://127.0.0.1:54321/sample.png'}});
  for (const [table,id] of [['activities','activity-a'],['certificates','certificate-a']]) await request.patch(`http://127.0.0.1:54321/rest/v1/user_library_${table}?id=eq.${id}`, {data:{title, description:detail, organization, issued_by:organization}});
  for (const kind of ['activity','certificate']) for(let i=0;i<4;i++) await request.post(`http://127.0.0.1:54321/rest/v1/user_library_${kind}_images`, {data:{id:`${kind}-long-image-${i}`, [`${kind}_id`]:`${kind}-a`, image_url:'http://127.0.0.1:54321/sample.png', sort_order:i}});
  await page.setViewportSize({width:390,height:900});
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('เทมเพลต',{exact:true}).selectOption(template);
  for (const kind of ['education','activity','certificate']) {
    const cards = page.locator(`main .${kind}-card`);
    await expect.poll(() => cards.count()).toBeGreaterThan(1);
    await expect(cards.locator('img')).toHaveCount(kind === 'education' ? 1 : 4);
    expect((await cards.locator('h3').allTextContents()).join('')).toBe(title);
    if (kind !== 'education') {
      expect((await cards.locator('[data-split-description]').allTextContents()).join('')).toBe(detail);
      expect((await cards.locator('p:not([data-split-description])').allTextContents()).join('')).toContain(organization);
    } else expect((await cards.locator('[data-split-field=plan]').allTextContents()).join('')).toBe(detail);
  }
  if (template === 'minimal') {
    const continuations = page.locator('main .education-card').filter({hasNot:page.locator('img')});
    for (const card of await continuations.all()) await expect(card).toHaveAttribute('data-has-image','false');
  }
  await openEditorSection(page,'colors'); await expectCurrentContents(page);
  const count = await page.locator('main [data-portfolio-page]').count();
  await expect(page.locator('main [data-page-number]')).toHaveText(Array.from({length:count-3},(_,i)=>String(i+1)));
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'ดาวน์โหลด PDF',exact:true}).click();
  const result = await Promise.race([download, page.getByText(/เนื้อหาล้นหน้า/).waitFor().then(async()=>{throw new Error(await page.getByText(/เนื้อหาล้นหน้า/).innerText());})]);
  const path = info.outputPath(template+'.pdf'); await result.saveAs(path);
  const {execFileSync} = await import('node:child_process');
  const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python',['tests/pdf-inspect.py',path],{encoding:'utf8'}));
  expect(audit.pages).toBe(count);
  for (const [w,h] of audit.boxes) { expect(w).toBeCloseTo(595.28,1); expect(h).toBeCloseTo(841.89,1); }
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_educations?id=eq.education-a', {data:{school_name:'โรงเรียน',study_plan:'วิทย์'}});
  for (const [table,id] of [['activities','activity-a'],['certificates','certificate-a']]) await request.patch(`http://127.0.0.1:54321/rest/v1/user_library_${table}?id=eq.${id}`, {data:{title:'ชื่อสั้น',description:'รายละเอียด',organization:'',issued_by:''}});
  await page.reload(); await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  for (const kind of ['education','activity','certificate']) await expect(page.locator(`main .${kind}-card`)).toHaveCount(1);
});

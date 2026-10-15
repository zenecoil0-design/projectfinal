import { test, expect } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('accordion opens one or none, keyboard reopens, collapsing never saves or reloads or changes preview', async ({ page }, testInfo) => {
  let reads = 0; let writes = 0;
  page.on('request', request => { if (request.url().includes('/rest/v1/')) { if (request.method() === 'GET') reads++; else writes++; } });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const initialReads = reads;
  const pages = page.locator('[data-portfolio-page]');
  const pageCount = await pages.count();
  const preview = await page.locator('main').innerText();
  const headers = page.locator('aside button[aria-controls^="editor-panel-"]');
  await expect(headers).toHaveCount(6);
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('aside form')).toHaveCount(6);
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('แบบร่าง Accordion');
  await openEditorSection(page, 'preface');
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(1);
  const preface = page.locator('#editor-heading-preface');
  await preface.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
  await expect(page.locator('form:visible')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(preface).toHaveAttribute('aria-expanded', 'true');
  await openEditorSection(page, 'cover');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('แบบร่าง Accordion');
  await expect(page.locator('#editor-heading-cover')).toContainText('ยังไม่บันทึก');
  await expect(pages).toHaveCount(pageCount);
  await expect(page.locator('main')).toContainText('Saved Activity');
  await expect(page.locator('main')).toContainText('Saved Certificate');
  expect(preview).toContain('Saved Activity');
  expect(reads).toBe(initialReads); expect(writes).toBe(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: testInfo.outputPath(`accordion-${width}.png`) });
    expect(await page.locator('aside').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

test('save failure stays, success advances, last section never wraps, and a delayed save cannot steal navigation', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('รอบบันทึก');
  await page.route('**/rest/v1/covers?**', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, json: { message: 'Mock accordion save failure' } }) : route.continue());
  await page.locator('form:visible button[type=submit]').click();
  await expect(page.getByText('Mock accordion save failure')).toBeVisible();
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('รอบบันทึก');
  await page.unroute('**/rest/v1/covers?**');
  await page.locator('form:visible button[type=submit]').click();
  await expect(page.locator('#editor-heading-preface')).toHaveAttribute('aria-expanded', 'true');
  await openEditorSection(page, 'certificate');
  await page.locator('form:visible button[type=submit]').click();
  await expect(page.locator('form:visible [role=status]').filter({ hasText: 'เรียบร้อยแล้ว' })).toContainText('บันทึกเกียรติบัตรเรียบร้อยแล้ว');
  await expect(page.locator('#editor-heading-certificate')).toHaveAttribute('aria-expanded', 'true');

  let release = () => {};
  await page.route('**/rest/v1/covers?**', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await new Promise<void>(resolve => { release = resolve; });
    await route.continue();
  });
  await openEditorSection(page, 'cover');
  const saving = page.waitForRequest(request => request.url().includes('/rest/v1/covers?') && request.method() === 'POST');
  await page.locator('form:visible button[type=submit]').click(); await saving;
  await openEditorSection(page, 'profile');
  await openEditorSection(page, 'cover');
  release();
  await expect(page.locator('#editor-panel-cover [role=status]')).toContainText('เรียบร้อยแล้ว');
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#editor-heading-preface')).toHaveAttribute('aria-expanded', 'false');
});

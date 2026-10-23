import { test, expect, errors, type Page } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});
const form = (page: Page) => page.locator('main div[role=dialog]');
const confirmation = (page: Page) => page.getByRole('dialog', { name: 'ข้อมูลยังไม่ได้บันทึก', exact: true });
async function blockedTraversal(page: Page, direction: 'back' | 'forward') {
  try { if (direction === 'back') await page.goBack({ timeout: 1000 }); else await page.goForward({ timeout: 1000 }); }
  catch (error) { if (!(error instanceof errors.TimeoutError)) throw error; }
}
async function history(page: Page) {
  await page.goto('/'); await page.locator('aside').getByRole('link', { name: 'คลังข้อมูล', exact: true }).click();
  await expect(page.getByRole('button', { name: 'เพิ่มผลงานหรือกิจกรรม', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await expect(page).toHaveURL(/dashboard$/);
  await page.goBack(); await expect(page).toHaveURL(/my-data$/);
  await expect(page.getByRole('button', { name: 'เพิ่มผลงานหรือกิจกรรม', exact: true })).toBeVisible();
}
async function draft(page: Page) {
  await page.getByRole('button', { name: 'เพิ่มผลงานหรือกิจกรรม', exact: true }).click();
  await form(page).getByLabel('ชื่อผลงาน / กิจกรรม *', { exact: true }).fill('draft survives browser history');
  await form(page).evaluate(el => { el.dataset.retained = 'original DOM'; });
}
async function retained(page: Page) {
  await expect(page).toHaveURL(/my-data$/);
  await expect(form(page)).toHaveAttribute('data-retained', 'original DOM');
  await expect(form(page).getByLabel('ชื่อผลงาน / กิจกรรม *', { exact: true })).toHaveValue('draft survives browser history');
}

test('dirty Back retains original form on continue/Escape repeatedly, then discards to Home once', async ({ page }) => {
  await history(page); await draft(page); const length = await page.evaluate(() => window.history.length);
  for (let i = 0; i < 3; i++) {
    await blockedTraversal(page, 'back'); await expect(confirmation(page)).toBeVisible(); await retained(page);
    if (i === 1) await page.keyboard.press('Escape'); else await confirmation(page).getByRole('button', { name: 'แก้ไขต่อ', exact: true }).click();
    await expect(confirmation(page)).toHaveCount(0); await retained(page);
    expect(await page.evaluate(() => window.history.length)).toBe(length);
  }
  await blockedTraversal(page, 'back'); await confirmation(page).getByRole('button', { name: 'ทิ้งการเปลี่ยนแปลง', exact: true }).click();
  await expect(page).toHaveURL(/\/$/); await expect(form(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.history.length)).toBe(length);
  await page.goForward(); await expect(page).toHaveURL(/my-data$/); await expect(confirmation(page)).toHaveCount(0);
  await page.goForward(); await expect(page).toHaveURL(/dashboard$/); await expect(confirmation(page)).toHaveCount(0);
});

test('dirty Forward retains draft then discards to the real Dashboard entry', async ({ page }) => {
  await history(page); await draft(page); const length = await page.evaluate(() => window.history.length);
  await blockedTraversal(page, 'forward'); await expect(confirmation(page)).toBeVisible(); await retained(page);
  await confirmation(page).getByRole('button', { name: 'แก้ไขต่อ', exact: true }).click(); await retained(page);
  await blockedTraversal(page, 'forward'); await confirmation(page).getByRole('button', { name: 'ทิ้งการเปลี่ยนแปลง', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/); expect(await page.evaluate(() => window.history.length)).toBe(length);
  await page.goBack(); await expect(page).toHaveURL(/my-data$/); await expect(confirmation(page)).toHaveCount(0);
});

test('repeated Back/Forward during a confirmation preserves its first target and one dialog', async ({ page }) => {
  await history(page); await draft(page); await blockedTraversal(page, 'back'); await expect(confirmation(page)).toBeVisible();
  await blockedTraversal(page, 'forward'); await expect(confirmation(page)).toHaveCount(1); await retained(page);
  await blockedTraversal(page, 'back'); await expect(confirmation(page)).toHaveCount(1); await retained(page);
  await confirmation(page).getByRole('button', { name: 'ทิ้งการเปลี่ยนแปลง', exact: true }).click(); await expect(page).toHaveURL(/\/$/);
});

test('clean Back/Forward uses existing entries without warnings or extra clicks', async ({ page }) => {
  await history(page); const length = await page.evaluate(() => window.history.length);
  await page.goBack(); await expect(page).toHaveURL(/\/$/);
  await page.goForward(); await expect(page).toHaveURL(/my-data$/);
  await page.goForward(); await expect(page).toHaveURL(/dashboard$/);
  await expect(confirmation(page)).toHaveCount(0); expect(await page.evaluate(() => window.history.length)).toBe(length);
});

test('direct entry adds no synthetic same-document entry and preserves draft on native Back cancellation', async ({ page }) => {
  await page.goto('/my-data'); await expect(page.getByRole('button', { name: 'เพิ่มผลงานหรือกิจกรรม', exact: true })).toBeVisible();
  const length = await page.evaluate(() => window.history.length);
  const entries = await page.evaluate(() => {
    const api = (window as Window & { navigation?: { entries: () => { sameDocument: boolean }[] } }).navigation;
    if (!api) throw new Error('This fixture requires the native Navigation API');
    return api.entries().filter(entry => entry.sameDocument).length;
  });
  expect(entries).toBe(1); // The browser may also retain its initial about:blank entry.
  await draft(page);
  const warning = page.waitForEvent('dialog'); const back = page.goBack({ timeout: 2000 }).catch(error => { if (!(error instanceof errors.TimeoutError)) throw error; });
  const native = await warning; expect(native.type()).toBe('beforeunload'); await native.dismiss(); await back;
  await retained(page); await expect(confirmation(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.history.length)).toBe(length);
  await form(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await confirmation(page).getByRole('button', { name: 'ทิ้งการเปลี่ยนแปลง', exact: true }).click();
  await expect(form(page)).toHaveCount(0); expect(await page.evaluate(() => window.history.length)).toBe(length);
});

test('direct document entry uses native beforeunload for a cross-document Back, retaining original form on cancel', async ({ page }) => {
  await page.goto('/dashboard'); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
  await page.goto('/my-data'); await expect(page.getByRole('button', { name: 'เพิ่มผลงานหรือกิจกรรม', exact: true })).toBeVisible();
  await draft(page); const length = await page.evaluate(() => window.history.length);
  const warning = page.waitForEvent('dialog'); const back = page.goBack({ timeout: 2000 }).catch(error => { if (!(error instanceof errors.TimeoutError)) throw error; });
  const native = await warning; expect(native.type()).toBe('beforeunload'); await native.dismiss(); await back;
  await retained(page); await expect(confirmation(page)).toHaveCount(0); expect(await page.evaluate(() => window.history.length)).toBe(length);
  const leaving = page.waitForEvent('dialog'); const accepted = page.goBack(); await (await leaving).accept(); await accepted;
  await expect(page).toHaveURL(/dashboard$/);
});

test('unsupported Navigation API warns explicitly and existing close/beforeunload guards remain usable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'navigation', { value: undefined, configurable: true }); });
  await page.goto('/my-data'); await expect(page.getByRole('button', { name: 'เพิ่มผลงานหรือกิจกรรม', exact: true })).toBeVisible();
  await draft(page); await expect(page.getByRole('alert').filter({ hasText: 'เบราว์เซอร์นี้ยังไม่รองรับคำเตือน' })).toBeVisible();
  expect(await page.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; })).toBe(true);
  await form(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click(); await expect(confirmation(page)).toBeVisible();
  await confirmation(page).getByRole('button', { name: 'แก้ไขต่อ', exact: true }).click(); await retained(page);
});

test('after leaving the library, Home/Dashboard/Editor history and clean guards work normally', async ({ page }) => {
  await history(page); await draft(page); await blockedTraversal(page, 'back');
  await confirmation(page).getByRole('button', { name: 'ทิ้งการเปลี่ยนแปลง', exact: true }).click(); await expect(page).toHaveURL(/\/$/);
  await page.getByRole('banner').getByRole('link', { name: 'ไปหน้า Dashboard', exact: true }).click(); await expect(page).toHaveURL(/dashboard$/);
  await page.locator('article[data-portfolio-id=a]').getByRole('link').click(); await expect(page).toHaveURL(/editor\?portfolio=a$/);
  await expect(page.getByText('Portfolio A', { exact: true })).toBeVisible(); await expect(confirmation(page)).toHaveCount(0);
  await page.goBack(); await expect(page).toHaveURL(/dashboard$/); await page.goBack(); await expect(page).toHaveURL(/\/$/);
  await expect(confirmation(page)).toHaveCount(0);
});

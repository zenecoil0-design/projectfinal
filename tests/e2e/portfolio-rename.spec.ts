import { test, expect, type Page } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const internal = 'INTERNAL_SQL_CONSTRAINT_PERMISSION_STORAGE_42501';
const failureText = 'ยืนยันการเปลี่ยนชื่อพอร์ตไม่สำเร็จ ชื่อที่พิมพ์ยังอยู่ กรุณาลองบันทึกอีกครั้ง';
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});
const card = (page: Page, id = 'a') => page.locator(`article[data-portfolio-id="${id}"]`);
const dialog = (page: Page) => page.getByRole('dialog', { name: 'เปลี่ยนชื่อพอร์ต', exact: true });
async function open(page: Page, id = 'a') {
  await card(page, id).getByRole('button', { name: 'เปลี่ยนชื่อ', exact: false }).click();
  await expect(dialog(page)).toBeVisible();
}
async function dashboard(page: Page) { await page.goto('/dashboard'); await expect(card(page)).toBeVisible(); }

test('rename confirms only the target title with owner filters and survives reload', async ({ page }) => {
  await dashboard(page);
  expect(await card(page).getByRole('button').evaluate(el => el.closest('a'))).toBeNull();
  await open(page); await expect(page).toHaveURL(/dashboard$/);
  await expect(dialog(page).getByLabel('ชื่อพอร์ต', { exact: true })).toHaveValue('Portfolio A');
  await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).fill('  พอร์ตสมัคร Science / 2026  ');
  const patch = page.waitForRequest(r => r.method() === 'PATCH' && r.url().includes('/rest/v1/portfolios'));
  await dialog(page).getByRole('button', { name: 'บันทึกชื่อ', exact: true }).click();
  const request = await patch, url = new URL(request.url());
  expect(request.postDataJSON()).toEqual({ title: 'พอร์ตสมัคร Science / 2026' });
  expect(url.searchParams.get('id')).toBe('eq.a'); expect(url.searchParams.get('user_id')).toBe(`eq.${user.id}`);
  expect(url.searchParams.get('select')).toBe('id,user_id,title,updated_at');
  expect(request.headers().prefer).toContain('return=representation');
  await expect(dialog(page)).toHaveCount(0);
  await expect(card(page).getByRole('heading')).toHaveText('พอร์ตสมัคร Science / 2026');
  await expect(card(page, 'b').getByRole('heading')).toHaveText('Portfolio B');
  await expect(page.getByRole('status')).toHaveText('เปลี่ยนชื่อพอร์ตแล้ว');
  await open(page); await expect(dialog(page).getByLabel('ชื่อพอร์ต', { exact: true })).toHaveValue('พอร์ตสมัคร Science / 2026');
  await dialog(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await page.reload(); await expect(card(page).getByRole('heading')).toHaveText('พอร์ตสมัคร Science / 2026');
});

test('cancel, unchanged trimmed name and blank validation never update', async ({ page }) => {
  await dashboard(page); let updates = 0;
  page.on('request', r => { if (r.method() === 'PATCH') updates++; });
  await open(page); const name = dialog(page).getByLabel('ชื่อพอร์ต', { exact: true });
  await name.fill('draft'); await dialog(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await open(page); await expect(name).toHaveValue('Portfolio A');
  await name.fill('  Portfolio A  '); await name.press('Enter'); await expect(dialog(page)).toHaveCount(0);
  await open(page);
  for (const value of ['', '   ']) {
    await name.fill(value); await dialog(page).getByRole('button', { name: 'บันทึกชื่อ', exact: true }).click();
    await expect(dialog(page).getByRole('alert')).toHaveText('กรุณาตั้งชื่อ Portfolio');
    await expect(name).toHaveAttribute('aria-invalid', 'true'); await expect(name).toHaveAttribute('aria-describedby', 'rename-error');
  }
  expect(updates).toBe(0); await expect(card(page).getByRole('heading')).toHaveText('Portfolio A');
});

for (const failure of ['backend', 'network', 'no-row', 'malformed'] as const) {
  test(`${failure}: failure keeps draft and old card, safe error and retry succeeds`, async ({ page }) => {
    await dashboard(page); await open(page);
    const name = dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }); await name.fill('ชื่อที่ลองใหม่');
    await page.route('**/rest/v1/portfolios?**', route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      if (failure === 'network') return route.abort('failed');
      return route.fulfill({ status: failure === 'backend' ? 500 : 200, json: failure === 'backend' ? { message: internal } : failure === 'no-row' ? null : { id: 'b', title: 'wrong', user_id: user.id, updated_at: null } });
    });
    await name.press('Enter');
    await expect(dialog(page).getByRole('alert')).toHaveText(failureText);
    await expect(page.locator('body')).not.toContainText(internal);
    await expect(name).toHaveValue('ชื่อที่ลองใหม่'); await expect(name).toBeEnabled();
    await expect(card(page).getByRole('heading')).toHaveText('Portfolio A');
    await expect(page.getByText('เปลี่ยนชื่อพอร์ตแล้ว', { exact: true })).toHaveCount(0);
    await page.unroute('**/rest/v1/portfolios?**'); await name.press('Enter');
    await expect(dialog(page)).toHaveCount(0); await expect(card(page).getByRole('heading')).toHaveText('ชื่อที่ลองใหม่');
  });
}

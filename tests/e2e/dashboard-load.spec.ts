import { test, expect } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const copy = 'โหลดรายการพอร์ตไม่สำเร็จ กรุณาลองอีกครั้ง';
const internal = 'PRIVATE_SQL_PERMISSION_CONSTRAINT_42501';
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});
test('successful list and genuinely empty list show confirmed counts only', async ({ page }) => {
  await page.goto('/dashboard'); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
  await expect(page.locator('article[data-portfolio-id]')).toHaveCount(2);
  await page.route('**/rest/v1/portfolios?**', route => route.fulfill({ json: [] }));
  await page.reload(); await expect(page.getByText('มีทั้งหมด 0 Portfolio')).toBeVisible();
  await expect(page.getByText('ยังไม่มีพอร์ต', { exact: false })).toBeVisible();
});
for (const kind of ['backend', 'network', 'null', 'object', 'bad-row'] as const) {
  test(`${kind}: failure is safe and never zero, repeated retry can succeed`, async ({ page }) => {
    await page.route('**/rest/v1/portfolios?**', route => {
      if (kind === 'network') return route.abort('failed');
      return route.fulfill({ status: kind === 'backend' ? 500 : 200, json: kind === 'backend' ? { message: internal } : kind === 'null' ? null : kind === 'object' ? {} : [{ id: 'a', title: 7 }] });
    });
    await page.goto('/dashboard');
    await expect(page.locator('main').getByRole('alert')).toHaveText(copy, { timeout: 20000 });
    await expect(page.getByText(/มีทั้งหมด/)).toHaveCount(0); await expect(page.getByText('ยังไม่มีพอร์ต', { exact: false })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(internal); await expect(page).toHaveURL(/dashboard$/);
    await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText(copy, { timeout: 20000 });
    await page.unroute('**/rest/v1/portfolios?**'); await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible(); await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  });
}

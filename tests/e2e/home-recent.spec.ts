import { test, expect, type Page } from '@playwright/test';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const internal = 'PRIVATE_HOME_SQL_CONSTRAINT_AUTH_42501';
const listError = 'โหลดรายการพอร์ตล่าสุดไม่สำเร็จ กรุณาลองอีกครั้ง';
const authError = 'ยืนยันบัญชีผู้ใช้ไม่สำเร็จ กรุณาลองตรวจสอบบัญชีอีกครั้ง';
const empty = 'ยังไม่มีพอร์ต เริ่มสร้างพอร์ตแรกของคุณได้เลย';
const recent = (page: Page) => page.getByRole('region', { name: 'พอร์ตล่าสุด', exact: true });
const cards = (page: Page) => recent(page).locator('[data-recent-portfolio-id]');
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('Home confirms owner/select/order/limit and only genuine [] is empty', async ({ page }) => {
  let reads = 0;
  await page.route('**/rest/v1/portfolios?**', route => {
    const url = new URL(route.request().url()); reads++;
    expect(url.searchParams.get('select')).toBe('id,title,template_key,created_at,updated_at');
    expect(url.searchParams.get('user_id')).toBe(`eq.${user.id}`);
    expect(url.searchParams.get('order')).toBe('updated_at.desc'); expect(url.searchParams.get('limit')).toBe('3');
    return route.continue();
  });
  await page.goto('/'); await expect(cards(page)).toHaveCount(2); expect(reads).toBe(1);
  await expect(recent(page).getByText(empty)).toHaveCount(0);
  await expect(recent(page).getByRole('link', { name: 'ดูทั้งหมด →' })).toHaveAttribute('href', '/dashboard');
  await page.unroute('**/rest/v1/portfolios?**'); await page.route('**/rest/v1/portfolios?**', route => route.fulfill({ json: [] }));
  await page.reload(); await expect(recent(page).getByRole('status')).toHaveText(empty); await expect(cards(page)).toHaveCount(0);
});

test('guest Home stays public without a private list query or false empty', async ({ page, context }) => {
  await context.clearCookies(); let reads = 0;
  page.on('request', r => { if (new URL(r.url()).pathname === '/rest/v1/portfolios') reads++; });
  await page.goto('/'); await expect(recent(page).getByRole('status')).toHaveText('เข้าสู่ระบบเพื่อดูพอร์ตล่าสุดของคุณ');
  expect(reads).toBe(0); await expect(page).toHaveURL(/\/$/); await expect(recent(page).getByText(empty)).toHaveCount(0);
  await expect(recent(page).getByRole('button', { name: 'สร้างผลงานใหม่' })).toBeEnabled();
});

for (const kind of ['backend', 'network', 'null', 'object', 'bad-row'] as const) {
  test(`${kind}: Home list failure is not empty; retry fails then recovers without auth/reload`, async ({ page }) => {
    let auth = 0, reads = 0, operations = 0;
    page.on('request', r => { if (new URL(r.url()).pathname === '/auth/v1/user') auth++; });
    await page.route('**/rest/v1/portfolios?**', route => {
      reads++;
      // Count logical requests separately from the installed SDK's sequential
      // transport retries (X-Retry-Count); do not disable its retry policy.
      if (!route.request().headers()['x-retry-count']) operations++;
      if (kind === 'network') return route.abort('failed');
      return route.fulfill({ status: kind === 'backend' ? 500 : 200, json: kind === 'backend' ? { message: internal } : kind === 'null' ? null : kind === 'object' ? {} : [{ id: 'a', title: 7 }] });
    });
    await page.goto('/'); await expect(recent(page).getByRole('alert')).toHaveText(listError, { timeout: 20000 });
    const verified = auth; expect(verified).toBe(1);
    await expect(recent(page).getByText(empty)).toHaveCount(0); await expect(page.locator('body')).not.toContainText(internal);
    await page.evaluate(() => { document.body.dataset.homeLifetime = 'same-page'; });
    await recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect(recent(page).getByRole('alert')).toHaveText(listError, { timeout: 20000 });
    expect(operations).toBe(2); expect(reads).toBe(kind === 'network' ? 8 : 2);
    await page.unroute('**/rest/v1/portfolios?**'); await recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect(cards(page)).toHaveCount(2); expect(auth).toBe(verified);
    expect(await page.locator('body').getAttribute('data-home-lifetime')).toBe('same-page'); await expect(page).toHaveURL(/\/$/);
  });
}

for (const kind of ['backend', 'network'] as const) {
  test(`${kind}: auth failure stays separate from guest/list failure and explicit auth retry recovers`, async ({ page }) => {
    let reads = 0;
    page.on('request', r => { if (new URL(r.url()).pathname === '/rest/v1/portfolios') reads++; });
    await page.route('**/auth/v1/user', route => kind === 'network' ? route.abort('failed') : route.fulfill({ status: 500, json: { message: internal } }));
    await page.goto('/'); await expect(recent(page).getByRole('alert')).toHaveText(authError, { timeout: 20000 });
    expect(reads).toBe(0); await expect(recent(page).getByText(empty)).toHaveCount(0);
    await expect(recent(page).getByText('เข้าสู่ระบบเพื่อดูพอร์ตล่าสุดของคุณ')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(internal); await expect(page).toHaveURL(/\/$/);
    await page.unroute('**/auth/v1/user'); await recent(page).getByRole('button', { name: 'ตรวจสอบบัญชีอีกครั้ง', exact: true }).click();
    await expect(cards(page)).toHaveCount(2); expect(reads).toBe(1);
  });
}

test('Home list retry locks same-turn duplicates until its response settles', async ({ page }) => {
  let reads = 0, release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (++reads === 1) return route.fulfill({ status: 500, json: { message: internal } });
    await gate; await route.fulfill({ response: await route.fetch() });
  });
  await page.goto('/'); await expect(recent(page).getByRole('alert')).toHaveText(listError);
  await recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }).evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected retry button'); button.click(); button.click();
  });
  await expect.poll(() => reads).toBe(2); await expect(recent(page).getByRole('button', { name: 'กำลังโหลด…', exact: true })).toBeDisabled();
  release(); await expect(cards(page)).toHaveCount(2); expect(reads).toBe(2);
});

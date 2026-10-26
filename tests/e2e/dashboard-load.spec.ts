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

test('retry deduplicates before React commit and preserves open create name/template through failure and success', async ({ page }) => {
  let reads = 0; let release = () => {}; let gate: Promise<void>;
  const hold = () => { gate = new Promise<void>(resolve => { release = resolve; }); };
  hold();
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    expect(new URL(route.request().url()).searchParams.get('user_id')).toBe(`eq.${user.id}`);
    const attempt = ++reads;
    if (attempt > 1) await gate;
    if (attempt <= 2) return route.fulfill({ status: 500, json: { message: internal } });
    return route.fulfill({ response: await route.fetch() });
  });
  await page.goto('/dashboard'); await expect(page.locator('main').getByRole('alert')).toHaveText(copy);
  await page.getByRole('button', { name: 'ลองใหม่', exact: true }).evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected retry button');
    button.click(); button.click();
  });
  await expect.poll(() => reads).toBe(2); await expect(page.getByRole('button', { name: 'กำลังโหลด…', exact: true })).toBeDisabled();
  await expect(page.getByText(/มีทั้งหมด/)).toHaveCount(0);
  await page.getByRole('button', { name: 'สร้าง Portfolio ใหม่', exact: false }).click();
  const input = page.getByPlaceholder('เช่น Portfolio สมัครมหาวิทยาลัย'); await input.fill('draft through retry');
  await page.getByRole('button', { name: /Gallery Editorial/ }).click();
  release(); await expect(page.locator('main').getByRole('alert')).toHaveText(copy); await expect(input).toHaveValue('draft through retry');
  hold();
  // Exercise background loader state while the existing create overlay stays mounted.
  await page.getByRole('button', { name: 'ลองใหม่', exact: true }).evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected retry button'); button.click();
  });
  await expect.poll(() => reads).toBe(3); await expect(input).toHaveValue('draft through retry');
  release(); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible(); await expect(input).toHaveValue('draft through retry');
  const insert = page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios');
  await page.getByRole('button', { name: 'สร้าง Portfolio', exact: true }).click();
  expect((await insert).postDataJSON()).toEqual({ title: 'draft through retry', template_key: 'minimal', user_id: user.id });
  await expect(page).toHaveURL(/editor\?portfolio=/);
});

for (const phase of ['initial', 'retry'] as const) for (const destination of ['account', 'navigation'] as const) {
  test(`late ${phase} response after ${destination} is ignored`, async ({ page }) => {
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let reads = 0; let started = false; let settled = false;
    await page.route('**/rest/v1/portfolios?**', async route => {
      if (route.request().method() !== 'GET') return route.continue();
      reads++;
      if (phase === 'retry' && reads === 1) return route.fulfill({ status: 500, json: { message: internal } });
      started = true; await gate;
      await route.fulfill(phase === 'retry' ? { status: 500, json: { message: internal } } : { json: [{ id: 'old', title: 'OLD SNAPSHOT', template_key: null, created_at: null, updated_at: null }] });
      settled = true;
    });
    await page.goto('/dashboard');
    if (phase === 'retry') { await expect(page.locator('main').getByRole('alert')).toHaveText(copy); await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click(); }
    await expect.poll(() => started).toBe(true);
    if (destination === 'account') {
      await page.evaluate(user => { const channel = new BroadcastChannel('sb-127-auth-token'); channel.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); channel.close(); }, user);
      await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
    } else {
      await page.getByRole('link', { name: 'คลังข้อมูลของฉัน', exact: true }).click(); await expect(page).toHaveURL(/my-data$/);
    }
    release(); await expect.poll(() => settled).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('body')).not.toContainText('OLD SNAPSHOT'); await expect(page.locator('body')).not.toContainText(internal);
    await expect(page.getByText(copy, { exact: true })).toHaveCount(0);
    if (destination === 'navigation') {
      await page.unroute('**/rest/v1/portfolios?**'); await page.goto('/dashboard'); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
    } else await expect(page.locator('article[data-portfolio-id]')).toHaveCount(0);
  });
}

test('auth verification error is separate from list error and sends no portfolio query', async ({ page }) => {
  let reads = 0; page.on('request', r => { if (new URL(r.url()).pathname === '/rest/v1/portfolios') reads++; });
  await page.route('**/auth/v1/user', route => route.fulfill({ status: 500, json: { message: internal } }));
  await page.goto('/dashboard');
  await expect(page.getByText('ยืนยันบัญชีผู้ใช้ไม่สำเร็จ กรุณาเปิด Dashboard ใหม่', { exact: false })).toBeVisible({ timeout: 20000 });
  expect(reads).toBe(0); await expect(page.getByText(copy, { exact: true })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(internal); await expect(page).toHaveURL(/dashboard$/);
});

test('confirmed rename after a recovered list is not undone by reads or retry clicks', async ({ page }) => {
  let reads = 0;
  await page.route('**/rest/v1/portfolios?**', route => {
    if (route.request().method() === 'GET' && ++reads === 1) return route.fulfill({ status: 500, json: { message: internal } });
    return route.continue();
  });
  await page.goto('/dashboard'); await expect(page.locator('main').getByRole('alert')).toHaveText(copy);
  await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click(); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
  await page.locator('article[data-portfolio-id=a]').getByRole('button', { name: /^เปลี่ยนชื่อ / }).click();
  await page.getByRole('dialog').getByLabel('ชื่อพอร์ต', { exact: true }).fill('confirmed name');
  await page.getByRole('dialog').getByLabel('ชื่อพอร์ต', { exact: true }).press('Enter'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('article[data-portfolio-id=a] h3')).toHaveText('confirmed name');
  await expect(page.getByRole('button', { name: 'ลองใหม่', exact: true })).toHaveCount(0);
  expect(reads).toBe(2);
  await page.reload(); await expect(page.locator('article[data-portfolio-id=a] h3')).toHaveText('confirmed name');
});

for (const width of [1440, 390]) {
  test(`${width}px: safe error/retry fits and works with keyboard`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); let reads = 0;
    await page.route('**/rest/v1/portfolios?**', route => { reads++; return route.fulfill({ status: 500, json: { message: internal.repeat(100) } }); });
    await page.goto('/dashboard'); const alert = page.locator('main').getByRole('alert'); await expect(alert).toHaveText(copy);
    const retry = page.getByRole('button', { name: 'ลองใหม่', exact: true }); await retry.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await alert.boundingBox(); expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await retry.focus(); await expect(retry).toBeFocused(); await page.screenshot({ path: testInfo.outputPath(`dashboard-error-${width}.png`) });
    await retry.press('Enter'); await expect.poll(() => reads).toBe(2); await expect(alert).toHaveText(copy);
    await page.unroute('**/rest/v1/portfolios?**'); await retry.press('Enter'); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
  });
}

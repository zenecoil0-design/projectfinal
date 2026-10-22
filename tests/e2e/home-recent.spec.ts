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

test('Home create shortcuts open a new-portfolio dialog instead of an ID-less editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('button', { name: 'เริ่มสร้าง Portfolio', exact: true }).click();
  const createDialog = page.getByRole('dialog', { name: 'สร้าง Portfolio ใหม่', exact: true });
  await expect(createDialog).toBeVisible();
  await expect(page).toHaveURL(/\\/$/);
  await createDialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(createDialog).toHaveCount(0);
  await page.locator('header').getByRole('button', { name: 'สร้างผลงานใหม่', exact: true }).click();
  await expect(createDialog).toBeVisible();
  await expect(page).toHaveURL(/\\/$/);
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

async function authEvent(page: Page, event: string, id: string | null) {
  await page.evaluate(({ event, id, user }) => {
    const channel = new BroadcastChannel('sb-127-auth-token');
    channel.postMessage({ event, session: id === null ? null : { user: { ...user, id } } }); channel.close();
  }, { event, id, user });
}
const row = (id: string, title: string) => ({ id, title, template_key: null, created_at: null, updated_at: null });
async function settledFrame(page: Page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }

test('confirmed Home cards clear on owner switch; only explicit verified B reads may return', async ({ page }) => {
  await page.goto('/'); await expect(cards(page)).toHaveCount(2); let auth = 0, reads = 0;
  await page.route('**/auth/v1/user', route => { auth++; return route.fulfill({ json: { ...user, id: 'account-b' } }); });
  await page.route('**/rest/v1/portfolios?**', route => {
    reads++; expect(new URL(route.request().url()).searchParams.get('user_id')).toBe('eq.account-b');
    return route.fulfill({ json: [row('new', 'NEW OWNER')] });
  });
  await authEvent(page, 'SIGNED_IN', 'account-b'); await expect(cards(page)).toHaveCount(0);
  await expect(recent(page).getByRole('status')).toContainText('บัญชีผู้ใช้เปลี่ยนแล้ว'); expect(auth).toBe(0); expect(reads).toBe(0);
  await recent(page).getByRole('button', { name: 'ตรวจสอบบัญชีอีกครั้ง', exact: true }).click();
  await expect(recent(page).getByRole('heading', { name: 'NEW OWNER' })).toBeVisible(); expect(auth).toBe(1); expect(reads).toBe(1);
  await expect(recent(page).getByRole('heading', { name: 'Portfolio A' })).toHaveCount(0);
});

test('getUser owner mismatch without an event never queries private Home cards', async ({ page }) => {
  let reads = 0; page.on('request', r => { if (new URL(r.url()).pathname === '/rest/v1/portfolios') reads++; });
  await page.route('**/auth/v1/user', route => route.fulfill({ json: { ...user, id: 'account-b' } }));
  await page.goto('/'); await expect(recent(page).getByRole('status')).toContainText('บัญชีผู้ใช้เปลี่ยนแล้ว');
  expect(reads).toBe(0); await expect(cards(page)).toHaveCount(0); await expect(page).toHaveURL(/\/$/);
});

for (const phase of ['auth', 'list', 'retry'] as const) for (const destination of ['account', 'navigation'] as const) {
  test(`Home late ${phase} after ${destination} cannot overwrite a newer page/session`, async ({ page }) => {
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    let started = false, settled = false, oldReads = 0, nextReads = 0;
    await page.route('**/auth/v1/user', async route => {
      if (phase === 'auth' && !started) { started = true; await gate; await route.fulfill({ json: user }); settled = true; return; }
      return route.fulfill({ json: destination === 'account' ? { ...user, id: 'account-b' } : user });
    });
    // In list/retry cases initial getUser must verify account A, not the future B.
    if (phase !== 'auth') await page.unroute('**/auth/v1/user');
    await page.route('**/rest/v1/portfolios?**', async route => {
      const url = new URL(route.request().url()); if (url.searchParams.get('limit') !== '3') return route.continue();
      if (url.searchParams.get('user_id') === 'eq.account-b') { nextReads++; return route.fulfill({ json: [row('new', 'NEW OWNER')] }); }
      oldReads++;
      if (phase === 'auth') return route.fulfill({ json: [row('old', 'OLD PRIVATE SNAPSHOT')] });
      if (phase === 'retry' && oldReads === 1) return route.fulfill({ status: 500, json: { message: internal } });
      started = true; await gate;
      await route.fulfill(phase === 'retry' ? { status: 500, json: { message: internal } } : { json: [row('old', 'OLD PRIVATE SNAPSHOT')] }); settled = true;
    });
    await page.goto('/');
    if (phase === 'retry') { await expect(recent(page).getByRole('alert')).toHaveText(listError); await recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }).click(); }
    await expect.poll(() => started).toBe(true);
    await expect(recent(page).getByRole('status')).toHaveText(phase === 'auth' ? 'กำลังตรวจสอบบัญชีผู้ใช้…' : 'กำลังโหลดรายการพอร์ต…');
    if (destination === 'account') {
      if (phase !== 'auth') await page.route('**/auth/v1/user', route => route.fulfill({ json: { ...user, id: 'account-b' } }));
      await authEvent(page, 'SIGNED_IN', 'account-b');
      await expect(recent(page).getByRole('status')).toContainText('บัญชีผู้ใช้เปลี่ยนแล้ว'); await expect(cards(page)).toHaveCount(0);
      expect(nextReads).toBe(0); // No automatic read from an unverified event.
      await recent(page).getByRole('button', { name: 'ตรวจสอบบัญชีอีกครั้ง', exact: true }).click();
      await expect(recent(page).getByRole('heading', { name: 'NEW OWNER' })).toBeVisible(); expect(nextReads).toBe(1);
    } else {
      await page.getByRole('link', { name: 'ไปหน้า Dashboard', exact: true }).click(); await expect(page).toHaveURL(/dashboard$/);
      await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
    }
    release(); await expect.poll(() => settled).toBe(true); await settledFrame(page);
    await expect(page.locator('body')).not.toContainText('OLD PRIVATE SNAPSHOT'); await expect(page.locator('body')).not.toContainText(internal);
    await expect(page.getByText(listError, { exact: true })).toHaveCount(0);
    if (destination === 'account') {
      await expect(cards(page)).toHaveCount(1); await expect(recent(page).getByRole('heading', { name: 'NEW OWNER' })).toBeVisible();
      expect(oldReads).toBe(phase === 'auth' ? 0 : phase === 'retry' ? 2 : 1);
    } else await expect(page).toHaveURL(/dashboard$/);
  });
}

test('signout clears confirmed cards and account-bound create draft immediately, without a read or redirect', async ({ page }) => {
  await page.goto('/'); await expect(cards(page)).toHaveCount(2); let reads = 0;
  page.on('request', r => { if (new URL(r.url()).pathname === '/rest/v1/portfolios') reads++; });
  await recent(page).getByRole('button', { name: 'สร้างผลงานใหม่' }).click();
  const dialog = page.getByRole('dialog', { name: 'สร้าง Portfolio ใหม่', exact: true });
  await dialog.getByLabel('ชื่อ Portfolio', { exact: true }).fill('old owner draft'); await dialog.getByRole('button', { name: /Minimal/ }).click();
  await authEvent(page, 'SIGNED_OUT', null); await expect(dialog).toHaveCount(0); await expect(cards(page)).toHaveCount(0);
  await expect(recent(page).getByRole('status')).toHaveText('เข้าสู่ระบบเพื่อดูพอร์ตล่าสุดของคุณ'); expect(reads).toBe(0); await expect(page).toHaveURL(/\/$/);
  await recent(page).getByRole('button', { name: 'สร้างผลงานใหม่' }).click(); await expect(dialog.getByLabel('ชื่อ Portfolio', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('button', { name: /Emerald Editorial/ })).toHaveAttribute('aria-pressed', 'true');
});

test('a retry response after signout cannot restore private cards or its error', async ({ page }) => {
  let reads = 0, started = false, settled = false, release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (++reads === 1) return route.fulfill({ status: 500, json: { message: internal } });
    started = true; await gate; await route.fulfill({ json: [row('old', 'OLD PRIVATE SNAPSHOT')] }); settled = true;
  });
  await page.goto('/'); await expect(recent(page).getByRole('alert')).toHaveText(listError);
  await recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }).click(); await expect.poll(() => started).toBe(true);
  await authEvent(page, 'SIGNED_OUT', null); await expect(recent(page).getByRole('status')).toHaveText('เข้าสู่ระบบเพื่อดูพอร์ตล่าสุดของคุณ');
  release(); await expect.poll(() => settled).toBe(true); await settledFrame(page);
  await expect(cards(page)).toHaveCount(0); await expect(recent(page).getByRole('alert')).toHaveCount(0); await expect(page.locator('body')).not.toContainText('OLD PRIVATE SNAPSHOT');
});

test('Home retry failure/success and same-owner refresh preserve mounted create name/template', async ({ page }) => {
  let reads = 0, auth = 0, release = () => {}; let gate: Promise<void>;
  const hold = () => { gate = new Promise<void>(resolve => { release = resolve; }); }; hold();
  page.on('request', r => { if (new URL(r.url()).pathname === '/auth/v1/user') auth++; });
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const attempt = ++reads; if (attempt > 1) await gate;
    if (attempt <= 2) return route.fulfill({ status: 500, json: { message: internal } });
    return route.fulfill({ response: await route.fetch() });
  });
  await page.goto('/'); await expect(recent(page).getByRole('alert')).toHaveText(listError);
  await recent(page).getByRole('button', { name: 'สร้างผลงานใหม่' }).click();
  const dialog = page.getByRole('dialog', { name: 'สร้าง Portfolio ใหม่', exact: true }); const input = dialog.getByLabel('ชื่อ Portfolio', { exact: true });
  await input.fill('draft through Home retry'); await dialog.getByRole('button', { name: /Minimal/ }).click();
  const backgroundRetry = async () => recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }).evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected retry button'); button.click(); button.click();
  });
  await backgroundRetry(); await expect.poll(() => reads).toBe(2); await expect(input).toHaveValue('draft through Home retry');
  release(); await expect(recent(page).getByRole('alert')).toHaveText(listError); await expect(input).toHaveValue('draft through Home retry');
  hold(); await backgroundRetry(); await expect.poll(() => reads).toBe(3); release(); await expect(cards(page)).toHaveCount(2);
  await authEvent(page, 'TOKEN_REFRESHED', user.id); await settledFrame(page);
  await expect(cards(page)).toHaveCount(2); await expect(input).toHaveValue('draft through Home retry');
  await expect(dialog.getByRole('button', { name: /Minimal/ })).toHaveAttribute('aria-pressed', 'true'); expect(reads).toBe(3); expect(auth).toBe(1);
  const sent = page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios');
  await dialog.getByRole('button', { name: 'สร้าง Portfolio', exact: true }).click();
  expect((await sent).postDataJSON()).toEqual({ user_id: user.id, title: 'draft through Home retry', template_key: 'minimal' });
  await expect(page).toHaveURL(/editor\?portfolio=/);
});

test('explicit Home auth retry locks duplicate verification before React commit', async ({ page }) => {
  let calls = 0, release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/auth/v1/user', async route => {
    if (++calls === 1) return route.fulfill({ status: 500, json: { message: internal } });
    await gate; await route.fulfill({ json: user });
  });
  await page.goto('/'); await expect(recent(page).getByRole('alert')).toHaveText(authError);
  await recent(page).getByRole('button', { name: 'ตรวจสอบบัญชีอีกครั้ง', exact: true }).evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected auth retry button'); button.click(); button.click();
  });
  await expect.poll(() => calls).toBe(2); await expect(recent(page).getByRole('button', { name: 'กำลังตรวจสอบ…', exact: true })).toBeDisabled();
  release(); await expect(cards(page)).toHaveCount(2); expect(calls).toBe(2);
});

for (const width of [1440, 390]) {
  test(`${width}px: Home error/retry fits and responds to keyboard`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/rest/v1/portfolios?**', route => route.fulfill({ status: 500, json: { message: internal.repeat(100) } }));
    await page.goto('/'); const alert = recent(page).getByRole('alert'); await expect(alert).toHaveText(listError);
    const retry = recent(page).getByRole('button', { name: 'ลองใหม่', exact: true }); await retry.scrollIntoViewIfNeeded(); await retry.focus(); await expect(retry).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await alert.boundingBox(); expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`home-error-${width}.png`) });
    await page.unroute('**/rest/v1/portfolios?**'); await retry.press('Enter'); await expect(cards(page)).toHaveCount(2);
    await expect(page.locator('body')).not.toContainText(internal);
    await recent(page).locator('[data-recent-portfolio-id="a"]').click(); await expect(page).toHaveURL(/editor\?portfolio=a$/);
  });
}

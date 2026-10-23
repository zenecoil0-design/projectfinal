import { test, expect, type Page } from '@playwright/test';
import { createAuthError, createResultError } from '../../src/lib/portfolio-create';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const internal = 'PRIVATE_SQL_AUTH_CONSTRAINT_SECRET_42501';
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});
const modal = (page: Page) => page.getByRole('dialog', { name: 'สร้าง Portfolio ใหม่', exact: true });
const name = (page: Page) => modal(page).getByLabel('ชื่อ Portfolio', { exact: true });
const submit = (page: Page) => modal(page).getByRole('button', { name: 'สร้าง Portfolio', exact: true });
async function dashboard(page: Page) {
  await page.goto('/dashboard'); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
  await page.getByRole('button', { name: 'สร้าง Portfolio ใหม่', exact: false }).click();
}
async function draft(page: Page) { await name(page).fill('  พอร์ต Science  '); await modal(page).getByRole('button', { name: /Minimal/ }).click(); }

test('mobile create portfolio dialog has readable text and touch-sized close control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('main').getByRole('button', { name: 'เริ่มสร้าง Portfolio', exact: true }).click();
  const nameInput = name(page);
  await expect(nameInput).toBeVisible();
  await expect(nameInput).toHaveCSS('font-size', '16px');
  const close = modal(page).getByRole('button', { name: 'ปิดกล่องสร้างพอร์ต' });
  const size = await close.boundingBox();
  expect(size).not.toBeNull();
  expect(size!.width).toBeGreaterThanOrEqual(44);
  expect(size!.height).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(nameInput).toHaveCSS('font-size', '14px');
});

test('confirmed create sends the captured trimmed payload and opens only its returned ID', async ({ page }) => {
  await dashboard(page); await draft(page);
  const request = page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios');
  await submit(page).click(); const sent = await request;
  expect(sent.postDataJSON()).toEqual({ user_id: user.id, title: 'พอร์ต Science', template_key: 'minimal' });
  expect(new URL(sent.url()).searchParams.get('select')).toBe('id,user_id,title,template_key');
  const response = await sent.response(); const row: { id: string } = await response!.json();
  await expect(page).toHaveURL(new RegExp(`editor\\?portfolio=${row.id}$`));
  await expect(page.getByText('พอร์ต Science', { exact: true })).toBeVisible();
});

test('blank validation does not insert and normal close/reopen keeps editable draft', async ({ page }) => {
  await dashboard(page); let inserts = 0;
  page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios') inserts++; });
  for (const value of ['', '   ']) { await name(page).fill(value); await submit(page).click(); await expect(modal(page).getByRole('alert')).toHaveText('กรุณาตั้งชื่อ Portfolio'); }
  expect(inserts).toBe(0); await draft(page); await modal(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await page.getByRole('button', { name: 'สร้าง Portfolio ใหม่', exact: false }).click();
  await expect(name(page)).toHaveValue('  พอร์ต Science  '); await expect(modal(page).getByRole('button', { name: /Minimal/ })).toHaveAttribute('aria-pressed', 'true');
});

test('same-turn double click inserts once and pending snapshot cannot be edited or closed', async ({ page }) => {
  await dashboard(page); await draft(page);
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let inserts = 0;
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    inserts++; expect(route.request().postDataJSON()).toEqual({ user_id: user.id, title: 'พอร์ต Science', template_key: 'minimal' });
    await gate; await route.fulfill({ response: await route.fetch() });
  });
  await submit(page).evaluate(button => { if (!(button instanceof HTMLButtonElement)) throw new Error('Expected create button'); button.click(); button.click(); });
  await expect.poll(() => inserts).toBe(1); await expect(name(page)).toBeDisabled();
  for (const text of [/Classic/, /Emerald Editorial/, /Minimal/]) await expect(modal(page).getByRole('button', { name: text })).toBeDisabled();
  await expect(modal(page).getByRole('button', { name: 'ยกเลิก', exact: true })).toBeDisabled();
  await expect(modal(page).getByRole('button', { name: 'ปิดกล่องสร้างพอร์ต', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(modal(page)).toBeVisible(); await expect(modal(page).getByRole('status')).toBeVisible();
  release(); await expect(page).toHaveURL(/editor\?portfolio=/); expect(inserts).toBe(1);
});

for (const failure of ['backend', 'network', 'empty', 'malformed'] as const) {
  test(`${failure}: uncertain create keeps draft, does not navigate/retry automatically, manual retry succeeds`, async ({ page }) => {
    await dashboard(page); await draft(page); let inserts = 0;
    page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios') inserts++; });
    await page.route('**/rest/v1/portfolios?**', route => {
      if (route.request().method() !== 'POST') return route.continue();
      if (failure === 'network') return route.abort('failed');
      return route.fulfill({ status: failure === 'backend' ? 500 : 200, json: failure === 'backend' ? { message: internal } : failure === 'empty' ? null : { id: 7, ...route.request().postDataJSON() } });
    });
    await submit(page).click(); await expect(modal(page).getByRole('alert')).toHaveText(createResultError);
    await expect(page.locator('body')).not.toContainText(internal); await expect(page).toHaveURL(/dashboard$/);
    await expect(name(page)).toHaveValue('  พอร์ต Science  '); await expect(name(page)).toBeEnabled();
    await expect(modal(page).getByRole('button', { name: /Minimal/ })).toHaveAttribute('aria-pressed', 'true'); expect(inserts).toBe(1);
    await page.unroute('**/rest/v1/portfolios?**'); await submit(page).click(); await expect(page).toHaveURL(/editor\?portfolio=/); expect(inserts).toBe(2);
  });
}

for (const failure of ['backend', 'network'] as const) {
  test(`auth ${failure} is not a missing user: safe error/draft and no login or insert`, async ({ page }) => {
    await dashboard(page); await draft(page); let inserts = 0;
    page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios') inserts++; });
    await page.route('**/auth/v1/user', route => failure === 'network' ? route.abort('failed') : route.fulfill({ status: 500, json: { message: internal } }));
    await submit(page).click(); await expect(modal(page).getByRole('alert')).toHaveText(createAuthError, { timeout: 20000 });
    await expect(name(page)).toHaveValue('  พอร์ต Science  '); await expect(modal(page).getByRole('button', { name: /Minimal/ })).toHaveAttribute('aria-pressed', 'true');
    expect(inserts).toBe(0); await expect(page).toHaveURL(/dashboard$/); await expect(page.locator('body')).not.toContainText(internal);
    await page.unroute('**/auth/v1/user'); await submit(page).click(); await expect(page).toHaveURL(/editor\?portfolio=/);
  });
}

type Caller = 'dashboard' | 'sidebar' | 'recent';
function trigger(page: Page, caller: Caller) {
  return caller === 'sidebar' ? page.locator('aside').getByRole('button', { name: 'สร้าง', exact: true })
    : caller === 'recent' ? page.getByRole('region', { name: 'พอร์ตล่าสุด', exact: true }).getByRole('button', { name: 'สร้างผลงานใหม่', exact: false })
    : page.getByRole('button', { name: 'สร้าง Portfolio ใหม่', exact: false });
}
async function openCaller(page: Page, caller: Caller, history = false) {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (caller === 'dashboard') {
    if (history) { await page.goto('/'); await page.getByRole('banner').getByRole('link', { name: 'ไปหน้า Dashboard', exact: true }).click(); }
    else await page.goto('/dashboard');
    await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible();
  } else {
    if (history) { await page.goto('/dashboard'); await expect(page.getByText('มีทั้งหมด 2 Portfolio')).toBeVisible(); await page.getByRole('link', { name: /Auto - Portfolio/ }).click(); }
    else await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Portfolio A', exact: true })).toBeVisible();
  }
  await trigger(page, caller).click(); await expect(modal(page)).toBeVisible();
}

for (const caller of ['sidebar', 'recent'] as const) {
  test(`${caller}: shared create succeeds independently of Dashboard`, async ({ page }) => {
    await openCaller(page, caller); await draft(page); await submit(page).click();
    await expect(page).toHaveURL(/editor\?portfolio=/); await expect(page.getByText('พอร์ต Science', { exact: true })).toBeVisible();
  });
  test(`${caller}: genuinely missing session preserves the existing login destination`, async ({ page, context }) => {
    await context.clearCookies(); await page.goto('/'); await trigger(page, caller).click(); await draft(page);
    let inserts = 0; page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios') inserts++; });
    await submit(page).click(); await expect(page).toHaveURL(/login\?next=(%2F|\/)$/); expect(inserts).toBe(0);
  });
}

for (const caller of ['dashboard', 'sidebar', 'recent'] as const) for (const phase of ['auth', 'insert'] as const) for (const destination of ['account', 'navigation'] as const) {
  test(`${caller}: old ${phase} result after ${destination} cannot insert/navigate/show error in a new round`, async ({ page }) => {
    await openCaller(page, caller, destination === 'navigation'); await draft(page);
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    let started = false; let settled = false; let inserts = 0;
    page.on('request', r => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios') {
        inserts++; expect(r.postDataJSON()).toEqual({ user_id: user.id, title: 'พอร์ต Science', template_key: 'minimal' });
      }
    });
    await page.route(phase === 'auth' ? '**/auth/v1/user' : '**/rest/v1/portfolios?**', async route => {
      if (started || (phase === 'insert' && route.request().method() !== 'POST')) return route.continue();
      started = true; await gate;
      if (phase === 'auth') await route.fulfill({ json: user });
      else if (destination === 'account') await route.fulfill({ status: 500, json: { message: internal } });
      else await route.fulfill({ response: await route.fetch() });
      settled = true;
    });
    await submit(page).click(); await expect.poll(() => started).toBe(true);
    if (destination === 'account') {
      await page.evaluate(user => { const channel = new BroadcastChannel('sb-127-auth-token'); channel.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); channel.close(); }, user);
      await expect(modal(page)).toHaveCount(0);
      if (caller !== 'dashboard') {
        await trigger(page, caller).click(); await expect(name(page)).toHaveValue('');
        await expect(modal(page).getByRole('button', { name: /Emerald Editorial/ })).toHaveAttribute('aria-pressed', 'true');
        await name(page).fill('new account draft');
      } else await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
    } else {
      await page.goBack(); await expect(page).toHaveURL(caller === 'dashboard' ? /\/$/ : /dashboard$/);
    }
    release(); await expect.poll(() => settled).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(inserts).toBe(phase === 'auth' ? 0 : 1);
    await expect(page.locator('body')).not.toContainText(internal);
    await expect(page.getByText(createResultError, { exact: true })).toHaveCount(0);
    if (destination === 'account' && caller !== 'dashboard') {
      await expect(name(page)).toHaveValue('new account draft'); await expect(submit(page)).toBeEnabled();
      await expect(page).toHaveURL(/\/$/);
    } else if (destination === 'navigation') await expect(page).toHaveURL(caller === 'dashboard' ? /\/$/ : /dashboard$/);
  });
}

test('verified owner mismatch without an auth event discards old draft before any insert', async ({ page }) => {
  await openCaller(page, 'recent'); await draft(page); let inserts = 0;
  page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios') inserts++; });
  await page.route('**/auth/v1/user', route => route.fulfill({ json: { ...user, id: 'other-owner' } }));
  await submit(page).click(); await expect(modal(page)).toHaveCount(0); expect(inserts).toBe(0);
  await trigger(page, 'recent').click(); await expect(name(page)).toHaveValue('');
  await expect(modal(page).getByRole('button', { name: /Emerald Editorial/ })).toHaveAttribute('aria-pressed', 'true');
});

test('Home error round closes/reopens without carrying its error; retained draft can be retried', async ({ page }) => {
  await openCaller(page, 'recent'); await draft(page);
  await page.route('**/rest/v1/portfolios?**', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, json: { message: internal } }) : route.continue());
  await submit(page).click(); await expect(modal(page).getByRole('alert')).toHaveText(createResultError);
  await name(page).press('Escape'); await expect(modal(page)).toHaveCount(0);
  await trigger(page, 'recent').click(); await expect(name(page)).toHaveValue('  พอร์ต Science  ');
  await expect(modal(page).getByRole('alert')).toHaveCount(0);
  await page.unroute('**/rest/v1/portfolios?**'); await submit(page).click(); await expect(page).toHaveURL(/editor\?portfolio=/);
});

for (const width of [1440, 390]) {
  test(`${width}px: Home create pending/error is readable and controls remain reachable`, async ({ page }, testInfo) => {
    await openCaller(page, 'recent'); await page.setViewportSize({ width, height: 900 }); await draft(page);
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let started = false;
    await page.route('**/rest/v1/portfolios?**', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      started = true; await gate; await route.fulfill({ status: 500, json: { message: internal.repeat(100) } });
    });
    await submit(page).click(); await expect.poll(() => started).toBe(true);
    await modal(page).getByRole('status').scrollIntoViewIfNeeded(); await expect(modal(page).getByRole('status')).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`create-pending-${width}.png`) });
    release(); const alert = modal(page).getByRole('alert'); await expect(alert).toHaveText(createResultError);
    await alert.scrollIntoViewIfNeeded();
    expect(await alert.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const box = await alert.boundingBox(); expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await expect(submit(page)).toBeInViewport(); await expect(submit(page)).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`create-error-${width}.png`) });
    await expect(page.locator('body')).not.toContainText(internal);
  });
}

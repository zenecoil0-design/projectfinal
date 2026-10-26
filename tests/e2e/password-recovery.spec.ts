import { test, expect, type Page } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const token = () => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'synthetic'].join('.');
async function requestLink(page: Page) {
  let redirect = '';
  await page.route('**/auth/v1/recover**', route => {
    redirect = new URL(route.request().url()).searchParams.get('redirect_to')!;
    return route.fulfill({ json: {} });
  });
  await page.goto('/forgot-password');
  await page.getByLabel('อีเมล', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'ส่งลิงก์ตั้งรหัสผ่านใหม่' }).click();
  await expect(page.getByRole('status')).toContainText('หากอีเมลนี้มีบัญชี');
  return redirect;
}
async function recovery(page: Page) {
  const target = new URL(await requestLink(page));
  target.searchParams.set('code', 'synthetic-recovery-code');
  await page.route('**/auth/v1/token?grant_type=pkce', route => route.fulfill({ json: {
    access_token: token(), refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user,
  } }));
  await page.goto(target.toString());
  await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password$/);
}
async function fill(page: Page, confirmation = 'new-password-123') {
  await page.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('new-password-123');
  await page.getByLabel('ยืนยันรหัสผ่านใหม่', { exact: true }).fill(confirmation);
}

test('login links to recovery; known and unknown accounts receive identical copy and fixed local redirect', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'ลืมรหัสผ่าน?' }).click();
  const redirect = await requestLink(page);
  expect(new URL(redirect).origin).toBe('http://127.0.0.1:3000');
  expect(new URL(redirect).pathname).toBe('/reset-password');
  const accepted = await page.getByRole('status').innerText();
  await page.route('**/auth/v1/recover**', route => route.fulfill({ status: 400, json: { error_code: 'user_not_found', msg: 'RAW_PRIVATE_MARKER' } }));
  await page.getByLabel('อีเมล', { exact: true }).fill('absent@example.invalid');
  await page.getByRole('button', { name: 'ส่งลิงก์ตั้งรหัสผ่านใหม่' }).click();
  await expect(page.getByRole('status')).toHaveText(accepted);
  await expect(page.locator('body')).not.toContainText('RAW_PRIVATE_MARKER');
});

test('request failure preserves email; pending same-turn submits issue one request', async ({ page }) => {
  let count = 0; let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/auth/v1/recover**', async route => { count++; await pending; await route.fulfill({ status: 429, json: { error_code: 'over_email_send_rate_limit', msg: 'RAW_PRIVATE_MARKER' } }); });
  await page.goto('/forgot-password'); await page.getByLabel('อีเมล', { exact: true }).fill(user.email);
  await page.locator('form').evaluate(form => { if (!(form instanceof HTMLFormElement)) throw new Error('form'); form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByLabel('อีเมล', { exact: true })).toBeDisabled();
  await expect.poll(() => count).toBe(1); release();
  await expect(page.locator('main').getByRole('alert')).toContainText('ยังยืนยันการขอลิงก์ไม่ได้');
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveValue(user.email);
  await expect(page.locator('body')).not.toContainText('RAW_PRIVATE_MARKER');
});

for (const suffix of ['', '?code=missing-verifier', '?error=access_denied&error_description=RAW_PRIVATE_MARKER']) {
  test(`invalid recovery ${suffix || 'direct entry'} never offers a password mutation`, async ({ page }) => {
    let writes = 0; page.on('request', r => { if (r.method() === 'PUT') writes++; });
    await page.goto('/reset-password' + suffix);
    await expect(page.locator('main').getByRole('alert')).toContainText('ลิงก์ใช้ไม่ได้');
    await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('RAW_PRIVATE_MARKER'); expect(writes).toBe(0);
  });
}

test('PKCE recovery validates confirmation, safely retries and acknowledges only returned owner', async ({ page }) => {
  await recovery(page); let writes = 0; let fail = true;
  await page.route('**/auth/v1/user', route => {
    if (route.request().method() !== 'PUT') return route.fulfill({ json: user });
    writes++; expect(route.request().postDataJSON().password).toBe('new-password-123');
    return fail ? route.fulfill({ status: 422, json: { error_code: 'weak_password', msg: 'RAW_PRIVATE_MARKER' } }) : route.fulfill({ json: user });
  });
  await fill(page, 'different-password'); await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveText('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); expect(writes).toBe(0);
  await fill(page); await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('ยังยืนยันการเปลี่ยนรหัสผ่านไม่ได้');
  await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveValue('new-password-123');
  await expect(page.locator('body')).not.toContainText('RAW_PRIVATE_MARKER');
  fail = false; await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
  await expect(page.getByRole('status')).toHaveText('เปลี่ยนรหัสผ่านแล้ว'); expect(writes).toBe(2);
  await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveCount(0);
});

test('verified owner mismatch blocks update and clears password fields', async ({ page }) => {
  await recovery(page); let writes = 0;
  await page.route('**/auth/v1/user', route => { if (route.request().method() === 'PUT') writes++; return route.fulfill({ json: { ...user, id: 'another-owner' } }); });
  await fill(page); await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('ลิงก์ใช้ไม่ได้'); expect(writes).toBe(0);
});

test('mobile recovery remains readable and reset pending submits only once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await recovery(page); await fill(page);
  let count = 0; let release!: () => void; const pending = new Promise<void>(r => { release = r; });
  await page.route('**/auth/v1/user', async route => {
    if (route.request().method() !== 'PUT') return route.fulfill({ json: user });
    count++; await pending; await route.fulfill({ json: user });
  });
  await page.locator('form').evaluate(form => { if (!(form instanceof HTMLFormElement)) throw new Error('form'); form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toBeDisabled(); await expect.poll(() => count).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  release(); await expect(page.getByRole('status')).toHaveText('เปลี่ยนรหัสผ่านแล้ว');
});

for (const code of ['otp_expired', 'flow_state_not_found']) {
  test(`server-rejected ${code} recovery does not enable password update`, async ({ page }) => {
    const target = new URL(await requestLink(page)); target.searchParams.set('code', 'expired-synthetic-code');
    await page.route('**/auth/v1/token?grant_type=pkce', route => route.fulfill({ status: 400, json: { error_code: code, msg: 'RAW_PRIVATE_MARKER' } }));
    await page.goto(target.toString());
    await expect(page.locator('main').getByRole('alert')).toContainText('ลิงก์ใช้ไม่ได้');
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.locator('body')).not.toContainText('RAW_PRIVATE_MARKER');
    await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveCount(0);
  });
}

test('refresh after consumed recovery needs a new link despite the retained login session', async ({ page }) => {
  await recovery(page); await page.reload();
  await expect(page.locator('main').getByRole('alert')).toContainText('ลิงก์ใช้ไม่ได้');
  await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'ขอลิงก์ใหม่' }).click(); await expect(page).toHaveURL(/\/forgot-password$/);
});

for (const stage of ['verification', 'update']) {
  test(`late ${stage} after account change cannot update or acknowledge the new session`, async ({ page }) => {
    await recovery(page); await fill(page); let writes = 0;
    let started!: () => void; const waiting = new Promise<void>(r => { started = r; });
    let release!: () => void; const pending = new Promise<void>(r => { release = r; });
    await page.route('**/auth/v1/user', async route => {
      const write = route.request().method() === 'PUT'; if (write) writes++;
      if ((stage === 'update') === write) { started(); await pending; }
      await route.fulfill({ json: user });
    });
    await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click(); await waiting;
    await page.evaluate(user => {
      const channel = new BroadcastChannel('sb-127-auth-token');
      channel.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'another-owner' } } }); channel.close();
    }, user);
    await expect(page.locator('main').getByRole('alert')).toContainText('ลิงก์ใช้ไม่ได้');
    const response = page.waitForResponse(r => r.url().includes('/auth/v1/user')); release(); await response;
    await expect(page.getByText('เปลี่ยนรหัสผ่านแล้ว', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveCount(0);
    expect(writes).toBe(stage === 'update' ? 1 : 0);
  });
}

for (const [name, result] of [['malformed', {}], ['wrong-owner', { ...user, id: 'another-owner' }]] as const) {
  test(`${name} update retires recovery instead of acknowledging success`, async ({ page }) => {
    await recovery(page); await fill(page);
    await page.route('**/auth/v1/user', route => route.fulfill({ json: route.request().method() === 'PUT' ? result : user }));
    await page.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('ลิงก์ใช้ไม่ได้');
    await expect(page.getByText('เปลี่ยนรหัสผ่านแล้ว', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('รหัสผ่านใหม่', { exact: true })).toHaveCount(0);
  });
}

for (const width of [390, 1440]) {
  test(`${width}px recovery visual and keyboard verification`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await recovery(page);
    await page.getByLabel('รหัสผ่านใหม่', { exact: true }).focus(); await page.keyboard.press('Tab');
    await expect(page.getByLabel('ยืนยันรหัสผ่านใหม่', { exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`password-recovery-${width}.png`), fullPage: true });
  });
}

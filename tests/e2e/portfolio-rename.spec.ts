import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

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

test('saving is server-confirmed and synchronously locks submit, cancel, Escape and another target', async ({ page }) => {
  await dashboard(page); await open(page);
  await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).fill('ยืนยันจาก server');
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let updates = 0;
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    updates++; await gate; await route.fulfill({ response: await route.fetch() });
  });
  await dialog(page).locator('form').evaluate(form => {
    if (!(form instanceof HTMLFormElement)) throw new Error('Expected rename form');
    form.requestSubmit(); form.requestSubmit();
  });
  await expect.poll(() => updates).toBe(1);
  await expect(card(page).getByRole('heading')).toHaveText('Portfolio A');
  await expect(dialog(page).getByRole('button', { name: 'ยกเลิก', exact: true })).toBeDisabled();
  await expect(dialog(page).getByLabel('ชื่อพอร์ต', { exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(dialog(page)).toBeVisible();
  // Programmatic background activation also cannot swap target during the request.
  await card(page, 'b').getByRole('button').evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected rename button');
    button.click();
  });
  await expect(dialog(page).getByLabel('ชื่อพอร์ต', { exact: true })).toHaveValue('ยืนยันจาก server');
  release(); await expect(dialog(page)).toHaveCount(0); expect(updates).toBe(1);
  await expect(card(page).getByRole('heading')).toHaveText('ยืนยันจาก server');
  await expect(card(page, 'b').getByRole('heading')).toHaveText('Portfolio B');
});

for (const phase of ['auth', 'update'] as const) {
  test(`late ${phase} after account change never updates the new session`, async ({ page }) => {
    await dashboard(page); await open(page);
    await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).fill('old-session-draft');
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let started = false; let settled = false; let updates = 0;
    page.on('request', request => { if (request.method() === 'PATCH') updates++; });
    await page.route(phase === 'auth' ? '**/auth/v1/user' : '**/rest/v1/portfolios?**', async route => {
      if (phase === 'update' && route.request().method() !== 'PATCH') return route.continue();
      started = true; await gate;
      await route.fulfill({ json: phase === 'auth' ? user : { id: 'a', user_id: user.id, title: 'old-session-draft', updated_at: null } }); settled = true;
    });
    await dialog(page).getByRole('button', { name: 'บันทึกชื่อ', exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await page.evaluate(user => { const c = new BroadcastChannel('sb-127-auth-token'); c.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); c.close(); }, user);
    await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
    await expect(dialog(page)).toHaveCount(0); release(); await expect.poll(() => settled).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('article[data-portfolio-id]')).toHaveCount(0);
    await expect(page.getByText('เปลี่ยนชื่อพอร์ตแล้ว', { exact: true })).toHaveCount(0);
    await expect(page.getByText(failureText, { exact: true })).toHaveCount(0);
    expect(updates).toBe(phase === 'auth' ? 0 : 1);
  });
}

test('late response after browser Back cannot enter Editor or a subsequently opened target', async ({ page }) => {
  await page.goto('/editor?portfolio=b'); await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await open(page);
  await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).fill('late rename');
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let started = false; let settled = false;
  await page.route('**/rest/v1/portfolios?**', async route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    started = true; await gate;
    await route.fulfill({ json: { id: 'a', user_id: user.id, title: 'late rename', updated_at: null } }); settled = true;
  });
  await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).press('Enter'); await expect.poll(() => started).toBe(true);
  await page.goBack(); await expect(page).toHaveURL(/editor\?portfolio=b/);
  release(); await expect.poll(() => settled).toBe(true);
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.getByText('Portfolio B', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('late rename');
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click(); await open(page, 'b');
  await expect(dialog(page).getByLabel('ชื่อพอร์ต', { exact: true })).toHaveValue('Portfolio B');
  await expect(dialog(page).getByRole('alert')).toHaveCount(0);
});

for (const auth of ['error', 'mismatch'] as const) {
  test(`current-user ${auth} rejects rename without sending update or exposing raw details`, async ({ page }) => {
    await dashboard(page); await open(page); let updates = 0;
    page.on('request', r => { if (r.method() === 'PATCH') updates++; });
    await page.route('**/auth/v1/user', route => route.fulfill({ status: auth === 'error' ? 500 : 200, json: auth === 'error' ? { message: internal } : { ...user, id: 'other-owner' } }));
    await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).fill('draft');
    await dialog(page).getByRole('button', { name: 'บันทึกชื่อ', exact: true }).click();
    await expect(dialog(page).getByRole('alert')).toHaveText(failureText, { timeout: 20000 });
    expect(updates).toBe(0); await expect(page.locator('body')).not.toContainText(internal);
    await expect(dialog(page).getByLabel('ชื่อพอร์ต', { exact: true })).toHaveValue('draft');
  });
}

for (const value of [null, '', '   ']) {
  test(`existing ${JSON.stringify(value)} title is editable without persisting a display fallback`, async ({ page }) => {
    await page.route('**/rest/v1/portfolios?**', async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch(); const rows: Array<Record<string, unknown>> = await response.json();
      await route.fulfill({ json: rows.map(row => row.id === 'a' ? { ...row, title: value } : row) });
    });
    await dashboard(page); await open(page); let updates = 0;
    page.on('request', r => { if (r.method() === 'PATCH') updates++; });
    const name = dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }); await expect(name).toHaveValue(value ?? '');
    await name.press('Enter'); await expect(dialog(page).getByRole('alert')).toHaveText('กรุณาตั้งชื่อ Portfolio'); expect(updates).toBe(0);
    await name.fill('Portfolio B'); await name.press('Enter'); await expect(dialog(page)).toHaveCount(0);
    expect(updates).toBe(1); await expect(card(page).getByRole('heading')).toHaveText('Portfolio B');
    await expect(card(page, 'b').getByRole('heading')).toHaveText('Portfolio B');
  });
}

for (const width of [1440, 390]) {
  test(`${width}px: long names, keyboard trap, Escape, focus return and clean target reopening`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 }); await dashboard(page); await open(page);
    const name = dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }); await expect(name).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(dialog(page).getByRole('button', { name: 'บันทึกชื่อ', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(name).toBeFocused();
    await name.fill('discard'); await page.keyboard.press('Escape'); await expect(dialog(page)).toHaveCount(0);
    await expect(card(page).getByRole('button')).toBeFocused();
    await page.keyboard.press('Enter'); await expect(name).toHaveValue('Portfolio A');
    const long = 'ชื่อพอร์ตภาษาไทยEnglish'.repeat(30);
    await name.fill(long); await name.press('Enter'); await expect(dialog(page)).toHaveCount(0);
    await open(page); await expect(name).toHaveValue(long);
    await expect(dialog(page).getByText(`ชื่อปัจจุบัน: ${long}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await dialog(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`rename-${width}.png`) });
    await name.fill(' '); await name.press('Enter'); await expect(dialog(page).getByRole('alert')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click(); await open(page, 'b');
    await expect(name).toHaveValue('Portfolio B'); await expect(dialog(page).getByRole('alert')).toHaveCount(0);
  });
}

test('rename preserves every content table/template/visibility and new Editor exports the sanitized new filename', async ({ page, request }, testInfo) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/portfolios?id=eq.a', { data: { template_key: 'minimal' } });
  await request.post('http://127.0.0.1:54321/rest/v1/portfolio_section_visibility', { data: { portfolio_id: 'a', section: 'profile', visible: false } });
  const tables = ['covers', 'prefaces', 'profiles', 'portfolio_educations', 'portfolio_activities', 'portfolio_certificates', 'portfolio_section_visibility', 'user_library_educations', 'user_library_activities', 'user_library_certificates'];
  const before = await Promise.all(tables.map(async table => (await request.get(`http://127.0.0.1:54321/rest/v1/${table}`)).json()));
  await dashboard(page); await open(page);
  await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).fill('สมัคร/Science:2026');
  await dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }).press('Enter'); await expect(dialog(page)).toHaveCount(0);
  const after = await Promise.all(tables.map(async table => (await request.get(`http://127.0.0.1:54321/rest/v1/${table}`)).json()));
  expect(after).toEqual(before);
  await card(page).getByRole('link').click(); await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.getByText('สมัคร/Science:2026', { exact: true })).toBeVisible();
  await expect(page.getByLabel('เทมเพลต', { exact: true })).toHaveValue('minimal');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('Alpha');
  await expect(page.locator('main [data-section="หน้าปก"]')).toContainText('ALPHA');
  await expect(page.locator('main [data-section="ประวัติส่วนตัว"]')).toHaveCount(0);
  await openEditorSection(page, 'education'); await expect(page.locator('#editor-panel-education input[type=checkbox]').first()).toBeChecked();
  await page.getByRole('button', { name: 'ขั้นตอนสุดท้าย · เลือกสีและดาวน์โหลด', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  const file = await download; expect(file.suggestedFilename()).toBe('สมัคร-Science-2026.pdf');
  await file.saveAs(testInfo.outputPath('renamed-portfolio.pdf'));
});

test('existing create, open and logout still work', async ({ page }) => {
  await dashboard(page); await page.getByRole('button', { name: 'สร้าง Portfolio ใหม่', exact: false }).click();
  const input = page.getByPlaceholder('เช่น Portfolio สมัครมหาวิทยาลัย'); await input.fill('  New portfolio  ');
  const insert = page.waitForRequest(r => r.method() === 'POST' && new URL(r.url()).pathname === '/rest/v1/portfolios');
  await page.getByRole('button', { name: 'สร้าง Portfolio', exact: true }).click();
  expect((await insert).postDataJSON()).toEqual({ user_id: user.id, title: 'New portfolio', template_key: 'modern' });
  await expect(page).toHaveURL(/editor\?portfolio=/); await expect(page.getByText('New portfolio', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New portfolio', exact: true })).toBeVisible();
  await page.route('**/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }));
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click(); await expect(page).toHaveURL(/login$/);
});

test('untrusted returned owner, title and timestamp shapes cannot acknowledge success', async ({ page }) => {
  await dashboard(page); await open(page);
  const name = dialog(page).getByLabel('ชื่อพอร์ต', { exact: true }); await name.fill('new title');
  const base = { id: 'a', user_id: user.id, title: 'new title', updated_at: null };
  let response: unknown;
  await page.route('**/rest/v1/portfolios?**', route => route.request().method() !== 'PATCH' ? route.continue() : route.fulfill({ json: response }));
  for (const value of [[], { ...base, user_id: 'other-owner' }, { ...base, title: 'different' }, { ...base, updated_at: 123 }, { id: 'a', user_id: user.id, title: 'new title' }]) {
    response = value;
    const reply = page.waitForResponse(r => r.request().method() === 'PATCH');
    await name.press('Enter'); await reply;
    await expect(dialog(page).getByRole('alert')).toHaveText(failureText);
    await expect(name).toBeEnabled(); await expect(name).toHaveValue('new title');
    await expect(card(page).getByRole('heading')).toHaveText('Portfolio A');
  }
  await page.unroute('**/rest/v1/portfolios?**'); await name.press('Enter');
  await expect(dialog(page)).toHaveCount(0); await expect(card(page).getByRole('heading')).toHaveText('new title');
});

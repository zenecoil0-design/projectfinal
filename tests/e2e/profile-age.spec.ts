import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

test.use({ timezoneId: 'America/Los_Angeles' });
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ page, context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  // UTC June 15 is still local June 14: catches the former UTC date-only parsing bug.
  await page.clock.setFixedTime(new Date('2040-06-15T00:30:00Z'));
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

const formAge = (page: Page) => page.locator('#editor-panel-profile output[aria-labelledby=profile-age-label]');
const previewAge = (page: Page) => page.locator('main [data-portfolio-page][data-page-section=profile]').getByText('อายุ :', { exact: true }).locator('..');
async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await openEditorSection(page, 'profile');
}

test('form and every template share the local calendar age, retaining the birthday draft', async ({ page }) => {
  await ready(page);
  await expect(formAge(page)).toHaveText('—');
  await expect(previewAge(page)).toHaveText('อายุ : —');
  await page.getByLabel('วันเกิด', { exact: true }).fill('2000-06-15');
  await expect(formAge(page)).toHaveText('39');
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(previewAge(page)).toHaveText('อายุ : 39 ปี');
    await expect(page.getByLabel('วันเกิด', { exact: true })).toHaveValue('2000-06-15');
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  }
});

test('before/on/after birthday and age zero use the fixed local reference day', async ({ page }) => {
  await ready(page);
  for (const [birthday, age] of [['2000-06-15', 39], ['2000-06-14', 40], ['2000-06-13', 40], ['2040-06-14', 0]] as const) {
    await page.getByLabel('วันเกิด', { exact: true }).fill(birthday);
    await expect(formAge(page)).toHaveText(String(age));
    await expect(previewAge(page)).toHaveText(`อายุ : ${age} ปี`);
  }
});

test('Feb 29 follows leap-year anniversaries and March 1 in a normal year', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: { date_of_birth: '2000-02-29' } });
  for (const [instant, age] of [['2024-02-28T20:00:00Z', 23], ['2024-02-29T20:00:00Z', 24], ['2025-02-28T20:00:00Z', 24], ['2025-03-01T20:00:00Z', 25]] as const) {
    await page.clock.setFixedTime(new Date(instant));
    await ready(page);
    await expect(formAge(page)).toHaveText(String(age));
    await expect(previewAge(page)).toHaveText(`อายุ : ${age} ปี`);
    await expect(page.getByLabel('วันเกิด', { exact: true })).toHaveValue('2000-02-29');
  }
});

test('unavailable ages have one dash without a year suffix in all templates; loading never rewrites stored birthdays', async ({ page, request }) => {
  let writes = 0;
  page.on('request', request => { if (request.url().includes('/rest/v1/profiles') && ['POST', 'PATCH'].includes(request.method())) writes++; });
  for (const birthday of [null, '', '2001-02-29', 'invalid', '2040-06-15']) {
    await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: { date_of_birth: birthday } });
    await ready(page);
    for (const template of ['classic', 'modern', 'minimal']) {
      await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
      await expect(formAge(page)).toHaveText('—');
      await expect(previewAge(page)).toHaveText('อายุ : —');
      await expect(previewAge(page)).not.toContainText(/NaN|— ปี|-\d/);
    }
    const saved = await (await request.get('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a')).json();
    expect(saved[0].date_of_birth).toBe(birthday);
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  }
  expect(writes).toBe(0);
});

test('birthday save failure keeps dirty draft/leave warning, retry and reload retain the original payload contract', async ({ page }) => {
  await ready(page);
  const birthday = page.getByLabel('วันเกิด', { exact: true });
  await birthday.fill('2000-06-14');
  let fail = true;
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/profiles?**', route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    bodies.push(route.request().postDataJSON());
    return fail ? route.fulfill({ status: 500, json: { message: 'INTERNAL_AGE_SAVE_FAILURE' } }) : route.continue();
  });
  const form = page.locator('#editor-panel-profile form');
  await form.locator('button[type=submit]').click();
  await expect(form.getByRole('alert')).toContainText('ยืนยันการบันทึกประวัติส่วนตัวไม่สำเร็จ');
  await expect(page.locator('body')).not.toContainText('INTERNAL_AGE_SAVE_FAILURE');
  await expect(birthday).toHaveValue('2000-06-14');
  await expect(formAge(page)).toHaveText('40');
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/editor/);
  fail = false;
  await form.locator('button[type=submit]').click();
  await expect(page.locator('#editor-heading-education')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
  expect(bodies).toHaveLength(2);
  for (const payload of bodies) {
    expect(payload.date_of_birth).toBe('2000-06-14');
    expect(payload.portfolio_id).toBe('a');
    expect(payload).not.toHaveProperty('age');
    expect(payload).not.toHaveProperty('age_mode');
  }
  await ready(page);
  await expect(birthday).toHaveValue('2000-06-14');
  await expect(formAge(page)).toHaveText('40');
  await expect(previewAge(page)).toHaveText('อายุ : 40 ปี');
});

test('legacy invalid birthday is not silently cleared or newly blocked when another field is saved', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: { date_of_birth: '2001-02-29' } });
  await ready(page);
  await expect(formAge(page)).toHaveText('—');
  await page.getByLabel('ชื่อเล่น', { exact: true }).fill('Legacy birthday retained');
  const write = page.waitForRequest(request => request.url().includes('/rest/v1/profiles?') && request.method() === 'PATCH');
  await page.locator('#editor-panel-profile form button[type=submit]').click();
  expect((await write).postDataJSON().date_of_birth).toBe('2001-02-29');
  await expect(page.locator('#editor-heading-education')).toHaveAttribute('aria-expanded', 'true');
  const saved = await (await request.get('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a')).json();
  expect(saved[0].date_of_birth).toBe('2001-02-29');
  expect(saved[0].nickname).toBe('Legacy birthday retained');
});

test('desktop/mobile age area fits and mobile Preview retains the same dirty birthday', async ({ page }, info) => {
  await ready(page);
  await page.getByLabel('วันเกิด', { exact: true }).fill('2000-06-15');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByLabel('วันเกิด', { exact: true }).scrollIntoViewIfNeeded();
    const field = page.getByLabel('วันเกิด', { exact: true });
    for (const control of [field, formAge(page)]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`profile-age-${width}.png`) });
  }
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await expect(previewAge(page)).toBeVisible();
  await expect(previewAge(page)).toHaveText('อายุ : 39 ปี');
  await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
  await expect(page.getByLabel('วันเกิด', { exact: true })).toHaveValue('2000-06-15');
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
});

test('changing portfolios cannot retain the prior profile birthday or age', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: { date_of_birth: '2000-06-15' } });
  await ready(page);
  await expect(formAge(page)).toHaveText('39');
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await openEditorSection(page, 'profile');
  await expect(page.getByLabel('วันเกิด', { exact: true })).toHaveValue('');
  await expect(formAge(page)).toHaveText('—');
  await expect(previewAge(page)).toHaveText('อายุ : —');
});

test.describe('positive local UTC offset', () => {
  test.use({ timezoneId: 'Asia/Bangkok' });
  test('the same fixed instant uses the browser local birthday in Bangkok', async ({ page }) => {
    await ready(page);
    await page.getByLabel('วันเกิด', { exact: true }).fill('2000-06-15');
    await expect(formAge(page)).toHaveText('40');
    await expect(previewAge(page)).toHaveText('อายุ : 40 ปี');
  });
});

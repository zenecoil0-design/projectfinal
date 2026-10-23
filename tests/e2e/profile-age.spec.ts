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

import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';
import { expectCurrentContents } from './helpers/toc';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ page, context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  await page.clock.setFixedTime(new Date('2040-06-15T12:00:00Z'));
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

const paper = (page: Page) => page.locator('main [data-portfolio-page][data-page-section=profile]');
async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await openEditorSection(page, 'profile');
}
async function expectNoExtras(page: Page) {
  for (const name of ['ข้อมูลการติดต่อ', 'ข้อมูลเพิ่มเติม', 'ช่องทางอื่นๆ :', 'เบอร์โทรศัพท์ :', 'อีเมล :', 'ที่อยู่ :', 'ความสามารถพิเศษ (Skills) :', 'คติประจำใจ (Motto) :']) {
    await expect(paper(page).getByText(name, { exact: true })).toHaveCount(0);
  }
  await expect(paper(page).locator('.profile-social-row')).toHaveCount(0);
}

test('empty/default social hides optional groups in all templates without hiding the profile page or basic fields', async ({ page }) => {
  await ready(page);
  await expect(page.getByLabel('แพลตฟอร์มช่องทางติดต่อ 1', { exact: true })).toHaveValue('facebook');
  await expect(page.getByLabel('ข้อมูลช่องทางติดต่อ 1', { exact: true })).toHaveValue('');
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expectNoExtras(page);
    await expect(paper(page)).toHaveCount(1);
    for (const name of ['วันเกิด :', 'อายุ :', 'โรงเรียน :', 'เกรดเฉลี่ย (GPAX) :']) await expect(paper(page).getByText(name, { exact: true })).toHaveCount(1);
    await expect(paper(page).getByText('อายุ :', { exact: true }).locator('..')).toHaveText('อายุ : —');
    await expect(page.locator('[data-portfolio-page]')).toHaveCount(7);
    await expect(paper(page).locator('[data-page-number]')).toHaveText('1');
    await expectCurrentContents(page);
  }
  // The content wrapper has only the basic-information group, not empty bordered groups.
  expect(await paper(page).evaluate(element => element.children[1].children.length)).toBe(1);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
});

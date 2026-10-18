import { test, expect } from '@playwright/test';
import { openEditorSection } from './helpers/editor';
import { expectCurrentContents } from './helpers/toc';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('TOC uses current footer starts across all templates and inserting it preserves navigation to six form sections', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(page.locator(`[data-portfolio-page][data-template=${template}]`)).toHaveCount(7);
    await expectCurrentContents(page);
    await expect(page.locator('[data-toc-page]')).toHaveText(['1', '2', '3', '4']);
    await expect(page.locator('[data-page-number]')).toHaveText(['1', '2', '3', '4']);
    await expect(page.locator('[data-page-section=toc] [data-page-number]')).toHaveCount(0);
    await expect(page.getByText('7 หน้า', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
  }
  await page.locator('#editor-heading-cover').click(); // then reopen to exercise navigation
  for (const section of ['cover', 'preface', 'profile', 'education', 'activity', 'certificate']) {
    await openEditorSection(page, section);
    await expect.poll(() => page.locator(`main [data-page-section=${section}]`).first().evaluate(el => Math.round(el.getBoundingClientRect().top - document.querySelector('main')!.getBoundingClientRect().top))).toBe(24);
  }
});

test('multi-page TOC updates after deselection, re-selection and template changes without resetting baseline', async ({ page }) => {
  await page.route('**/rest/v1/user_library_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ id: `e-${i}`, school_name: `โรงเรียน ${i} ` + 'รายละเอียดภาษาไทย '.repeat(5), level: 'มัธยมศึกษา', study_plan: 'วิทยาศาสตร์', start_year: '2566', end_year: '2569' })) }));
  await page.route('**/rest/v1/portfolio_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ education_id: `e-${i}`, sort_order: i })) }));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect.poll(() => page.locator('[data-page-section=education]').count()).toBeGreaterThan(1);
  await expectCurrentContents(page);
  const before = Number(await page.locator('[data-toc-section=activity] [data-toc-page]').textContent());
  await openEditorSection(page, 'education');
  for (const checkbox of await page.locator('form:visible input[type=checkbox]').all()) await checkbox.uncheck();
  await expect(page.locator('[data-page-section=education]')).toHaveCount(1);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await expectCurrentContents(page);
  await expect(page.locator('[data-toc-page]')).toHaveText(['1', '2', '3', '4']);
  expect(Number(await page.locator('[data-toc-section=activity] [data-toc-page]').textContent())).toBeLessThan(before);
  for (const checkbox of await page.locator('form:visible input[type=checkbox]').all()) await checkbox.check();
  for (const template of ['modern', 'minimal', 'classic']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(page.locator('[data-portfolio-page]').first()).toHaveAttribute('data-template', template);
    await expectCurrentContents(page);
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0); // restored original selection/order
  }
});

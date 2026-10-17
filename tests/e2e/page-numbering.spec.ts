import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

async function assertNumbering(page: Page) {
  await expect.poll(() => page.locator('main [data-page-number]').allTextContents()).toEqual(
    Array.from({ length: await page.locator('main [data-portfolio-page]').count() - 2 }, (_, index) => String(index + 1)));
  const pages = page.locator('main [data-portfolio-page]');
  const total = await pages.count();
  await expect(pages.nth(0).locator('[data-page-number]')).toHaveCount(0);
  await expect(pages.nth(1).locator('[data-page-number]')).toHaveCount(0);
  await expect(page.getByText(`${total} หน้า`, { exact: true })).toBeVisible();
  expect(await pages.evaluateAll(nodes => nodes.map(node => Number((node as HTMLElement).dataset.physicalPage)))).toEqual(Array.from({ length: total }, (_, i) => i + 1));
}

test('all templates number six physical pages as unnumbered, unnumbered, 1–4 without changing footer structure', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(page.locator(`[data-portfolio-page][data-template=${template}]`)).toHaveCount(6);
    await assertNumbering(page);
    const firstChildren = await page.locator('[data-page-section=profile]').evaluate(el => Array.from(el.children).map(node => node.tagName));
    expect(firstChildren).toEqual(['DIV', 'DIV', 'DIV']);
    expect(await page.locator('[data-page-number]').count()).toBe(4); // measurement/clones do not add numbers
    await expect(page.locator('main')).not.toContainText('1 / 1');
  }
  const before = await page.locator('main').innerText();
  await page.locator('#editor-heading-cover').click();
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
  expect(await page.locator('main').innerText()).toBe(before);
  await assertNumbering(page);
});

test('multi-page education and activities update later offsets when selections change; empty rendered sections still count', async ({ page }) => {
  await page.route('**/rest/v1/user_library_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ id: `edu-${i}`, school_name: `School ${i} ` + 'รายละเอียดสถานศึกษาภาษาไทย '.repeat(4), level: 'มัธยมศึกษา', study_plan: 'วิทยาศาสตร์', gpa: 3.5, start_year: '2566', end_year: '2569' })) }));
  await page.route('**/rest/v1/portfolio_educations?**', route => route.fulfill({ json: new URL(route.request().url()).searchParams.get('portfolio_id') === 'eq.a' ? Array.from({ length: 9 }, (_, i) => ({ education_id: `edu-${i}`, sort_order: i })) : [] }));
  await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: Array.from({ length: 4 }, (_, i) => ({ id: `act-${i}`, title: `ORDER ${i}`, description: 'รายละเอียดผลงานภาษาไทย\n'.repeat(15) })) }));
  await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: new URL(route.request().url()).searchParams.get('portfolio_id') === 'eq.a' ? Array.from({ length: 4 }, (_, i) => ({ activity_id: `act-${i}`, sort_order: i })) : [] }));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect.poll(() => page.locator('[data-page-section=education]').count()).toBeGreaterThan(1);
  await expect.poll(() => page.locator('[data-page-section=activity]').count()).toBeGreaterThan(1);
  await assertNumbering(page);
  const before = Number(await page.locator('[data-page-section=certificate] [data-page-number]').textContent());
  await openEditorSection(page, 'education');
  for (const checkbox of await page.locator('form:visible input[type=checkbox]').all()) await checkbox.uncheck();
  await expect(page.locator('[data-page-section=education]')).toHaveCount(1);
  await assertNumbering(page);
  expect(Number(await page.locator('[data-page-section=certificate] [data-page-number]').textContent())).toBeLessThan(before);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(6);
  await assertNumbering(page);
});

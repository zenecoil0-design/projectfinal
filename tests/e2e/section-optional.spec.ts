import { test, expect, type Page } from '@playwright/test';
import { expectCurrentContents } from './helpers/toc';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

const cards = (page: Page, section: string) => page.locator(`main .${section}-card`);
async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
}

test('title-only and whitespace-only secondary data omit rows and image placeholders in every template without removing items', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_educations?id=eq.education-a', { data: { level: '  ', study_plan: '\t', gpa: null, start_year: '', end_year: ' ', logo_url: '' } });
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_activities?id=eq.activity-a', { data: { description: ' \n ', organization: '\t', activity_date: ' ' } });
  await request.patch('http://127.0.0.1:54321/rest/v1/user_library_certificates?id=eq.certificate-a', { data: { description: ' ', issued_by: '\n', issued_date: ' ' } });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    for (const [section, name] of [['education', 'Saved School'], ['activity', 'Saved Activity'], ['certificate', 'Saved Certificate']]) {
      await expect(cards(page, section)).toHaveCount(1);
      await expect(cards(page, section).locator('h3')).toHaveText(name);
      await expect(cards(page, section).locator('p, img, .education-logo, .document-images, .document-no-image')).toHaveCount(0);
      await expect(cards(page, section).locator('.document-card-heading > span')).toHaveCount(0);
    }
    await expect(page.locator('main [data-portfolio-page]')).toHaveCount(7);
    await expectCurrentContents(page);
    await expect(page.locator('main [data-page-number]')).toHaveText(['1', '2', '3', '4']);
  }
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
});

test('education years show only actual endpoints, and zero remains data', async ({ page, request }) => {
  const years = [['2563', '2566'], ['2563', ' '], [' ', '2566'], [' ', '\t']];
  const rows = years.map(([start_year, end_year], index) => ({ id: `edu-${index}`, user_id: user.id, school_name: `โรงเรียน ${index}`, level: '0', study_plan: '0', gpa: 0, start_year, end_year, logo_url: '' }));
  await request.post('http://127.0.0.1:54321/rest/v1/user_library_educations', { data: rows });
  await request.delete('http://127.0.0.1:54321/rest/v1/portfolio_educations?portfolio_id=eq.a');
  await request.post('http://127.0.0.1:54321/rest/v1/portfolio_educations', { data: rows.map((row, index) => ({ portfolio_id: 'a', education_id: row.id, sort_order: index })) });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(cards(page, 'education').locator('h3')).toHaveText(rows.map(row => row.school_name));
    for (const card of await cards(page, 'education').all()) {
      await expect(card).toContainText('ระดับการศึกษา: 0');
      await expect(card).toContainText('สาขา: 0');
      await expect(card).toContainText('GPAX: 0');
      await expect(card).not.toContainText(/ปัจจุบัน|\?/);
    }
    await expect(cards(page, 'education').nth(0)).toContainText('ช่วงปีการศึกษา: 2563 - 2566');
    await expect(cards(page, 'education').nth(1)).toContainText('ปีเริ่มต้น: 2563');
    await expect(cards(page, 'education').nth(2)).toContainText('ปีสิ้นสุด: 2566');
    await expect(cards(page, 'education').nth(3).locator('p')).toHaveCount(3);
    await expectCurrentContents(page);
  }
});

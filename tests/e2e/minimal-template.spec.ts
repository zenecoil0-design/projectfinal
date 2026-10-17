import { test, expect } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('Minimal has six distinct section styles; switching preserves drafts, selection and dirty baseline', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.locator('form:visible input').first().fill('ร่างหัวเรื่องที่ยังไม่บันทึก');
  await openEditorSection(page, 'activity');
  const checkbox = page.locator('form:visible input[type=checkbox]').first();
  await checkbox.uncheck();
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  for (const key of ['minimal', 'modern', 'classic', 'minimal']) {
    await picker.selectOption(key);
    await expect(page.locator(`[data-portfolio-page][data-template="${key}"]`)).toHaveCount(6);
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  }
  const cover = page.locator('.minimal-cover');
  await expect(cover.locator('h1')).toHaveText('ร่างหัวเรื่องที่ยังไม่บันทึก');
  await expect(cover.locator('h2')).toHaveText('Alpha Student');
  await expect(cover.locator('img')).toHaveAttribute('alt', 'รูปหน้าปก');
  await expect(page.locator('[data-template=minimal] .document-card')).toHaveCount(4); // education/certificate + their measurement copies
  expect(await cover.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  await openEditorSection(page, 'cover');
  await expect(page.locator('form:visible input').first()).toHaveValue('ร่างหัวเรื่องที่ยังไม่บันทึก');
});

test('Minimal persists on reload, failed changes preserve saved design, portfolio switch resets it and unknown keys keep fallback', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  await picker.selectOption('minimal');
  await expect(page.locator('.minimal-cover')).toBeVisible();
  await page.reload();
  await expect(picker).toHaveValue('minimal');
  await expect(page.locator('[data-portfolio-page][data-template=minimal]')).toHaveCount(6);
  await page.route('**/rest/v1/portfolios?**', route => route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { message: 'template save failed' } }) : route.continue());
  await picker.selectOption('modern');
  await expect(page.getByText('template save failed')).toBeVisible();
  await expect(picker).toHaveValue('minimal');
  await expect(page.locator('.minimal-cover')).toBeVisible();
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(picker).toHaveValue('classic');
  await expect(page.locator('.minimal-cover')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Alpha Student');
  await page.unroute('**/rest/v1/portfolios?**');
  await page.route('**/rest/v1/portfolios?**', route => route.fulfill({ json: { id: 'b', title: 'Legacy portfolio', template_key: 'legacy-key', user_id: user.id } }));
  await page.reload();
  await expect(picker).toHaveValue('legacy-key');
  await expect(page.locator('[data-portfolio-page][data-template=legacy-key]')).toHaveCount(6);
  await expect(page.locator('.minimal-cover, .editorial-cover')).toHaveCount(0);
});

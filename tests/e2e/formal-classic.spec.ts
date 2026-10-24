import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('Classic uses one portrait and formal A4 styling, while other templates remain isolated', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const selector = page.getByLabel('เทมเพลต', { exact: true });
  await selector.selectOption('classic');
  const cover = page.locator('[data-portfolio-page][data-template=classic][data-page-section=cover]');
  await expect(cover).toHaveClass(/formal-cover/);
  await expect(cover.locator('img')).toHaveCount(1);
  await expect(cover.locator('.formal-cover-photo')).toBeVisible();
  await expect(cover.locator('.formal-cover-details')).toBeVisible();
  for (const section of ['preface', 'toc', 'profile', 'education', 'activity', 'certificate']) {
    const sheet = page.locator(`[data-portfolio-page][data-template=classic][data-page-section=${section}]`).first();
    await expect(sheet).toBeAttached();
    await expect(sheet).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  }
  await selector.selectOption('modern');
  await expect(page.locator('.editorial-cover')).toBeAttached();
  await expect(page.locator('.formal-cover')).toHaveCount(0);
  await selector.selectOption('minimal');
  await expect(page.locator('.minimal-cover')).toBeAttached();
  await expect(page.locator('.formal-cover')).toHaveCount(0);
});

test('Classic image-count layout retains all images on A4 and numbering is unchanged', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('เทมเพลต', { exact: true }).selectOption('classic');
  const pages = page.locator('[data-portfolio-page][data-template=classic]');
  await expect(pages.first()).toHaveAttribute('data-page-section', 'cover');
  await expect(page.locator('main [data-page-number]').first()).toHaveText('1');
  const cards = page.locator('main [data-template=classic] .document-card');
  await expect(cards.first()).toBeVisible();
  const imageGroups = page.locator('main [data-template=classic] .document-images');
  for (const group of await imageGroups.all()) {
    const count = await group.locator('img').count();
    await expect(group).toHaveAttribute('data-image-count', String(count));
  }
});

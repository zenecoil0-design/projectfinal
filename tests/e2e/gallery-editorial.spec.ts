import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('Gallery Editorial renders a one-photo cover, a real sidebar profile and image-free Preface/TOC', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('เทมเพลต', { exact: true }).selectOption('minimal');
  const sheets = page.locator('main [data-portfolio-page][data-template="minimal"]');
  const cover = sheets.filter({ has: page.locator('[data-page-section="cover"]') });
  const coverPage = page.locator('main [data-portfolio-page][data-page-section="cover"]');
  await expect(coverPage).toHaveClass(/gallery-cover/);
  await expect(coverPage.locator('.gallery-cover-photo')).toBeAttached();
  await expect(coverPage.locator('.gallery-cover-title')).toBeAttached();
  const profile = page.locator('main [data-portfolio-page][data-page-section="profile"]');
  await expect(profile).toHaveClass(/gallery-profile/);
  await expect(profile.locator('.gallery-profile-sidebar')).toBeAttached();
  await expect(profile.locator('.gallery-profile-main')).toBeAttached();
  await expect(profile.locator('.gallery-profile-fields')).toBeAttached();
  for (const section of ['preface', 'toc']) {
    const pageSection = page.locator(`main [data-portfolio-page][data-page-section="${section}"]`);
    await expect(pageSection).toBeAttached();
    await expect(pageSection.locator('img')).toHaveCount(0);
  }
  for (const section of ['education','activity','certificate']) {
    await expect(page.locator(`main [data-portfolio-page][data-page-section="${section}"]`).first()).toBeAttached();
  }
});

test('Gallery Editorial remains scoped when the other two templates are selected', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const picker = page.getByLabel('เทมเพลต', { exact: true });
  await picker.selectOption('minimal');
  await expect(page.locator('main .gallery-cover')).toBeAttached();
  await picker.selectOption('modern');
  await expect(page.locator('main .creative-cover')).toBeAttached();
  await expect(page.locator('main .gallery-cover')).toHaveCount(0);
  await picker.selectOption('classic');
  await expect(page.locator('main .formal-cover')).toBeAttached();
  await expect(page.locator('main .gallery-cover')).toHaveCount(0);
});

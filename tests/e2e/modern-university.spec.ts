import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('Modern University uses split cover, two-column profile and all six A4 sections', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('เทมเพลต', { exact: true }).selectOption('modern');
  const cover = page.locator('main [data-portfolio-page][data-template="modern"][data-page-section="cover"]');
  await expect(cover).toHaveClass(/creative-cover/);
  await expect(cover.locator('.creative-cover-media')).toBeVisible();
  await expect(cover.locator('.creative-cover-content')).toBeVisible();
  await expect(cover.locator('.editorial-cover-title')).toBeVisible();
  const profile = page.locator('main [data-page-section="profile"]');
  await expect(profile).toHaveClass(/creative-profile/);
  await expect(profile.locator('.creative-profile-left')).toBeVisible();
  await expect(profile.locator('.creative-profile-right')).toBeVisible();
  await expect(profile.locator('.creative-profile-information')).toBeVisible();
  for (const section of ['preface','toc','education','activity','certificate']) {
    await expect(page.locator(`main [data-template="modern"][data-page-section="${section}"]`).first()).toBeAttached();
  }
  await expect(page.locator('main [data-page-number]').first()).toHaveText('1');
});

test('Modern University preserves image-count metadata, original entries and template isolation', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const template = page.getByLabel('เทมเพลต', { exact: true });
  await template.selectOption('modern');
  const groups = page.locator('main [data-template="modern"] .document-images');
  for (const group of await groups.all()) {
    const count = await group.locator('img').count();
    await expect(group).toHaveAttribute('data-image-count', String(count));
  }
  await template.selectOption('classic');
  await expect(page.locator('.formal-cover')).toBeAttached();
  await expect(page.locator('.creative-cover')).toHaveCount(0);
  await template.selectOption('minimal');
  await expect(page.locator('.gallery-cover')).toBeAttached();
  await expect(page.locator('.creative-cover')).toHaveCount(0);
});

test('Modern University cover displays an uploaded photo exactly once', async ({ page }) => {
  const image = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#8eb9c8"/></svg>');
  await page.route('**/rest/v1/covers?**', route => route.fulfill({ json: [{
    id: 'cover-modern', portfolio_id: 'a', title: 'PORTFOLIO',
    first_name: 'นักเรียน', last_name: 'ตัวอย่าง', school_name: 'โรงเรียนตัวอย่าง', cover_image_url: image,
  }] }));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('เทมเพลต', { exact: true }).selectOption('modern');
  const cover = page.locator('main [data-template="modern"][data-page-section="cover"]');
  await expect(cover.locator('img')).toHaveCount(1);
  await expect(cover.locator('img')).toHaveAttribute('alt', 'รูปหน้าปก');
});

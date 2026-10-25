import { test, expect } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('three color roles use template defaults, custom text affects Preview and reset restores Auto', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByRole('button', { name: /7\. สีและดาวน์โหลด/ }).click();
  const picker = page.getByRole('region', { name: /สีและดาวน์โหลด/ });
  const auto = picker.getByRole('checkbox', { name: /ปรับสีตัวอักษรอัตโนมัติ/ });
  await picker.getByRole('button', { name: /สีตัวอักษร/ }).click();
  await expect(auto).toBeChecked();
  await auto.uncheck();
  await picker.getByRole('textbox', { name: 'รหัสสี HEX' }).fill('#77513F');
  const preview = page.locator('main [data-portfolio-page]').first();
  await expect(preview).toHaveCSS('--portfolio-text', '#77513F');
  await picker.getByRole('button', { name: 'คืนค่าสีเริ่มต้น' }).click();
  await expect(auto).toBeChecked();
  await expect(preview).toHaveCSS('--portfolio-text', '#243449');
});

test('old palettes gain automatic text while preserving saved primary and secondary', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem(
    'portfolio-colors:v1:00000000-0000-0000-0000-000000000001:a',
    JSON.stringify({ primary: '#303F9F', secondary: '#DCE8F3' })
  ));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const cover = page.locator('main [data-portfolio-page]').first();
  await expect(cover).toHaveCSS('--portfolio-primary', '#303F9F');
  await expect(cover).toHaveCSS('--portfolio-secondary', '#DCE8F3');
  await expect(cover).toHaveCSS('--portfolio-text', '#243449');
});

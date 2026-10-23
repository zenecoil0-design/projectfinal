import { test, expect } from '@playwright/test';

test('Login fields are label-associated and password reveal is keyboard-accessible', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByRole('textbox', { name: 'อีเมล', exact: true });
  const password = page.getByLabel('รหัสผ่าน', { exact: true });
  await expect(email).toHaveAttribute('id', 'login-email');
  await expect(password).toHaveAttribute('id', 'login-password');
  await expect(password).toHaveAttribute('type', 'password');
  const show = page.getByRole('button', { name: 'แสดงรหัสผ่าน', exact: true });
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'ซ่อนรหัสผ่าน' })).toHaveAttribute('aria-pressed', 'true');
});

test('Register fields have accessible names and password reveal controls both fields', async ({ page }) => {
  await page.goto('/register');
  for (const [name, id] of [
    ['ชื่อผู้ใช้', 'register-username'],
    ['อีเมล', 'register-email'],
    ['รหัสผ่าน', 'register-password'],
    ['ยืนยันรหัสผ่าน', 'register-confirm-password'],
  ]) {
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute('id', id);
  }
  const password = page.getByLabel('รหัสผ่าน', { exact: true });
  const confirm = page.getByLabel('ยืนยันรหัสผ่าน', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'แสดงรหัสผ่าน' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(confirm).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'ซ่อนรหัสผ่าน' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirm).toHaveAttribute('type', 'password');
});

test('mobile auth inputs use readable 16px font without changing desktop sizing', async ({ page }) => {
  for (const route of ['/login', '/register']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    const inputs = page.locator('main input');
    const count = route === '/login' ? 2 : 4;
    await expect(inputs).toHaveCount(count);
    for (let index = 0; index < count; index++) {
      await expect(inputs.nth(index)).toHaveCSS('font-size', '16px');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(inputs).toHaveCount(count);
    for (let index = 0; index < count; index++) {
      await expect(inputs.nth(index)).toHaveCSS('font-size', '14px');
    }
  }
});

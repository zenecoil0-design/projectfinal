import { test, expect } from '@playwright/test';
import { openEditorSection } from './helpers/editor';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

test('accordion opens one or none, keyboard reopens, collapsing never saves or reloads or changes preview', async ({ page }, testInfo) => {
  let reads = 0; let writes = 0;
  page.on('request', request => { if (request.url().includes('/rest/v1/')) { if (request.method() === 'GET') reads++; else writes++; } });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const initialReads = reads;
  const pages = page.locator('[data-portfolio-page]');
  const pageCount = await pages.count();
  const preview = await page.locator('main').innerText();
  const headers = page.locator('aside button[aria-controls^="editor-panel-"]');
  await expect(headers).toHaveCount(6);
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('aside form')).toHaveCount(6);
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('แบบร่าง Accordion');
  await openEditorSection(page, 'preface');
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(1);
  const preface = page.locator('#editor-heading-preface');
  await preface.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
  await expect(page.locator('form:visible')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(preface).toHaveAttribute('aria-expanded', 'true');
  await openEditorSection(page, 'cover');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('แบบร่าง Accordion');
  await expect(page.locator('#editor-heading-cover')).toContainText('ยังไม่บันทึก');
  await expect(pages).toHaveCount(pageCount);
  await expect(page.locator('main')).toContainText('Saved Activity');
  await expect(page.locator('main')).toContainText('Saved Certificate');
  expect(preview).toContain('Saved Activity');
  expect(reads).toBe(initialReads); expect(writes).toBe(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: testInfo.outputPath(`accordion-${width}.png`) });
    expect(await page.locator('aside').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

test('save failure stays, success advances, last section never wraps, and a delayed save cannot steal navigation', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('รอบบันทึก');
  await page.route('**/rest/v1/covers?**', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, json: { message: 'Mock accordion save failure' } }) : route.continue());
  await page.locator('form:visible button[type=submit]').click();
  await expect(page.getByText('Mock accordion save failure')).toBeVisible();
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('รอบบันทึก');
  await page.unroute('**/rest/v1/covers?**');
  await page.locator('form:visible button[type=submit]').click();
  await expect(page.locator('#editor-heading-preface')).toHaveAttribute('aria-expanded', 'true');
  await openEditorSection(page, 'certificate');
  await page.locator('form:visible button[type=submit]').click();
  await expect(page.locator('form:visible [role=status]').filter({ hasText: 'เรียบร้อยแล้ว' })).toContainText('บันทึกเกียรติบัตรเรียบร้อยแล้ว');
  await expect(page.locator('#editor-heading-certificate')).toHaveAttribute('aria-expanded', 'true');

  let release = () => {};
  await page.route('**/rest/v1/covers?**', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await new Promise<void>(resolve => { release = resolve; });
    await route.continue();
  });
  await openEditorSection(page, 'cover');
  const saving = page.waitForRequest(request => request.url().includes('/rest/v1/covers?') && request.method() === 'POST');
  await page.locator('form:visible button[type=submit]').click(); await saving;
  await openEditorSection(page, 'profile');
  await openEditorSection(page, 'cover');
  release();
  await expect(page.locator('#editor-panel-cover [role=status]')).toContainText('เรียบร้อยแล้ว');
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#editor-heading-preface')).toHaveAttribute('aria-expanded', 'false');
});

test('cover, preface and profile drafts persist across mobile preview; folded controls leave the Tab order', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('ชื่อปกที่ยังไม่บันทึก');
  await openEditorSection(page, 'preface');
  await page.locator('#preface-text').fill('คำนำที่ยังไม่บันทึก');
  await page.locator('#preface-author').fill('ผู้จัดทำค้าง');
  await openEditorSection(page, 'profile');
  await page.locator('#profile-firstName').fill('ชื่อประวัติค้าง');
  await page.locator('#profile-nickname').fill('ชื่อเล่นค้าง');
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await expect(page.locator('aside')).toBeHidden();
  await expect(page.locator('main')).toContainText('ชื่อประวัติค้าง');
  await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
  await expect(page.locator('#editor-heading-profile')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#profile-nickname')).toHaveValue('ชื่อเล่นค้าง');
  await openEditorSection(page, 'preface');
  await expect(page.locator('#preface-text')).toHaveValue('คำนำที่ยังไม่บันทึก');
  await expect(page.locator('#preface-author')).toHaveValue('ผู้จัดทำค้าง');
  await openEditorSection(page, 'cover');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('ชื่อปกที่ยังไม่บันทึก');
  // Folding doesn't mark any of these draft stores saved.
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toContainText('หน้าปก');
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toContainText('คำนำ');
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toContainText('ประวัติส่วนตัว');
  await page.locator('#editor-heading-cover').click();
  await page.locator('#editor-heading-cover').focus();
  for (const section of ['preface', 'profile', 'education', 'activity', 'certificate']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#editor-heading-${section}`)).toBeFocused();
    if (section === 'preface') {
      // TOC has its own always-accessible control, not a folded form panel.
      await page.keyboard.press('Tab');
      await expect(page.locator('#visibility-toc')).toBeFocused();
    }
  }
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-editor-panel]')))).toBe(false);
  await page.locator('#profile-firstName').evaluate(element => (element as HTMLInputElement).focus());
  await expect(page.locator('#profile-firstName')).not.toBeFocused();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: testInfo.outputPath(`accordion-collapsed-${width}.png`) });
  }
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/editor/);
});

test('confirmed cover/profile crops retain valid object URLs through folding and mobile panels', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { revoked: string[] };
    state.revoked = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = url => { state.revoked.push(url); revoke(url); };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const sample = await page.request.get('http://127.0.0.1:54321/sample.png');
  const file = { name: 'accordion.png', mimeType: 'image/png', buffer: await sample.body() };
  for (const section of ['cover', 'profile']) {
    await openEditorSection(page, section);
    const form = page.locator(`#editor-panel-${section} form`);
    await form.locator('input[type=file]').setInputFiles(file);
    await page.getByLabel('สัดส่วนรูป').selectOption('1');
    await page.getByRole('button', { name: 'ตัดรูปและใช้รูปนี้', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    const picture = form.locator('img');
    await expect(picture).toHaveAttribute('src', /^blob:/);
    const source = (await picture.getAttribute('src'))!;
    await page.locator(`#editor-heading-${section}`).click();
    await openEditorSection(page, section);
    await expect(picture).toHaveAttribute('src', source);
    await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
    await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
    await expect(page.locator(`#editor-heading-${section}`)).toHaveAttribute('aria-expanded', 'true');
    await expect(picture).toHaveAttribute('src', source);
    expect(await picture.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(url => (window as typeof window & { revoked: string[] }).revoked.includes(url), source)).toBe(false);
    // A pending crop is transient; hiding its form must close it and keep the confirmed picture.
    await form.locator('input[type=file]').setInputFiles(file);
    await expect(page.locator('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect(page.locator('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    await expect(picture).toHaveAttribute('src', source);
  }
  // The desktop form is visible even if the last mobile tab was Preview.
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('aside')).toBeVisible();
  await page.locator('#editor-panel-profile input[type=file]').setInputFiles(file);
  await expect(page.locator('dialog')).toBeVisible();
  await page.locator('dialog').getByRole('button', { name: 'ยกเลิก', exact: true }).click();
});

test('folding cancels a pending crop worker and a late crop result cannot change the draft or reopen a dialog', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { releaseCrop?: () => void };
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
      toBlob.call(this, blob => { state.releaseCrop = () => callback(blob); }, type, quality);
    };
  });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  const original = await page.locator('#editor-panel-cover img').getAttribute('src');
  const sample = await page.request.get('http://127.0.0.1:54321/sample.png');
  await page.locator('#editor-panel-cover input[type=file]').setInputFiles({ name: 'late.png', mimeType: 'image/png', buffer: await sample.body() });
  await page.getByRole('button', { name: 'ตัดรูปและใช้รูปนี้', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as typeof window & { releaseCrop?: () => void }).releaseCrop)).toBe('function');
  // Native modal prevents physical background clicks; simulate a controlled section change.
  await page.locator('#editor-heading-preface').evaluate(button => (button as HTMLButtonElement).click());
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.evaluate(() => (window as typeof window & { releaseCrop?: () => void }).releaseCrop?.());
  await openEditorSection(page, 'cover');
  await expect(page.locator('#editor-panel-cover img')).toHaveAttribute('src', original!);
  await expect(page.locator('dialog')).toHaveCount(0);
  await expect(page.locator('#editor-heading-cover')).toContainText('พร้อมแก้ไข');
});

test('a late save from the previous portfolio never changes the new portfolio draft or open section', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('OLD PORTFOLIO DRAFT');
  let release = () => {};
  await page.route('**/rest/v1/covers?**', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await new Promise<void>(resolve => { release = resolve; }); await route.continue();
  });
  const pending = page.waitForRequest(request => request.url().includes('/rest/v1/covers?') && request.method() === 'POST');
  await page.locator('form:visible button[type=submit]').click(); await pending;
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.locator('a[href="/editor?portfolio=b"]').click();
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('');
  const response = page.waitForResponse(response => response.url().includes('/rest/v1/covers?') && response.request().method() === 'POST');
  release(); await (await response).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#editor-heading-cover')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('');
  await expect(page.locator('main')).not.toContainText('OLD PORTFOLIO DRAFT');
  await openEditorSection(page, 'profile');
  await expect(page.locator('#profile-firstName')).toHaveValue('');
  await openEditorSection(page, 'activity');
  await expect(page.locator('form:visible input[type=checkbox]').first()).not.toBeChecked();
});

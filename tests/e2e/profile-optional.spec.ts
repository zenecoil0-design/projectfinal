import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';
import { expectCurrentContents } from './helpers/toc';
import { execFileSync } from 'node:child_process';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ page, context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  await page.clock.setFixedTime(new Date('2040-06-15T12:00:00Z'));
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

const paper = (page: Page) => page.locator('main [data-portfolio-page][data-page-section=profile]');
async function ready(page: Page) {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await openEditorSection(page, 'profile');
}
async function expectNoExtras(page: Page) {
  for (const name of ['ข้อมูลการติดต่อ', 'ข้อมูลเพิ่มเติม', 'ช่องทางอื่นๆ :', 'เบอร์โทรศัพท์ :', 'อีเมล :', 'ที่อยู่ :', 'ความสามารถพิเศษ (Skills) :', 'คติประจำใจ (Motto) :']) {
    await expect(paper(page).getByText(name, { exact: true })).toHaveCount(0);
  }
  await expect(paper(page).locator('.profile-social-row')).toHaveCount(0);
}

test('empty/default social hides optional groups in all templates without hiding the profile page or basic fields', async ({ page }) => {
  await ready(page);
  await expect(page.getByLabel('แพลตฟอร์มช่องทางติดต่อ 1', { exact: true })).toHaveValue('facebook');
  await expect(page.getByLabel('ข้อมูลช่องทางติดต่อ 1', { exact: true })).toHaveValue('');
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expectNoExtras(page);
    await expect(paper(page)).toHaveCount(1);
    for (const name of ['วันเกิด :', 'อายุ :', 'โรงเรียน :', 'เกรดเฉลี่ย (GPAX) :']) await expect(paper(page).getByText(name, { exact: true })).toHaveCount(1);
    await expect(paper(page).getByText('อายุ :', { exact: true }).locator('..')).toHaveText('อายุ : —');
    await expect(page.locator('[data-portfolio-page]')).toHaveCount(7);
    await expect(paper(page).locator('[data-page-number]')).toHaveText('1');
    await expectCurrentContents(page);
  }
  // The content wrapper has only the basic-information group, not empty bordered groups.
  expect(await paper(page).evaluate(element => element.children[1].children.length)).toBe(1);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
});

test('whitespace is absent only in Preview; loaded form values and arrays are not rewritten', async ({ page, request }) => {
  const blank = ' \t ';
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: {
    phone: blank, contact_email: blank, address: ' \t\n ', talents: blank, motto: blank,
    social_links: [{ id: 'blank', platform: 'facebook', link: blank }],
    custom_fields: [{ id: 'blank', title: blank, value: blank }],
  } });
  let writes = 0;
  page.on('request', request => { if (request.url().includes('/rest/v1/profiles') && ['PATCH', 'POST'].includes(request.method())) writes++; });
  await ready(page);
  await expectNoExtras(page);
  await expect(page.locator('#profile-address')).toHaveValue(' \t\n ');
  await expect(page.getByLabel('ข้อมูลช่องทางติดต่อ 1', { exact: true })).toHaveValue(blank);
  await expect(page.locator('#profile-custom-title-blank')).toHaveValue(blank);
  await expect(page.locator('#profile-custom-value-blank')).toHaveValue(blank);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  expect(writes).toBe(0);
});

test('zero is content in every optional scalar and both list types', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: {
    phone: '0', contact_email: '0', address: '0', talents: '0', motto: '0',
    social_links: [{ id: 'zero', platform: 'line', link: '0' }],
    custom_fields: [{ id: 'zero', title: '0', value: '0' }],
  } });
  await ready(page);
  for (const label of ['เบอร์โทรศัพท์ :', 'อีเมล :', 'ที่อยู่ :', 'ความสามารถพิเศษ (Skills) :', 'คติประจำใจ (Motto) :']) {
    await expect(paper(page).getByText(label, { exact: true }).locator('..')).toHaveText(`${label} 0`);
  }
  await expect(paper(page).locator('.profile-social-row span:last-child')).toHaveText('0');
  await expect(paper(page).getByText('0 : 0', { exact: true })).toHaveCount(1);
});

const socials = [
  { id: 's0', platform: 'facebook', link: '' },
  { id: 's1', platform: 'line', link: '  ติดต่อทางไลน์  ' },
  { id: 's2', platform: 'instagram', link: ' \t ' },
  { id: 's3', platform: 'facebook', link: 'ช่องทางที่สอง' },
];
const customFields = [
  { id: 'f0', title: '', value: '' }, { id: 'f1', title: ' \t ', value: '  ' },
  { id: 'f2', title: '  หัวข้ออย่างเดียว  ', value: '  ' },
  { id: 'f3', title: '  ', value: '  ค่าอย่างเดียว  ' },
  { id: 'f4', title: 'หัวข้อครบ', value: 'รายละเอียดครบ' },
];
async function expectMixed(page: Page) {
  await expect(paper(page).getByText('ข้อมูลการติดต่อ', { exact: true })).toHaveCount(1);
  await expect(paper(page).getByText('ข้อมูลเพิ่มเติม', { exact: true })).toHaveCount(1);
  for (const label of ['เบอร์โทรศัพท์ :', 'อีเมล :', 'ความสามารถพิเศษ (Skills) :']) await expect(paper(page).getByText(label, { exact: true })).toHaveCount(0);
  await expect(paper(page).locator('.profile-social-row span:last-child')).toHaveText(['ติดต่อทางไลน์', 'ช่องทางที่สอง']);
  expect(await paper(page).locator('.profile-social-row span:last-child').allTextContents()).toEqual([socials[1].link, socials[3].link]);
  await expect(paper(page).locator('.profile-social-row a')).toHaveCount(0);
  const rows = paper(page).getByText('ข้อมูลเพิ่มเติม', { exact: true }).locator('..').locator(':scope > div');
  await expect(rows).toHaveText(['คติประจำใจ (Motto) : เรียนรู้ทุกวัน', 'หัวข้ออย่างเดียว', 'ค่าอย่างเดียว', 'หัวข้อครบ : รายละเอียดครบ']);
  expect(await rows.nth(1).textContent()).toBe(customFields[2].title);
  expect(await rows.nth(2).textContent()).toBe(customFields[3].value);
}

test('mixed social/custom entries retain order and raw values through all templates, Save/reload and portfolio switch', async ({ page, request }) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: {
    address: 'บ้านเลขที่ 123 กรุงเทพมหานคร', motto: 'เรียนรู้ทุกวัน', social_links: socials, custom_fields: customFields,
  } });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expectMixed(page);
    await expect(page.getByLabel('ข้อมูลช่องทางติดต่อ 1', { exact: true })).toHaveValue('');
    await expect(page.locator('[id^=profile-custom-title-]')).toHaveCount(5);
    await expectCurrentContents(page);
  }
  await page.getByLabel('ชื่อเล่น', { exact: true }).fill('ข้อมูลฉบับบันทึก');
  const write = page.waitForRequest(request => request.url().includes('/rest/v1/profiles?') && request.method() === 'PATCH');
  await page.locator('#editor-panel-profile form button[type=submit]').click();
  const payload = (await write).postDataJSON();
  expect(payload.social_links).toEqual(socials);
  expect(payload.custom_fields).toEqual(customFields);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
  await ready(page);
  await expectMixed(page);
  await expect(page.getByLabel('ชื่อเล่น', { exact: true })).toHaveValue('ข้อมูลฉบับบันทึก');
  await expect(page.locator('#profile-custom-title-f0')).toHaveValue('');
  await expect(page.locator('#profile-custom-title-f1')).toHaveValue(customFields[1].title);
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await openEditorSection(page, 'profile');
  await expectNoExtras(page);
  await expect(page.locator('#profile-address')).toHaveValue('');
  await expect(paper(page)).not.toContainText('บ้านเลขที่ 123');
});

test('editing and clearing optional content updates groups immediately without losing dirty draft, leave warning or export guards', async ({ page }) => {
  await ready(page);
  const phone = page.locator('#profile-phone'), skills = page.locator('#profile-skills');
  await phone.fill('0812345678');
  await expect(paper(page).getByText('ข้อมูลการติดต่อ', { exact: true })).toHaveCount(1);
  await expect(paper(page).getByText('ช่องทางอื่นๆ :', { exact: true })).toHaveCount(0);
  await expect(paper(page).getByText('ข้อมูลเพิ่มเติม', { exact: true })).toHaveCount(0);
  await skills.fill('วาดภาพ');
  await expect(paper(page).getByText('ข้อมูลเพิ่มเติม', { exact: true })).toHaveCount(1);
  await phone.fill('');
  await expect(paper(page).getByText('ข้อมูลการติดต่อ', { exact: true })).toHaveCount(0);
  await skills.fill('');
  await expectNoExtras(page);
  // A blank custom row stays in the form and remains a dirty change even though it renders no content.
  await page.getByRole('button', { name: '+ เพิ่มหัวข้อข้อมูลของตัวเอง', exact: true }).click();
  await expect(page.locator('[id^=profile-custom-title-]')).toHaveCount(1);
  await expectNoExtras(page);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('link', { name: 'กลับ Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/editor/);
  await expect(page.locator('[id^=profile-custom-title-]')).toHaveCount(1);
  await expect(page.locator('#profile-phone')).toHaveValue('');
});

test('optional groups fit desktop/mobile and the real PDF omits blank rows while retaining populated content', async ({ page, request }, info) => {
  await request.patch('http://127.0.0.1:54321/rest/v1/profiles?portfolio_id=eq.a', { data: {
    address: 'บ้านเลขที่ 123 กรุงเทพมหานคร', motto: 'เรียนรู้ทุกวัน', social_links: socials, custom_fields: customFields,
  } });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expectMixed(page);
    await paper(page).screenshot({ path: info.outputPath(`profile-${template}-1440.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('main')).toBeHidden();
  // Export while Preview is hidden: use the actual renderer and inspect the downloaded PDF.
  await expectCurrentContents(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  const pdfPath = info.outputPath('profile-optional.pdf');
  await (await download).saveAs(pdfPath);
  const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', pdfPath], { encoding: 'utf8' }));
  expect(audit.pages).toBe(7);
  expect(audit.uniqueRasters).toBe(7);
  for (const [width, height] of audit.boxes) { expect(width).toBeCloseTo(595.28, 1); expect(height).toBeCloseTo(841.89, 1); }
  await info.attach('profile-pdf-audit', { body: JSON.stringify(audit), contentType: 'application/json' });
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expectMixed(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await paper(page).screenshot({ path: info.outputPath(`profile-${template}-390.png`) });
  }
  await expect(paper(page).locator('[data-page-number]')).toHaveText('1');
});

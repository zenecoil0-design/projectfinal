import { test, expect, type Page } from '@playwright/test';

const sections = [
  { key: 'education', plural: 'educations', tab: 'ประวัติการศึกษา', add: 'เพิ่มประวัติการศึกษา', edit: 'แก้ไขประวัติการศึกษา', title: 'ชื่อสถานศึกษา *', titleKey: 'school_name' },
] as const;
type Section = typeof sections[number];
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

async function fixtures(page: Page, config: Section) {
  const longName = 'ชื่อรายการภาษาไทยยาวไม่มีช่องว่าง'.repeat(6);
  const state = { empty: false, failSave: false, deletes: 0, rows: [{ id: 'library-existing', user_id: user.id, [config.titleKey]: longName, level: 'มัธยมศึกษา', study_plan: '', gpa: null, logo_url: '', start_year: '', end_year: '', description: 'รายละเอียดภาษาไทยยาว'.repeat(10), organization: '', activity_date: null, issued_by: '', issued_date: null }] as Record<string, unknown>[] };
  await page.route('**/rest/v1/user_tags?**', route => route.fulfill({ json: [{ id: 'tag-long', name: 'Tagยาวไม่มีช่องว่าง'.repeat(7) }] }));
  await page.route(`**/rest/v1/user_library_${config.key}_tags?**`, route => route.fulfill({ json: [{ [`${config.key}_id`]: 'library-existing', tag_id: 'tag-long' }] }));
  await page.route(`**/rest/v1/user_library_${config.plural}?**`, async route => {
    const method = route.request().method();
    if (method === 'DELETE') { state.deletes++; return route.fulfill({ json: null }); }
    if (method === 'POST' || method === 'PATCH') {
      if (state.failSave) return route.fulfill({ status: 500, json: { message: 'Mock save failure' } });
      const body = route.request().postDataJSON();
      const id = new URL(route.request().url()).searchParams.get('id')?.replace('eq.', '');
      let row = state.rows.find(row => row.id === id);
      if (method === 'POST') { row = { id: 'library-created', ...body }; state.rows.push(row!); }
      else Object.assign(row!, body);
      return route.fulfill({ json: row });
    }
    return route.fulfill({ json: state.empty ? [] : state.rows });
  });
  return { state, longName };
}

async function openSection(page: Page, config: Section) {
  await page.goto('/my-data');
  await page.getByRole('group', { name: 'หมวดคลังข้อมูล' }).getByRole('button', { name: config.tab, exact: true }).click();
}

for (const config of sections) {
  test(`${config.key}: responsive cards, modal, failed save, retry, edit and cancel deletion`, async ({ page }, testInfo) => {
    const { state, longName } = await fixtures(page, config);
    await openSection(page, config);
    await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 568 : 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${config.key}-cards-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: config.add, exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByLabel(config.title, { exact: true }).fill('แบบร่างที่ยกเลิก');
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(dialog.getByRole('button', { name: /^บันทึก/ })).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`${config.key}-form-${width}.png`) });
      await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    await page.getByRole('button', { name: config.add, exact: true }).click();
    const dialog = page.getByRole('dialog');
    const title = dialog.getByLabel(config.title, { exact: true });
    await expect(title).toHaveValue('');
    await title.fill('ข้อมูลใหม่ที่บันทึกสำเร็จ');
    if (config.key === 'education') await dialog.getByLabel('ระดับการศึกษา *', { exact: true }).fill('มัธยมศึกษา');
    state.failSave = true;
    const alert = page.waitForEvent('dialog');
    await dialog.getByRole('button', { name: /^บันทึก/ }).click();
    const failure = await alert; expect(failure.type()).toBe('alert'); await failure.accept();
    await expect(title).toHaveValue('ข้อมูลใหม่ที่บันทึกสำเร็จ');
    state.failSave = false;
    await dialog.getByRole('button', { name: /^บันทึก/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'ข้อมูลใหม่ที่บันทึกสำเร็จ', exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('group', { name: 'หมวดคลังข้อมูล' }).getByRole('button', { name: config.tab, exact: true }).click();
    const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'ข้อมูลใหม่ที่บันทึกสำเร็จ', exact: true }) });
    await card.getByRole('button', { name: /แก้ไข/ }).click();
    await expect(dialog.getByLabel(config.title, { exact: true })).toHaveValue('ข้อมูลใหม่ที่บันทึกสำเร็จ');
    await dialog.getByLabel(config.title, { exact: true }).fill('ข้อมูลแก้ไข');
    await dialog.getByRole('button', { name: /^บันทึก/ }).click();
    await expect(page.getByRole('heading', { name: 'ข้อมูลแก้ไข', exact: true })).toBeVisible();
    page.once('dialog', async confirm => { expect(confirm.type()).toBe('confirm'); await confirm.dismiss(); });
    await page.locator('article').filter({ has: page.getByRole('heading', { name: 'ข้อมูลแก้ไข', exact: true }) }).getByRole('button', { name: /ลบ/ }).click();
    expect(state.deletes).toBe(0);
    await expect(page.getByRole('heading', { name: 'ข้อมูลแก้ไข', exact: true })).toBeVisible();
  });

  test(`${config.key}: empty library and image-picker cancellation`, async ({ page }) => {
    const { state } = await fixtures(page, config); state.empty = true;
    await openSection(page, config);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByText(/ยังไม่มี/).first()).toBeVisible();
    await page.getByRole('button', { name: config.add, exact: true }).click();
    const dialog = page.getByRole('dialog').first();
    const fileChooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: /เลือกโลโก้|เพิ่มรูปภาพ/ }).click();
    const chooser = await fileChooser;
    const image = await page.request.get('http://127.0.0.1:54321/sample.png');
    await chooser.setFiles({ name: 'mock.png', mimeType: 'image/png', buffer: await image.body() });
    await expect(page.locator('dialog')).toBeVisible();
    await page.locator('dialog').getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

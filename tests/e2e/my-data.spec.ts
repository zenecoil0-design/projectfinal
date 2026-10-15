import { test, expect, type Page } from '@playwright/test';

const sections = [
  { key: 'education', plural: 'educations', tab: 'ประวัติการศึกษา', add: 'เพิ่มประวัติการศึกษา', edit: 'แก้ไขประวัติการศึกษา', title: 'ชื่อสถานศึกษา *', titleKey: 'school_name' },
  { key: 'activity', plural: 'activities', tab: 'ผลงานและกิจกรรม', add: 'เพิ่มผลงานหรือกิจกรรม', edit: 'แก้ไขผลงานหรือกิจกรรม', title: 'ชื่อผลงาน / กิจกรรม *', titleKey: 'title' },
  { key: 'certificate', plural: 'certificates', tab: 'เกียรติบัตร', add: 'เพิ่มเกียรติบัตร', edit: 'แก้ไขเกียรติบัตร', title: 'ชื่อเกียรติบัตร / รางวัล *', titleKey: 'title' },
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
  const state = { account: user.id, mainError: false, tagsError: false, linksError: false, imageError: false, reads: 0, writes: 0, tagWrites: 0, loading: false, release: () => {}, empty: false, failSave: false, deletes: 0, rows: [{ id: 'library-existing', user_id: user.id, [config.titleKey]: longName, level: 'มัธยมศึกษา', study_plan: '', gpa: null, logo_url: '', start_year: '', end_year: '', description: 'รายละเอียดภาษาไทยยาว'.repeat(10), organization: '', activity_date: null, issued_by: '', issued_date: null }] as Record<string, unknown>[] };
  await page.route('**/auth/v1/user', route => route.fulfill({ json: { ...user, id: state.account } }));
  await page.route('**/rest/v1/user_tags?**', route => route.fulfill(state.tagsError ? { status: 500, json: { message: 'private database details' } } : { json: [{ id: 'tag-long', name: 'Tagยาวไม่มีช่องว่าง'.repeat(7) }] }));
  await page.route(`**/rest/v1/user_library_${config.key}_tags?**`, route => { if (route.request().method() !== 'GET') state.tagWrites++; return route.fulfill(state.linksError ? { status: 500, json: { message: 'private relationship details' } } : { json: [{ [`${config.key}_id`]: 'library-existing', tag_id: 'tag-long' }] }); });
  await page.route(`**/rest/v1/user_library_${config.plural}?**`, async route => {
    const method = route.request().method();
    if (method === 'DELETE') { state.deletes++; return route.fulfill({ json: null }); }
    if (method === 'POST' || method === 'PATCH') {
      state.writes++;
      if (state.failSave) return route.fulfill({ status: 500, json: { message: 'Mock save failure' } });
      const body = route.request().postDataJSON();
      const id = new URL(route.request().url()).searchParams.get('id')?.replace('eq.', '');
      let row = state.rows.find(row => row.id === id);
      if (method === 'POST') { row = { id: 'library-created', ...body }; state.rows.push(row!); }
      else Object.assign(row!, body);
      return route.fulfill({ json: row });
    }
    state.reads++;
    const response = { error: state.mainError, rows: state.empty ? [] : structuredClone(state.rows) };
    if (state.loading) await new Promise<void>(resolve => { state.release = resolve; });
    return route.fulfill(response.error ? { status: 500, json: { message: 'private database details' } } : { json: response.rows });
  });
  if (config.key !== 'education') {
    state.rows.push({ ...state.rows[0], id: 'library-no-image', [config.titleKey]: 'รายการไม่มีรูปและไม่มี Tags', description: '' });
    const pictures = [[80, 160], [160, 80]].map(([width, height]) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#2563eb"/><rect x="10" y="10" width="${width-20}" height="${height-20}" fill="#f59e0b"/></svg>`)}`);
    await page.route(`**/rest/v1/user_library_${config.key}_images?**`, route => route.fulfill(state.imageError ? { status: 500, json: { message: 'private image details' } } : { json: pictures.map((image_url, sort_order) => ({ id: `image-${sort_order}`, [`${config.key}_id`]: 'library-existing', image_url, sort_order })) }));
  }
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
      for (const image of await page.locator('article img').evaluateAll(images => images.map(img => ({ fit: getComputedStyle(img).objectFit, width: img.clientWidth, frame: img.parentElement!.clientWidth })))) {
        expect(image.width).toBeLessThanOrEqual(image.frame);
        expect(image.fit).toBe(config.key === 'activity' ? 'cover' : 'contain');
      }
      if (config.key !== 'education') {
        await page.locator('article').filter({ has: page.getByRole('heading', { name: longName, exact: true }) }).getByRole('button', { name: /แก้ไข/ }).click();
        const editing = page.getByRole('dialog');
        await expect(editing.locator('img')).toHaveCount(2);
        await expect(editing.getByLabel(config.title, { exact: true })).toHaveValue(longName);
        await expect(editing.getByRole('button', { name: /^บันทึก/ })).toBeInViewport();
        await page.screenshot({ path: testInfo.outputPath(`${config.key}-edit-${width}.png`) });
        await editing.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      }
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
    await page.getByRole('group', { name: 'หมวดคลังข้อมูล' }).getByRole('button', { name: config.key === 'education' ? 'ผลงานและกิจกรรม' : 'ประวัติการศึกษา', exact: true }).click();
    await page.getByRole('group', { name: 'หมวดคลังข้อมูล' }).getByRole('button', { name: config.tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'ข้อมูลแก้ไข', exact: true })).toBeVisible();
    page.once('dialog', async confirm => { expect(confirm.type()).toBe('confirm'); await confirm.dismiss(); });
    await page.locator('article').filter({ has: page.getByRole('heading', { name: 'ข้อมูลแก้ไข', exact: true }) }).getByRole('button', { name: /ลบ/ }).click();
    expect(state.deletes).toBe(0);
    await expect(page.getByRole('heading', { name: 'ข้อมูลแก้ไข', exact: true })).toBeVisible();
  });

  test(`${config.key}: failed load is not empty, retry is deduplicated, stale category response is ignored`, async ({ page }) => {
    const { state, longName } = await fixtures(page, config); state.mainError = true;
    await openSection(page, config);
    await expect(page.locator('main [role=alert]')).toContainText('โหลดรายการหรือรูปภาพไม่สำเร็จ');
    await expect(page.getByText(/ยังไม่มี/)).toHaveCount(0);
    await expect(page.getByText('private database details')).toHaveCount(0);
    state.mainError = false; state.loading = true;
    const before = state.reads;
    await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect(page.getByRole('button', { name: 'กำลังลองใหม่...' })).toBeDisabled();
    expect(state.reads).toBe(before + 1);
    // Unmount while an old successful response is pending; a newly mounted request must win.
    const release = () => state.release();
    await page.getByRole('group', { name: 'หมวดคลังข้อมูล' }).getByRole('button', { name: config.key === 'education' ? 'ผลงานและกิจกรรม' : 'ประวัติการศึกษา', exact: true }).click();
    state.loading = false; state.rows[0][config.titleKey] = 'ผลคำขอใหม่';
    await page.getByRole('group', { name: 'หมวดคลังข้อมูล' }).getByRole('button', { name: config.tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'ผลคำขอใหม่', exact: true })).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: longName, exact: true })).toHaveCount(0);
  });

  test(`${config.key}: account change invalidates an old pending response`, async ({ page }) => {
    const { state, longName } = await fixtures(page, config); state.loading = true;
    await openSection(page, config);
    await expect(page.getByRole('status')).toContainText('กำลังโหลด');
    const release = () => state.release();
    state.loading = false; state.account = '00000000-0000-0000-0000-000000000002'; state.rows[0][config.titleKey] = 'ข้อมูลบัญชีใหม่';
    const request = page.waitForRequest(request => request.url().includes(`user_library_${config.plural}?`) && new URL(request.url()).searchParams.get('user_id') === `eq.${state.account}`);
    await page.evaluate(owner => { const channel = new BroadcastChannel('sb-127-auth-token'); channel.postMessage({ event: 'SIGNED_IN', session: { user: { id: owner } } }); channel.close(); }, state.account);
    await request;
    await expect(page.getByRole('heading', { name: 'ข้อมูลบัญชีใหม่', exact: true })).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: longName, exact: true })).toHaveCount(0);
  });

  for (const failure of ['tagsError', 'linksError'] as const) {
    test(`${config.key}: ${failure} blocks writes, retry preserves draft and original tag selection`, async ({ page }) => {
      const { state, longName } = await fixtures(page, config); state[failure] = true;
      await openSection(page, config);
      await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
      await expect(page.locator('main [role=alert]')).toContainText('โหลด Tags ไม่สำเร็จ');
      await expect(page.locator('article').first().getByRole('button', { name: /แก้ไข/ })).toBeDisabled();
      await page.getByRole('button', { name: config.add, exact: true }).click();
      const form = page.getByRole('dialog');
      await form.getByLabel(config.title, { exact: true }).fill('แบบร่างต้องอยู่หลัง retry');
      await expect(form.getByRole('button', { name: /^บันทึก/ })).toBeDisabled();
      expect(state.writes).toBe(0); expect(state.tagWrites).toBe(0);
      state[failure] = false;
      await form.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
      await expect(form.getByRole('button', { name: /^บันทึก/ })).toBeEnabled();
      await expect(form.getByLabel(config.title, { exact: true })).toHaveValue('แบบร่างต้องอยู่หลัง retry');
      await form.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      await page.locator('article').first().getByRole('button', { name: /แก้ไข/ }).click();
      await expect(form.getByRole('button', { name: /Tagยาวไม่มีช่องว่าง/ })).toHaveAttribute('aria-pressed', 'true');
      expect(state.tagWrites).toBe(0);
    });
  }

  test(`${config.key}: failed refresh retains the previous successful list`, async ({ page }) => {
    const { state, longName } = await fixtures(page, config);
    await openSection(page, config);
    await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
    await page.getByRole('button', { name: config.add, exact: true }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel(config.title, { exact: true }).fill('รายการใหม่');
    if (config.key === 'education') await form.getByLabel('ระดับการศึกษา *', { exact: true }).fill('มัธยมศึกษา');
    state.mainError = true;
    await form.getByRole('button', { name: /^บันทึก/ }).click();
    await expect(form).toHaveCount(0);
    await expect(page.locator('main [role=alert]')).toContainText('กำลังแสดงข้อมูลที่โหลดไว้ก่อนหน้า');
    await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
    state.mainError = false;
    await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'รายการใหม่', exact: true })).toBeVisible();
  });

  test(`${config.key}: loading state waits for library response`, async ({ page }) => {
    const { state, longName } = await fixtures(page, config); state.loading = true;
    await openSection(page, config);
    await expect(page.getByRole('status').filter({ hasText: /กำลังโหลด/ })).toBeVisible();
    await expect(page.getByText(/ยังไม่มี/)).toHaveCount(0);
    state.loading = false; state.release();
    await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
  });

  test(`${config.key}: empty library and image-picker cancellation`, async ({ page }) => {
    const { state } = await fixtures(page, config); state.empty = true;
    await openSection(page, config);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByText(/ยังไม่มี/).first()).toBeVisible();
    await page.getByRole('button', { name: config.add, exact: true }).click();
    const dialog = page.getByRole('dialog').first();
    const fileChooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: /เลือกโลโก้|เพิ่มรูปภาพ|เพิ่มรูปเกียรติบัตร/ }).click();
    const chooser = await fileChooser;
    const image = await page.request.get('http://127.0.0.1:54321/sample.png');
    await chooser.setFiles({ name: 'mock.png', mimeType: 'image/png', buffer: await image.body() });
    await expect(page.locator('dialog')).toBeVisible();
    await page.locator('dialog').getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await dialog.locator('input[type=file]').setInputFiles({ name: 'mock.png', mimeType: 'image/png', buffer: await image.body() });
    await page.locator('dialog').getByRole('button', { name: 'ใช้รูปต้นฉบับ', exact: true }).click();
    await expect(dialog.locator('img')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

import { test, expect, type Page } from '@playwright/test';

const sections = [
  { section: 'education', plural: 'educations', step: 'การศึกษา', titleKey: 'school_name', heading: 'กรอกประวัติการศึกษา', nextHeading: 'กรอกผลงานและกิจกรรม', label: 'ประวัติการศึกษา' },
] as const;
type Section = typeof sections[number];
type Mode = 'ready' | 'loading' | 'error' | 'empty';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

async function fixtures(page: Page, config: Section) {
  const state = { mode: 'ready' as Mode, release: () => {} };
  const names = [`${config.label}ชื่อยาวไม่มีช่องว่าง`.repeat(3), 'รายการแนวนอน', 'รายการไม่มีรูปและไม่มีTags'];
  const ids = ['a', 'b', 'c'].map(suffix => `${config.section}-${suffix}`);
  const pictures = await page.evaluate(() => [[80, 160], [160, 80]].map(([width, height]) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#2563eb'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(10, 10, width - 20, height - 20);
    return canvas.toDataURL();
  }));
  await page.route('**/rest/v1/user_tags?**', route => route.fulfill({ json: [{ id: 'tag-1', name: 'Tagชื่อยาวมาก'.repeat(5) }, { id: 'tag-2', name: 'ไม่มีรายการตรงTag' }] }));
  await page.route(`**/rest/v1/user_library_${config.section}_tags?**`, route => route.fulfill({ json: ids.slice(0, 2).map(id => ({ [`${config.section}_id`]: id, tag_id: 'tag-1' })) }));
  await page.route(`**/rest/v1/user_library_${config.section}_images?**`, route => route.fulfill({ json: ids.slice(0, 2).map((id, index) => ({ id: `image-${index}`, [`${config.section}_id`]: id, image_url: pictures[index], sort_order: 0 })) }));
  await page.route(`**/rest/v1/user_library_${config.plural}?**`, async route => {
    if (state.mode === 'loading') await new Promise<void>(resolve => { state.release = resolve; });
    if (state.mode === 'error') return route.fulfill({ status: 500, json: { message: 'ทดสอบโหลดคลังล้มเหลว' } });
    const rows = ids.map((id, index) => ({ id, user_id: user.id, [config.titleKey]: names[index], level: 'มัธยมศึกษา', study_plan: 'แผนการเรียนและรายละเอียดรองที่ยาว', gpa: 3.5, logo_url: pictures[index] ?? null, start_year: '2023', end_year: '2026', description: index === 2 ? '' : 'รายละเอียดที่ไม่มีช่องว่าง'.repeat(5), organization: '', issued_by: '', activity_date: null, issued_date: null }));
    return route.fulfill({ json: state.mode === 'empty' ? [] : rows });
  });
  return { state, ids, names };
}

for (const config of sections) {
  test(`${config.section}: responsive checkbox cards preserve selection order, drafts and atomic saves`, async ({ page }, testInfo) => {
    const { ids, names } = await fixtures(page, config);
    await page.goto('/editor?portfolio=a');
    await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
    const open = () => page.locator('aside button').filter({ hasText: config.step }).first().click();
    await open();
    const form = page.locator('form:visible');
    const checkbox = (index: number) => form.getByRole('checkbox', { name: names[index], exact: true });
    await expect(checkbox(0)).toBeChecked();
    await checkbox(0).focus(); await page.keyboard.press('Space');
    await expect(checkbox(0)).not.toBeChecked();
    await expect(form.getByText('ยังไม่ได้เลือกรายการ', { exact: false })).toBeVisible();
    await form.locator('label').filter({ has: page.getByRole('checkbox', { name: names[2], exact: true }) }).click();
    await expect(checkbox(2)).toBeChecked();
    await checkbox(1).check(); await checkbox(0).check(); await checkbox(1).uncheck(); await checkbox(1).check();
    for (const [index, order] of [[2, 1], [0, 2], [1, 3]]) {
      await expect(form.locator('label').filter({ has: page.getByRole('checkbox', { name: names[index], exact: true }) })).toContainText(`ลำดับ ${order}`);
    }
    await expect(form.getByText('เลือกแล้ว 3 รายการ', { exact: true })).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await checkbox(0).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`${config.section}-${width}.png`) });
      const images = await form.locator('label img').evaluateAll(nodes => nodes.map(node => ({ fit: getComputedStyle(node).objectFit, width: node.clientWidth, frame: node.parentElement!.clientWidth })));
      for (const image of images) { expect(image.width).toBeLessThanOrEqual(image.frame); expect(['cover', 'contain']).toContain(image.fit); }
    }
    await form.getByRole('button', { name: 'ไม่มีรายการตรงTag', exact: true }).click();
    await expect(form.getByText('Tag นี้', { exact: false })).toBeVisible();
    await expect(form.getByText('เลือกแล้ว 3 รายการ', { exact: true })).toBeVisible();
    await form.getByRole('button', { name: 'ทั้งหมด', exact: true }).click();
    await page.locator('aside button').filter({ hasText: 'ปก' }).first().click(); await open();
    for (const index of [0, 1, 2]) await expect(checkbox(index)).toBeChecked();
    await page.route('**/rest/v1/rpc/replace_portfolio_selection', async route => {
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ status: 500, json: { message: 'ทดสอบบันทึกคลังล้มเหลว' } });
    });
    const submit = form.locator('button[type=submit]');
    await submit.click(); await expect(submit).toBeDisabled();
    await expect(form.getByRole('alert')).toContainText('ทดสอบบันทึกคลังล้มเหลว');
    for (const index of [0, 1, 2]) await expect(checkbox(index)).toBeChecked();
    page.once('dialog', dialog => dialog.dismiss());
    await form.getByRole('link', { name: `จัดการ${config.label}ในคลัง`, exact: true }).click();
    await expect(page).toHaveURL(/editor/);
    await page.unroute('**/rest/v1/rpc/replace_portfolio_selection');
    const request = page.waitForRequest(request => request.url().endsWith('/rpc/replace_portfolio_selection') && request.method() === 'POST');
    await submit.click();
    expect((await request).postDataJSON().p_item_ids).toEqual([ids[2], ids[0], ids[1]]);
    await expect(page.getByRole('heading', { name: config.nextHeading, exact: true })).toBeVisible();
    await open(); await expect(form.getByRole('status').filter({ hasText: 'เรียบร้อยแล้ว' })).toBeVisible();
    await page.reload(); await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible(); await open();
    for (const [index, order] of [[2, 1], [0, 2], [1, 3]]) {
      await expect(checkbox(index)).toBeChecked();
      await expect(form.locator('label').filter({ has: page.getByRole('checkbox', { name: names[index], exact: true }) })).toContainText(`ลำดับ ${order}`);
    }
  });

  test(`${config.section}: loading, failed load, empty library and empty filter are distinct`, async ({ page }) => {
    const { state } = await fixtures(page, config);
    state.mode = 'loading';
    await page.goto('/editor?portfolio=a');
    const open = () => page.locator('aside button').filter({ hasText: config.step }).first().click();
    await open(); const form = page.locator('form:visible');
    await expect(form.getByText(`กำลังโหลด${config.label}...`, { exact: true })).toBeVisible();
    await expect(form.locator('button[type=submit]')).toBeDisabled();
    state.mode = 'ready'; state.release();
    await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
    await form.getByRole('button', { name: 'ไม่มีรายการตรงTag', exact: true }).click();
    await expect(form.getByText('Tag นี้', { exact: false })).toBeVisible();
    await expect(form.getByText(`ยังไม่มี${config.label}ในคลัง`, { exact: true })).toHaveCount(0);
    state.mode = 'error'; await page.reload(); await open();
    await expect(form.getByRole('alert')).toContainText('ทดสอบโหลดคลังล้มเหลว');
    await expect(form.getByText(`ยังไม่มี${config.label}ในคลัง`, { exact: true })).toHaveCount(0);
    await expect(form.locator('button[type=submit]')).toBeDisabled();
    state.mode = 'empty'; await page.reload(); await open();
    await expect(form.getByText(`ยังไม่มี${config.label}ในคลัง`, { exact: true })).toBeVisible();
    await expect(form.getByRole('link', { name: 'ไปเพิ่มข้อมูล', exact: true })).toHaveAttribute('href', '/my-data');
    await expect(form.getByRole('checkbox')).toHaveCount(0);
  });
}

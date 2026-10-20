import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { openEditorSection } from './helpers/editor';
import { expectCurrentContents } from './helpers/toc';
import { visibilitySections, visibilityNames, type VisibilitySection } from '../../src/lib/editor/section-visibility';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

const paper = (page: Page, section: string) => page.locator(`main [data-page-section=${section}]`);
async function ready(page: Page, portfolio = 'a') {
  await page.goto(`/editor?portfolio=${portfolio}`);
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
}
async function toggle(page: Page, section: VisibilitySection, visible: boolean) {
  if (section !== 'toc') await openEditorSection(page, section);
  const control = page.getByRole('switch', { name: `แสดง${visibilityNames[section]}บน A4`, exact: true });
  await expect(control).toBeEnabled();
  if (await control.isChecked() !== visible) await control.click();
  if (visible) await expect(control).toBeChecked(); else await expect(control).not.toBeChecked();
  await expect(control).toBeEnabled();
}
async function many(page: Page) {
  await page.route('**/rest/v1/user_library_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ id: `e-${i}`, school_name: `โรงเรียนลำดับ ${i} ` + 'รายละเอียดโรงเรียนภาษาไทย '.repeat(4), level: 'มัธยมศึกษา', study_plan: 'วิทยาศาสตร์และคณิตศาสตร์', gpa: 3.5, start_year: '2566', end_year: '2569' })) }));
  await page.route('**/rest/v1/portfolio_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ education_id: `e-${i}`, sort_order: i })) }));
  await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: Array.from({ length: 10 }, (_, i) => ({ id: `a-${i}`, title: `ORDER ${i} / ผลงานภาษาไทย`, description: 'รายละเอียดกิจกรรมและการเรียนรู้ภาษาไทย\n'.repeat(20) })) }));
  await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: Array.from({ length: 10 }, (_, i) => ({ activity_id: `a-${i}`, sort_order: i })) }));
}

test('each optional section persists through reload, cover has no switch, keyboard controls are outside header buttons', async ({ page }) => {
  await ready(page);
  await expect(page.locator('input#visibility-cover')).toHaveCount(0);
  for (const section of visibilitySections) {
    await toggle(page, section, false);
    await expect(paper(page, section)).toHaveCount(0);
    await page.reload();
    if (section !== 'toc') await openEditorSection(page, section);
    await expect(page.locator(`#visibility-${section}`)).not.toBeChecked();
    await expect(paper(page, section)).toHaveCount(0);
    const control = page.locator(`#visibility-${section}`);
    expect(await control.evaluate(el => el.closest('button') === null)).toBe(true);
    await control.focus(); await control.press('Space');
    await expect(control).toBeChecked(); await expect(paper(page, section).first()).toBeAttached();
    await expect(page.getByText('7 หน้า', { exact: true })).toBeVisible();
  }
  await expectCurrentContents(page);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toHaveCount(0);
});

test('hidden profile retains text and confirmed crop, selection order/dirty survive hide, folding and mobile panels', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
  await openEditorSection(page, 'profile');
  const form = page.locator('#editor-panel-profile form');
  const first = page.locator('#profile-firstName');
  await first.fill('Visibility draft');
  const image = await (await page.request.get('http://127.0.0.1:54321/sample.png')).body();
  await form.locator('input[type=file]').setInputFiles({ name: 'visibility.png', mimeType: 'image/png', buffer: image });
  await page.getByLabel('สัดส่วนรูป').selectOption('1');
  await page.getByRole('button', { name: 'ตัดรูปและใช้รูปนี้', exact: true }).click();
  await expect(form.locator('img')).toHaveAttribute('src', /^blob:/);
  const source = await form.locator('img').getAttribute('src');
  await toggle(page, 'profile', false);
  await expect(page.getByText('หมวดนี้ไม่แสดงบน A4 และ PDF ข้อมูลยังอยู่และแก้ไขได้')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('visibility-form-390.png') });
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await expect(paper(page, 'profile')).toHaveCount(0);
  await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
  await toggle(page, 'profile', true);
  await expect(first).toHaveValue('Visibility draft'); await expect(form.locator('img')).toHaveAttribute('src', source!);
  expect(await form.locator('img').evaluate(el => (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await openEditorSection(page, 'education');
  await page.locator('#editor-panel-education form input[type=checkbox]').uncheck();
  await toggle(page, 'education', false); await toggle(page, 'education', true);
  await expect(page.locator('#editor-panel-education form input[type=checkbox]')).not.toBeChecked();
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await page.locator('#editor-heading-education').click();
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
  await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
  await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
  await openEditorSection(page, 'profile'); await expect(first).toHaveValue('Visibility draft');
});

test('load failure is not all-on; retry deduplicates and preserves content draft', async ({ page }) => {
  let reads = 0; let failReads = true;
  await page.route('**/rest/v1/portfolio_section_visibility?**', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    reads++; if (failReads) return route.fulfill({ status: 403, json: { message: 'private catalog error' } });
    return route.fulfill({ json: [{ section: 'profile', visible: false }] });
  });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByRole('alert').filter({ hasText: 'โหลดการแสดงหมวดไม่สำเร็จ' })).toBeVisible();
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(0);
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('Keep while retry');
  const retry = page.getByRole('button', { name: 'ลองใหม่การแสดงหมวด', exact: true });
  const before = reads; failReads = false;
  await retry.evaluate(el => { (el as HTMLButtonElement).click(); (el as HTMLButtonElement).click(); });
  await expect(paper(page, 'education')).toHaveCount(1); await expect(paper(page, 'profile')).toHaveCount(0);
  expect(reads - before).toBe(1);
  await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('Keep while retry');
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await expect(page.locator('body')).not.toContainText('private catalog error');
});

test('failed write keeps confirmed preview, retry sends just one key and never marks dirty content saved', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  let writes = 0; const payloads: unknown[] = [];
  await page.route('**/rest/v1/portfolio_section_visibility?**', route => {
    if (route.request().method() !== 'POST') return route.continue();
    writes++; payloads.push(route.request().postDataJSON());
    if (writes === 1) return route.fulfill({ status: 500, json: { message: 'internal write detail' } });
    return route.continue();
  });
  await page.getByLabel('ชื่อบนหน้าปก', { exact: true }).fill('Unchanged dirty');
  await openEditorSection(page, 'activity'); await page.locator('#visibility-activity').click();
  await expect(page.getByRole('alert').filter({ hasText: 'ยืนยันการแสดงหมวดไม่สำเร็จ' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('visibility-error-1440.png') });
  await expect(paper(page, 'activity')).toHaveCount(1); await expect(page.locator('#visibility-activity')).toBeChecked();
  await page.getByRole('button', { name: 'ลองใหม่การแสดงหมวด', exact: true }).click();
  await expect(paper(page, 'activity')).toHaveCount(0);
  expect(writes).toBe(2); expect(payloads).toEqual(Array(2).fill({ portfolio_id: 'a', section: 'activity', visible: false }));
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await openEditorSection(page, 'cover'); await expect(page.getByLabel('ชื่อบนหน้าปก', { exact: true })).toHaveValue('Unchanged dirty');
  await expect(page.locator('body')).not.toContainText('internal write detail');
});

test('saving is non-optimistic and synchronous duplicate switches/export do not create overlapping work', async ({ page }) => {
  await ready(page); await openEditorSection(page, 'profile');
  let release: () => void = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let writes = 0; let downloads = 0;
  page.on('download', () => downloads++);
  await page.route('**/rest/v1/portfolio_section_visibility?**', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    writes++; await gate; await route.continue();
  });
  await page.evaluate(() => {
    const toggle = document.querySelector<HTMLInputElement>('#visibility-profile')!;
    toggle.click(); toggle.click();
    [...document.querySelectorAll('button')].find(el => el.textContent === 'ดาวน์โหลด PDF')!.click();
  });
  await expect(page.getByText('กำลังบันทึกการแสดงประวัติส่วนตัว…', { exact: true })).toBeVisible();
  await expect(paper(page, 'profile')).toHaveCount(1); await expect(page.locator('#visibility-profile')).toBeChecked();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await expect.poll(() => writes).toBe(1); expect(downloads).toBe(0);
  release(); await expect(paper(page, 'profile')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
});

for (const operation of ['load', 'save']) for (const destination of ['portfolio', 'account']) {
  test(`late visibility ${operation} after ${destination} change cannot enter the next session`, async ({ page }) => {
    let release: () => void = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    let started = false; let settled = false;
    await page.route('**/rest/v1/portfolio_section_visibility?**', async route => {
      const request = route.request(); const url = new URL(request.url());
      const old = operation === 'load' ? request.method() === 'GET' && url.searchParams.get('portfolio_id') === 'eq.a' : request.method() === 'POST' && request.postDataJSON().portfolio_id === 'a';
      if (!old) return route.continue();
      started = true;
      await gate; await route.fulfill({ json: operation === 'load' ? [{ section: 'profile', visible: false }] : { section: 'profile', visible: false } }); settled = true;
    });
    if (operation === 'load') await page.goto('/editor?portfolio=a');
    else { await ready(page); await openEditorSection(page, 'profile'); await page.locator('#visibility-profile').click(); }
    await expect.poll(() => started).toBe(true);
    if (destination === 'portfolio') {
      await page.evaluate(() => history.pushState(null, '', '/editor?portfolio=b'));
      await expect(page.getByText('Portfolio B', { exact: true })).toBeVisible();
      await expect(paper(page, 'profile')).toHaveCount(1);
      release(); await expect.poll(() => settled).toBe(true); await openEditorSection(page, 'profile'); await expect(page.locator('#visibility-profile')).toBeChecked();
    } else {
      await page.evaluate(user => { const c = new BroadcastChannel('sb-127-auth-token'); c.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); c.close(); }, user);
      await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
      release(); await expect.poll(() => settled).toBe(true); await expect(page.locator('[data-page-layout], [role=switch]')).toHaveCount(0);
    }
  });
}

test('multi-page hidden sections recalculate TOC/printed starts; all-content-off retains TOC preference and cover', async ({ page }) => {
  await many(page); await ready(page); await page.getByLabel('เทมเพลต', { exact: true }).selectOption('minimal');
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(18);
  await toggle(page, 'education', false); await toggle(page, 'profile', false);
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(14); await expectCurrentContents(page);
  await expect(page.locator('[data-toc-page]')).toHaveText(['1', '11']);
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(paper(page, 'profile')).toHaveCount(0); await expect(paper(page, 'education')).toHaveCount(0); await expectCurrentContents(page);
  }
  await toggle(page, 'toc', false); await expect(page.locator('[data-portfolio-page]')).toHaveCount(13);
  await expect(page.locator('[data-page-number]')).toHaveText(Array.from({ length: 11 }, (_, i) => String(i + 1)));
  await toggle(page, 'activity', false); await toggle(page, 'certificate', false); await toggle(page, 'preface', false); await toggle(page, 'toc', true);
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(1); await expect(page.locator('#visibility-toc')).toBeChecked();
  await expect(page.getByText('1 หน้า', { exact: true })).toBeVisible(); await expect(paper(page, 'toc')).toHaveCount(0);
  await toggle(page, 'certificate', true); await expect(page.locator('[data-portfolio-page]')).toHaveCount(3);
  await expect(page.locator('[data-toc-page]')).toHaveText(['1']); await expect(page.locator('[data-page-number]')).toHaveText(['1']);
  await toggle(page, 'activity', true); await toggle(page, 'education', true); await toggle(page, 'profile', true);
  await expect(page.locator('main .education-card h3')).toHaveText(Array.from({ length: 9 }, (_, i) => `โรงเรียนลำดับ ${i} ` + 'รายละเอียดโรงเรียนภาษาไทย '.repeat(4)));
});

test('portfolio overrides remain independent and navigating to a hidden section preserves Preview scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await ready(page);
  await toggle(page, 'profile', false);
  await openEditorSection(page, 'activity');
  await expect.poll(() => paper(page, 'activity').evaluate(el => Math.round(el.getBoundingClientRect().top - document.querySelector('main')!.getBoundingClientRect().top))).toBe(24);
  const top = await page.locator('main').evaluate(el => el.scrollTop);
  await openEditorSection(page, 'profile');
  await expect(page.locator('main')).toHaveJSProperty('scrollTop', top);
  await expect(page.getByText('หมวดนี้ไม่แสดงบน A4 และ PDF ข้อมูลยังอยู่และแก้ไขได้')).toBeVisible();
  await page.evaluate(() => history.pushState(null, '', '/editor?portfolio=b'));
  await expect(paper(page, 'profile')).toHaveCount(1); await toggle(page, 'education', false);
  await page.evaluate(() => history.pushState(null, '', '/editor?portfolio=a'));
  await expect(paper(page, 'profile')).toHaveCount(0); await expect(paper(page, 'education')).toHaveCount(1);
  await page.reload(); await expect(paper(page, 'profile')).toHaveCount(0); await expect(paper(page, 'education')).toHaveCount(1);
});

test('two tabs write different section keys without lost updates; the other tab stays stale until reload', async ({ page, context }) => {
  await ready(page);
  const other = await context.newPage();
  try {
    await ready(other);
    await toggle(page, 'profile', false);
    await expect(paper(other, 'profile')).toHaveCount(1); // no realtime sync is promised
    await toggle(other, 'activity', false);
    const rows = await (await page.request.get('http://127.0.0.1:54321/rest/v1/portfolio_section_visibility?portfolio_id=eq.a')).json();
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: 'profile', visible: false }),
      expect.objectContaining({ section: 'activity', visible: false }),
    ]));
    await page.reload(); await other.reload();
    for (const tab of [page, other]) {
      await expect(paper(tab, 'profile')).toHaveCount(0); await expect(paper(tab, 'activity')).toHaveCount(0);
      await expect(paper(tab, 'education')).toHaveCount(1);
    }
  } finally { await other.close(); }
});

test('hiding a failed main section does not unlock export, while Tags-only failure still permits ready content', async ({ page }) => {
  await page.route('**/rest/v1/profiles?**', route => route.fulfill({ status: 500, json: { message: 'main failed' } }));
  await page.goto('/editor?portfolio=a');
  await expect(page.locator('#visibility-toc')).toBeEnabled(); await toggle(page, 'profile', false);
  await expect(page.getByText('โหลดข้อมูลไม่ครบ กรุณาตรวจสอบข้อความในแบบฟอร์มแล้วรีเฟรชก่อนดูตัวอย่าง', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await page.unroute('**/rest/v1/profiles?**');
  await page.route('**/rest/v1/user_tags?**', route => route.fulfill({ status: 500, json: { message: 'tags failed' } }));
  await page.reload();
  await expect(page.getByText('ข้อมูลรายการหลักพร้อม แต่โหลด Tags ไม่ครบ:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
  await toggle(page, 'education', false);
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeEnabled();
});

test('late images with withheld ResizeObserver export the latest visible pages from hidden mobile Preview', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.addInitScript(() => {
    const state = { hold: false, suppressed: 0 };
    (window as unknown as { visibilityResize: typeof state }).visibilityResize = state;
    const Native = ResizeObserver;
    window.ResizeObserver = class extends Native { constructor(callback: ResizeObserverCallback) { super((entries, observer) => { if (state.hold) state.suppressed++; else callback(entries, observer); }); } };
  });
  let release: () => void = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const image = await (await request.get('http://127.0.0.1:54321/sample.png')).body();
  await page.route('**/visibility-late.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: image }); });
  await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: [0, 1].map(i => ({ id: `late-${i}`, title: `LATE ${i}`, description: 'รายละเอียดกิจกรรมภาษาไทย\n'.repeat(5) })) }));
  await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: [0, 1].map(i => ({ activity_id: `late-${i}`, sort_order: i })) }));
  await page.route('**/rest/v1/user_library_activity_images?**', route => route.fulfill({ json: [0, 1].map(i => ({ id: `img-${i}`, activity_id: `late-${i}`, image_url: 'http://127.0.0.1:54321/visibility-late.png', sort_order: 0 })) }));
  await ready(page); await toggle(page, 'profile', false);
  await expect(page.locator('[data-toc-page]')).toHaveText(['1', '2', '3']);
  await page.evaluate(() => { (window as unknown as { visibilityResize: { hold: boolean } }).visibilityResize.hold = true; });
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  await expect(page.getByRole('button', { name: 'กำลังส่งออก…', exact: true })).toBeDisabled();
  await expect(page.locator('#visibility-profile')).toBeDisabled(); release();
  const file = testInfo.outputPath('visibility-late.pdf'); await (await download).saveAs(file);
  await expect(paper(page, 'profile')).toHaveCount(0); await expect(paper(page, 'activity')).toHaveCount(2);
  await expect(page.locator('[data-toc-page]')).toHaveText(['1', '2', '4']);
  await expect(paper(page, 'certificate').locator('[data-page-number]')).toHaveText('4');
  const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', file], { encoding: 'utf8' }));
  expect(audit.pages).toBe(7);
  expect(await page.evaluate(() => (window as unknown as { visibilityResize: { suppressed: number } }).visibilityResize.suppressed)).toBeGreaterThan(0);
});

for (const template of ['classic', 'modern', 'minimal']) {
  test(`real ${template} visibility PDF excludes hidden pages and matches current TOC/numbering`, async ({ page }, testInfo) => {
    const mobile = template === 'minimal'; if (mobile) await many(page);
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 1000 : 1600 });
    await ready(page); await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await toggle(page, 'profile', false); if (mobile) await toggle(page, 'education', false);
    await page.locator(`#editor-heading-${mobile ? 'education' : 'profile'}`).click();
    await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    const count = mobile ? 14 : 6;
    await expect(page.locator('[data-portfolio-page]')).toHaveCount(count); await expectCurrentContents(page);
    await expect(page.locator('[data-toc-page]')).toHaveText(mobile ? ['1', '11'] : ['1', '2', '3']);
    if (mobile) await expect(page.locator('main')).toBeHidden();
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
    const file = testInfo.outputPath(`visibility-${template}.pdf`); await (await download).saveAs(file);
    const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', file], { encoding: 'utf8' }));
    expect(audit.pages).toBe(count); expect(audit.uniqueRasters).toBe(count);
    for (const [w, h] of audit.boxes) { expect(w).toBeCloseTo(595.28, 1); expect(h).toBeCloseTo(841.89, 1); }
    await testInfo.attach('visibility-pdf-audit', { body: JSON.stringify(audit), contentType: 'application/json' });
    if (mobile) await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
    await page.locator('.paper-frame:has([data-page-section=toc])').screenshot({ path: testInfo.outputPath(`visibility-toc-${template}.png`) });
    if (mobile) await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
    await toggle(page, 'profile', true); if (mobile) await toggle(page, 'education', true);
    await expect(page.locator('[data-portfolio-page]')).toHaveCount(mobile ? 18 : 7);
    await expect(paper(page, 'profile')).toContainText('Alpha Student');
  });
}

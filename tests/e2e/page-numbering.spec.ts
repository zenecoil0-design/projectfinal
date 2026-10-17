import { test, expect, type Page } from '@playwright/test';
import { openEditorSection } from './helpers/editor';
import { execFileSync } from 'node:child_process';

const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
test.beforeEach(async ({ context, request }) => {
  await request.get('http://127.0.0.1:54321/__reset');
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${part({ alg: 'HS256' })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + part(session), domain: '127.0.0.1', path: '/' }]);
});

async function assertNumbering(page: Page) {
  await expect.poll(() => page.locator('main [data-page-number]').allTextContents()).toEqual(
    Array.from({ length: await page.locator('main [data-portfolio-page]').count() - 2 }, (_, index) => String(index + 1)));
  const pages = page.locator('main [data-portfolio-page]');
  const total = await pages.count();
  await expect(pages.nth(0).locator('[data-page-number]')).toHaveCount(0);
  await expect(pages.nth(1).locator('[data-page-number]')).toHaveCount(0);
  await expect(page.getByText(`${total} หน้า`, { exact: true })).toBeVisible();
  expect(await pages.evaluateAll(nodes => nodes.map(node => Number((node as HTMLElement).dataset.physicalPage)))).toEqual(Array.from({ length: total }, (_, i) => i + 1));
}

test('all templates number six physical pages as unnumbered, unnumbered, 1–4 without changing footer structure', async ({ page }) => {
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  for (const template of ['classic', 'modern', 'minimal']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(page.locator(`[data-portfolio-page][data-template=${template}]`)).toHaveCount(6);
    await assertNumbering(page);
    if (template === 'modern') await expect(page.locator('.editorial-cover-bottom')).not.toContainText('01 /');
    const firstChildren = await page.locator('[data-page-section=profile]').evaluate(el => Array.from(el.children).map(node => node.tagName));
    expect(firstChildren).toEqual(['DIV', 'DIV', 'DIV']);
    expect(await page.locator('[data-page-number]').count()).toBe(4); // measurement/clones do not add numbers
    await expect(page.locator('main')).not.toContainText('1 / 1');
  }
  const before = await page.locator('main').innerText();
  await page.locator('#editor-heading-cover').click();
  await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
  expect(await page.locator('main').innerText()).toBe(before);
  await assertNumbering(page);
});

for (const template of ['classic', 'modern', 'minimal']) {
  test(`actual ${template} PDF prints continuous numbers matching current physical pages`, async ({ page }, testInfo) => {
    const many = template === 'minimal';
    await page.setViewportSize({ width: many ? 390 : 1440, height: many ? 1000 : 1600 });
    if (many) {
      await page.route('**/rest/v1/user_library_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ id: `e-${i}`, school_name: `โรงเรียนลำดับ ${i} ` + 'รายละเอียดโรงเรียนภาษาไทย '.repeat(4), level: 'มัธยมศึกษา', study_plan: 'วิทยาศาสตร์และคณิตศาสตร์', gpa: 3.5, start_year: '2566', end_year: '2569' })) }));
      await page.route('**/rest/v1/portfolio_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ education_id: `e-${i}`, sort_order: i })) }));
      await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: Array.from({ length: 10 }, (_, i) => ({ id: `a-${i}`, title: `ORDER ${i} / ผลงานภาษาไทย`, description: 'รายละเอียดกิจกรรมและการเรียนรู้ภาษาไทย\n'.repeat(20) })) }));
      await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: Array.from({ length: 10 }, (_, i) => ({ activity_id: `a-${i}`, sort_order: i })) }));
    }
    await page.goto('/editor?portfolio=a');
    await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(page.locator(`[data-portfolio-page][data-template=${template}]`).first()).toBeAttached();
    if (many) await expect.poll(() => page.locator('[data-portfolio-page]').count()).toBeGreaterThan(10);
    else await expect(page.locator('[data-portfolio-page]')).toHaveCount(6);
    await assertNumbering(page);
    const mapping = await page.locator('main [data-portfolio-page]').evaluateAll(nodes => nodes.map(node => ({ section: (node as HTMLElement).dataset.pageSection, printed: node.querySelector('[data-page-number]')?.textContent ?? null })));
    await page.locator('#editor-heading-cover').click();
    await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    if (many) await expect(page.locator('main')).toBeHidden();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
    const path = testInfo.outputPath(`numbered-${template}.pdf`);
    await (await download).saveAs(path);
    const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', path], { encoding: 'utf8' }));
    expect(audit.pages).toBe(mapping.length); expect(audit.uniqueRasters).toBe(mapping.length);
    for (const [width, height] of audit.boxes) { expect(width).toBeCloseTo(595.28, 1); expect(height).toBeCloseTo(841.89, 1); }
    await assertNumbering(page);
    await testInfo.attach('numbering-audit', { body: JSON.stringify({ ...audit, mapping }), contentType: 'application/json' });
    if (many) await page.getByRole('button', { name: 'ดูตัวอย่าง', exact: true }).click();
    // Each real footer marker is outside content and within the physical A4 box.
    expect(await page.locator('main [data-page-number]').evaluateAll(markers => markers.every(marker => {
      const number = marker.getBoundingClientRect(); const paper = marker.closest('[data-portfolio-page]')!.getBoundingClientRect();
      const content = marker.parentElement!.previousElementSibling!.getBoundingClientRect();
      return number.right <= paper.right && number.bottom <= paper.bottom && number.top >= content.bottom;
    }))).toBe(true);
    await page.locator('.paper-frame:has([data-page-section=profile])').screenshot({ path: testInfo.outputPath(`numbered-${template}-profile.png`) });
    if (many) {
      await page.getByRole('button', { name: 'กรอกข้อมูล', exact: true }).click();
      await assertNumbering(page);
      await expect(page.locator('aside [aria-expanded=true]')).toHaveCount(0);
    }
  });
}

test('late image sizing is flushed before export even when ResizeObserver delivery is withheld', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.addInitScript(() => {
    const state = { hold: false, suppressed: 0 };
    (window as unknown as { numberingResize: typeof state }).numberingResize = state;
    const Native = ResizeObserver;
    window.ResizeObserver = class extends Native {
      constructor(callback: ResizeObserverCallback) { super((entries, observer) => { if (state.hold) state.suppressed++; else callback(entries, observer); }); }
    };
  });
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const image = await (await request.get('http://127.0.0.1:54321/sample.png')).body();
  await page.route('**/late-numbering.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: image }); });
  await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: [0, 1].map(i => ({ id: `late-${i}`, title: `LATE ${i}`, description: 'รายละเอียดกิจกรรมภาษาไทย\n'.repeat(5) })) }));
  await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: [0, 1].map(i => ({ activity_id: `late-${i}`, sort_order: i })) }));
  await page.route('**/rest/v1/user_library_activity_images?**', route => route.fulfill({ json: [0, 1].map(i => ({ id: `img-${i}`, activity_id: `late-${i}`, image_url: 'http://127.0.0.1:54321/late-numbering.png', sort_order: 0 })) }));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('[data-page-section=activity]')).toHaveCount(1);
  await assertNumbering(page);
  await page.evaluate(() => { (window as unknown as { numberingResize: { hold: boolean } }).numberingResize.hold = true; });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true }).click();
  await expect(page.getByRole('button', { name: 'กำลังส่งออก…', exact: true })).toBeDisabled();
  release();
  await (await download).saveAs(testInfo.outputPath('numbered-late-image.pdf'));
  await expect(page.locator('[data-page-section=activity]')).toHaveCount(2);
  await assertNumbering(page);
  await expect(page.locator('[data-page-section=certificate] [data-page-number]')).toHaveText('5');
  await expect.poll(() => page.evaluate(() => (window as unknown as { numberingResize: { suppressed: number } }).numberingResize.suppressed)).toBeGreaterThan(0);
  const audit = JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python', ['tests/pdf-inspect.py', testInfo.outputPath('numbered-late-image.pdf')], { encoding: 'utf8' }));
  expect(audit.pages).toBe(7);
});

test('SPA portfolio/account changes clean up the old numbering observer and measurement scope', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { active: 0, bound: 0, disconnected: 0 };
    (window as unknown as { numberingObservers: typeof state }).numberingObservers = state;
    const Native = MutationObserver;
    window.MutationObserver = class extends Native {
      tracked = false;
      observe(target: Node, options?: MutationObserverInit) {
        if (target instanceof HTMLElement && target.hasAttribute('data-page-layout') && !this.tracked) { this.tracked = true; state.active++; state.bound++; }
        super.observe(target, options);
      }
      disconnect() { if (this.tracked) { this.tracked = false; state.active--; state.disconnected++; } super.disconnect(); }
    };
  });
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await assertNumbering(page);
  await page.evaluate(() => history.pushState(null, '', '/editor?portfolio=b'));
  await expect(page.getByText('Portfolio B', { exact: true })).toBeVisible();
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await assertNumbering(page);
  expect(await page.evaluate(() => (window as unknown as { numberingObservers: { active: number } }).numberingObservers.active)).toBe(1);
  await page.evaluate(user => { const channel = new BroadcastChannel('sb-127-auth-token'); channel.postMessage({ event: 'SIGNED_IN', session: { user: { ...user, id: 'account-b' } } }); channel.close(); }, user);
  await expect(page.getByText('บัญชีผู้ใช้เปลี่ยนแล้ว', { exact: false })).toBeVisible();
  await expect(page.locator('[data-page-layout], [data-page-number]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { numberingObservers: { active: number; disconnected: number } }).numberingObservers)).toMatchObject({ active: 0 });
});

test('multi-page education and activities update later offsets when selections change; empty rendered sections still count', async ({ page }) => {
  await page.route('**/rest/v1/user_library_educations?**', route => route.fulfill({ json: Array.from({ length: 9 }, (_, i) => ({ id: `edu-${i}`, school_name: `School ${i} ` + 'รายละเอียดสถานศึกษาภาษาไทย '.repeat(4), level: 'มัธยมศึกษา', study_plan: 'วิทยาศาสตร์', gpa: 3.5, start_year: '2566', end_year: '2569' })) }));
  await page.route('**/rest/v1/portfolio_educations?**', route => route.fulfill({ json: new URL(route.request().url()).searchParams.get('portfolio_id') === 'eq.a' ? Array.from({ length: 9 }, (_, i) => ({ education_id: `edu-${i}`, sort_order: i })) : [] }));
  await page.route('**/rest/v1/user_library_activities?**', route => route.fulfill({ json: Array.from({ length: 4 }, (_, i) => ({ id: `act-${i}`, title: `ORDER ${i}`, description: 'รายละเอียดผลงานภาษาไทย\n'.repeat(15) })) }));
  await page.route('**/rest/v1/portfolio_activities?**', route => route.fulfill({ json: new URL(route.request().url()).searchParams.get('portfolio_id') === 'eq.a' ? Array.from({ length: 4 }, (_, i) => ({ activity_id: `act-${i}`, sort_order: i })) : [] }));
  await page.goto('/editor?portfolio=a');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect.poll(() => page.locator('[data-page-section=education]').count()).toBeGreaterThan(1);
  await expect.poll(() => page.locator('[data-page-section=activity]').count()).toBeGreaterThan(1);
  await assertNumbering(page);
  for (const template of ['modern', 'minimal', 'classic']) {
    await page.getByLabel('เทมเพลต', { exact: true }).selectOption(template);
    await expect(page.locator('[data-portfolio-page]').first()).toHaveAttribute('data-template', template);
    await assertNumbering(page);
    await expect(page.locator('main .education-card h3')).toHaveText(Array.from({ length: 9 }, (_, i) => `School ${i} ` + 'รายละเอียดสถานศึกษาภาษาไทย '.repeat(4)));
  }
  const before = Number(await page.locator('[data-page-section=certificate] [data-page-number]').textContent());
  await openEditorSection(page, 'education');
  for (const checkbox of await page.locator('form:visible input[type=checkbox]').all()) await checkbox.uncheck();
  await expect(page.locator('[data-page-section=education]')).toHaveCount(1);
  await assertNumbering(page);
  expect(Number(await page.locator('[data-page-section=certificate] [data-page-number]').textContent())).toBeLessThan(before);
  await expect(page.getByText('ยังไม่บันทึก:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดาวน์โหลด PDF', exact: true })).toBeDisabled();
  await page.goto('/editor?portfolio=b');
  await expect(page.getByText('โหลดข้อมูลครบทุกหมวดแล้ว')).toBeVisible();
  await expect(page.locator('[data-portfolio-page]')).toHaveCount(6);
  await assertNumbering(page);
});

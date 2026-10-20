import { test as base, expect, type Page } from "@playwright/test";
import { openEditorSection } from "./helpers/editor";
import { formLoadError, formSaveError } from "../../src/lib/editor/form-errors";

// Isolate fault-injected auth/network activity and serverless-browser context teardown.
// Keep project launch/context settings; do not disable locks, CORS or application guards.
const test = base.extend({
  context: async ({ playwright, browserName, launchOptions, contextOptions, baseURL, viewport, headless }, provideContext) => {
    const browser = await playwright[browserName].launch({ ...launchOptions, headless });
    try { await provideContext(await browser.newContext({ ...contextOptions, baseURL, viewport })); }
    finally { await browser.close(); }
  },
});

const internal = "INTERNAL_private_constraint_42501_storage_bucket_token";
const user = { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "test@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
test.beforeEach(async ({ context, request }) => {
  await request.get("http://127.0.0.1:54321/__reset");
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const session = { access_token: `${part({ alg: "HS256" })}.${part({ sub: user.id, exp: 4102444800 })}.test`, refresh_token: "test-refresh", token_type: "bearer", expires_at: 4102444800, expires_in: 3600, user };
  await context.addCookies([{ name: "sb-127-auth-token", value: "base64-" + part(session), domain: "127.0.0.1", path: "/" }]);
});

const configs = [
  { section: "cover", table: "covers", field: "#cover-first-name" },
  { section: "preface", table: "prefaces", field: "#preface-author" },
  { section: "profile", table: "profiles", field: "#profile-firstName" },
  { section: "education", table: "user_library_educations" },
  { section: "activity", table: "user_library_activities" },
  { section: "certificate", table: "user_library_certificates" },
] as const;
type Config = typeof configs[number];

async function ready(page: Page) {
  await page.goto("/editor?portfolio=a");
  await expect(page.getByText("โหลดข้อมูลครบทุกหมวดแล้ว")).toBeVisible({ timeout: 20000 });
}
function form(page: Page, section: string) { return page.locator(`#editor-panel-${section} form`); }
async function edit(page: Page, config: Config) {
  if ("field" in config) await page.locator(config.field).fill("แบบร่างไม่หาย");
  else await form(page, config.section).getByRole("checkbox").first().uncheck();
}
async function expectDraft(page: Page, config: Config) {
  if ("field" in config) await expect(page.locator(config.field)).toHaveValue("แบบร่างไม่หาย");
  else await expect(form(page, config.section).getByRole("checkbox").first()).not.toBeChecked();
}

for (const config of configs) {
  test(`${config.section}: load failure is friendly, not empty or ready`, async ({ page }) => {
    await page.route(`**/rest/v1/${config.table}?**`, route => route.fulfill({ status: 500, json: { message: internal, details: internal, code: "42501" } }));
    await page.goto("/editor?portfolio=a");
    await openEditorSection(page, config.section);
    await expect(form(page, config.section).getByRole("alert")).toHaveText(formLoadError(config.section));
    await expect(page.locator("body")).not.toContainText(internal);
    await expect(page.getByText("โหลดไม่สำเร็จ:", { exact: false })).toBeVisible();
    await expect(form(page, config.section).locator("button[type=submit]")).toBeDisabled();
    await expect(page.getByRole("button", { name: "ดาวน์โหลด PDF", exact: true })).toBeDisabled();
    await expect(page.locator("main [data-portfolio-page]")).toHaveCount(0);
  });

  test(`${config.section}: save failure keeps draft and dirty; existing save button retries successfully`, async ({ page }) => {
    await ready(page); await openEditorSection(page, config.section); await edit(page, config);
    const path = "field" in config ? `**/rest/v1/${config.table}?**` : "**/rest/v1/rpc/replace_portfolio_selection";
    await page.route(path, route => ["POST", "PATCH"].includes(route.request().method())
      ? route.fulfill({ status: 500, json: { message: internal, details: internal } }) : route.continue());
    const submit = form(page, config.section).locator("button[type=submit]");
    await submit.click();
    await expect(form(page, config.section).getByRole("alert")).toHaveText(formSaveError(config.section, null));
    await expect(page.locator("body")).not.toContainText(internal);
    await expect(submit).toBeEnabled(); await expectDraft(page, config);
    await expect(page.locator(`#editor-heading-${config.section}`)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`#editor-heading-${config.section}`)).toContainText("ยังไม่บันทึก");
    await expect(page.getByRole("button", { name: "ดาวน์โหลด PDF", exact: true })).toBeDisabled();
    let warned = false;
    page.once("dialog", async dialog => { warned = true; await dialog.dismiss(); });
    await page.getByRole("link", { name: "กลับ Dashboard", exact: true }).click();
    expect(warned).toBe(true); await expect(page).toHaveURL(/editor/); await expectDraft(page, config);
    await page.unroute(path); await submit.click();
    // Saving may fold the panel; wait for committed success before reopening it.
    await expect(form(page, config.section).locator('[role="status"]').filter({ hasText: "เรียบร้อยแล้ว" })).toHaveCount(1);
    await openEditorSection(page, config.section);
    await expect(form(page, config.section).getByRole("status").filter({ hasText: "เรียบร้อยแล้ว" })).toBeVisible();
    await expect(form(page, config.section).getByRole("alert")).toHaveCount(0);
    await expect(page.locator(`#editor-heading-${config.section}`)).not.toContainText("ยังไม่บันทึก");
    await expect(page.getByRole("button", { name: "ดาวน์โหลด PDF", exact: true })).toBeEnabled();
  });
}

for (const config of configs) for (const failure of ["malformed", "network"] as const) {
  test(`${config.section}: ${failure} save/load errors keep safe copy and correct readiness`, async ({ page }) => {
    await ready(page); await openEditorSection(page, config.section); await edit(page, config);
    const path = "field" in config ? `**/rest/v1/${config.table}?**` : "**/rest/v1/rpc/replace_portfolio_selection";
    let loadAttempts = 0;
    const reject = (route: import("@playwright/test").Route) => {
      if (failure === "network") {
        if (route.request().method() === "GET") loadAttempts++;
        return route.abort("failed");
      }
      return route.fulfill({ status: 500, json: config.section === "cover" ? { message: { detail: internal } } : { details: internal } });
    };
    await page.route(path, route => ["POST", "PATCH"].includes(route.request().method()) ? reject(route) : route.continue());
    await form(page, config.section).locator("button[type=submit]").click();
    await expect(form(page, config.section).getByRole("alert")).toHaveText(formSaveError(config.section, null), { timeout: 20000 });
    await expectDraft(page, config);
    await expect(form(page, config.section).locator("button[type=submit]")).toBeEnabled();
    await expect(page.locator(`#editor-heading-${config.section}`)).toContainText("ยังไม่บันทึก");
    await expect(page.locator("body")).not.toContainText(internal);
    await page.unroute(path);
    await page.route(`**/rest/v1/${config.table}?**`, reject);
    // Deliberately discard this test's already-asserted draft to test a new initial load.
    page.once("dialog", dialog => dialog.accept()); await page.reload();
    await openEditorSection(page, config.section);
    // Installed PostgREST retries GET network rejection three times (1/2/4s backoff).
    // Synchronize with exhausted real requests rather than assuming the first rejection is final.
    if (failure === "network") await expect.poll(() => loadAttempts, { timeout: 45000 }).toBe(4);
    await expect(form(page, config.section).getByRole("alert")).toHaveText(formLoadError(config.section), { timeout: 20000 });
    await expect(page.locator("body")).not.toContainText(internal);
    await expect(form(page, config.section).locator("button[type=submit]")).toBeDisabled();
    await expect(page.getByRole("button", { name: "ดาวน์โหลด PDF", exact: true })).toBeDisabled();
    await expect(page.locator("main [data-portfolio-page]")).toHaveCount(0);
  });
}

for (const section of ["cover", "profile"] as const) {
  test(`${section}: upload failure retains confirmed crop and text; retry succeeds`, async ({ page, request }) => {
    await ready(page); await openEditorSection(page, section);
    const config = configs.find(c => c.section === section)!;
    await edit(page, config);
    const image = await (await request.get("http://127.0.0.1:54321/sample.png")).body();
    await form(page, section).locator("input[type=file]").setInputFiles({ name: "draft.png", mimeType: "image/png", buffer: image });
    await page.getByRole("button", { name: "ตัดรูปและใช้รูปนี้", exact: true }).click();
    const picture = form(page, section).locator("img");
    await expect(picture).toHaveAttribute("src", /^blob:/);
    const source = await picture.getAttribute("src");
    const storage = "**/storage/v1/object/**";
    await page.route(storage, route => route.request().method() === "POST"
      ? route.fulfill({ status: 500, json: { message: internal, error: internal, statusCode: 500 } })
      : route.fulfill({ contentType: "image/png", body: image }));
    await form(page, section).locator("button[type=submit]").click();
    await expect(form(page, section).getByRole("alert")).toHaveText(formSaveError(section, null));
    await expect(page.locator("body")).not.toContainText(internal); await expectDraft(page, config);
    await expect(picture).toHaveAttribute("src", source!);
    expect(await picture.evaluate(el => (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await openEditorSection(page, "education"); await openEditorSection(page, section);
    await expect(picture).toHaveAttribute("src", source!);
    await expect(page.locator(`#editor-heading-${section}`)).toContainText("ยังไม่บันทึก");
    await page.unroute(storage);
    await page.route(storage, route => route.request().method() === "POST"
      ? route.fulfill({ json: { Key: "synthetic-upload" } }) : route.fulfill({ contentType: "image/png", body: image }));
    await form(page, section).locator("button[type=submit]").click();
    await expect(form(page, section).locator('[role="status"]').filter({ hasText: "เรียบร้อยแล้ว" })).toHaveCount(1);
    await openEditorSection(page, section);
    await expect(form(page, section).getByRole("alert")).toHaveCount(0);
    await expect(picture).toHaveAttribute("src", /^http:\/\/127\.0\.0\.1:54321\/storage/);
    await expect.poll(() => picture.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "ดาวน์โหลด PDF", exact: true })).toBeEnabled();
  });

  test(`${section}: existing file validation stays actionable and does not replace draft image`, async ({ page }) => {
    await ready(page); await openEditorSection(page, section);
    const input = form(page, section).locator("input[type=file]");
    const picture = form(page, section).locator("img");
    const before = await picture.count() ? await picture.getAttribute("src") : null;
    await input.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
    await expect(form(page, section).getByRole("alert")).toHaveText("รองรับเฉพาะไฟล์ JPG และ PNG");
    await input.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(form(page, section).getByRole("alert")).toHaveText("รูปภาพต้องมีขนาดไม่เกิน 5MB");
    if (before) await expect(form(page, section).locator("img")).toHaveAttribute("src", before);
    else await expect(form(page, section).locator("img")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

for (const section of ["preface", "profile"] as const) {
  test(`${section}: read-before-save failure retains draft and never reaches content write`, async ({ page }) => {
    await ready(page); await openEditorSection(page, section); await edit(page, configs.find(c => c.section === section)!);
    let writes = 0;
    const path = `**/rest/v1/${section === "preface" ? "prefaces" : "profiles"}?**`;
    await page.route(path, route => {
      if (route.request().method() !== "GET") { writes++; return route.continue(); }
      return route.fulfill({ status: 500, json: { message: internal } });
    });
    await form(page, section).locator("button[type=submit]").click();
    await expect(form(page, section).getByRole("alert")).toHaveText(formSaveError(section, null));
    expect(writes).toBe(0); await expectDraft(page, configs.find(c => c.section === section)!);
    await expect(page.locator("body")).not.toContainText(internal);
    await page.unroute(path); await form(page, section).locator("button[type=submit]").click();
    await expect(form(page, section).locator('[role="status"]').filter({ hasText: "เรียบร้อยแล้ว" })).toHaveCount(1);
  });
}

for (const config of configs.slice(3)) {
  test(`${config.section}: failed selection save preserves tick order through folding/mobile and retry`, async ({ page }) => {
    const ids = ["first", "second", "third"];
    await page.route(`**/rest/v1/${config.table}?**`, route => route.fulfill({ json: ids.map(id => ({ id, title: id, school_name: id, level: "มัธยมศึกษา", description: "ข้อมูลสังเคราะห์" })) }));
    const plural = config.table.replace("user_library_", "");
    await page.route(`**/rest/v1/portfolio_${plural}?**`, route => route.fulfill({ json: [] }));
    await ready(page); await openEditorSection(page, config.section);
    const checks = form(page, config.section).getByRole("checkbox");
    await checks.nth(2).check(); await checks.nth(0).check(); await checks.nth(1).check();
    await checks.nth(0).uncheck(); await checks.nth(0).check();
    const assertOrder = async () => {
      for (const [index, number] of [[2, 1], [1, 2], [0, 3]]) {
        await expect(checks.nth(index)).toBeChecked();
        await expect(form(page, config.section).locator("label").filter({ has: page.getByRole("checkbox", { name: ids[index], exact: true }) })).toContainText(`ลำดับ ${number}`);
      }
    };
    const path = "**/rest/v1/rpc/replace_portfolio_selection";
    await page.route(path, route => {
      expect(route.request().postDataJSON().p_item_ids).toEqual(["third", "second", "first"]);
      return route.fulfill({ status: 500, json: { message: internal } });
    });
    await form(page, config.section).locator("button[type=submit]").click(); await assertOrder();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "ดูตัวอย่าง", exact: true }).click();
    await page.getByRole("button", { name: "กรอกข้อมูล", exact: true }).click();
    await openEditorSection(page, "cover"); await openEditorSection(page, config.section); await assertOrder();
    await expect(form(page, config.section).getByRole("alert")).toHaveText(formSaveError(config.section, null));
    await expect(page.getByRole("button", { name: "ดาวน์โหลด PDF", exact: true })).toBeDisabled();
    await page.unroute(path);
    const next = page.waitForRequest(r => r.url().includes("/rpc/replace_portfolio_selection"));
    await form(page, config.section).locator("button[type=submit]").click();
    expect((await next).postDataJSON().p_item_ids).toEqual(["third", "second", "first"]);
    await expect(form(page, config.section).locator('[role="status"]').filter({ hasText: "เรียบร้อยแล้ว" })).toHaveCount(1);
  });
}

for (const operation of ["load", "save"] as const) for (const destination of ["portfolio", "account"] as const) {
  test(`late ${operation} error after ${destination} change cannot enter the current session`, async ({ page }) => {
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    let started = false; let settled = false;
    await page.route("**/rest/v1/covers?**", async route => {
      const old = operation === "load" ? route.request().method() === "GET" && new URL(route.request().url()).searchParams.get("portfolio_id") === "eq.a"
        : route.request().method() === "POST" && route.request().postDataJSON().portfolio_id === "a";
      if (!old) return route.continue();
      started = true; await gate;
      await route.fulfill({ status: 500, json: { message: internal } }); settled = true;
    });
    if (operation === "load") await page.goto("/editor?portfolio=a");
    else { await ready(page); await edit(page, configs[0]); await form(page, "cover").locator("button[type=submit]").click(); }
    await expect.poll(() => started).toBe(true);
    if (destination === "portfolio") {
      await page.evaluate(() => history.pushState(null, "", "/editor?portfolio=b"));
      await expect(page.getByText("Portfolio B", { exact: true })).toBeVisible();
      await expect(page.getByText("โหลดข้อมูลครบทุกหมวดแล้ว")).toBeVisible();
      await page.locator("#cover-first-name").fill("พอร์ตใหม่");
      release(); await expect.poll(() => settled).toBe(true);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.locator("#cover-first-name")).toHaveValue("พอร์ตใหม่");
      await expect(form(page, "cover").getByRole("alert")).toHaveCount(0);
      await expect(page.locator("#editor-heading-cover")).toHaveAttribute("aria-expanded", "true");
    } else {
      await page.evaluate(user => { const c = new BroadcastChannel("sb-127-auth-token"); c.postMessage({ event: "SIGNED_IN", session: { user: { ...user, id: "account-b" } } }); c.close(); }, user);
      await expect(page.getByText("บัญชีผู้ใช้เปลี่ยนแล้ว", { exact: false })).toBeVisible();
      release(); await expect.poll(() => settled).toBe(true);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.locator("#editor-panel-cover")).toHaveCount(0);
    }
    await expect(page.locator("body")).not.toContainText(internal);
  });
}

test("long error area remains usable at desktop/mobile without covering save controls", async ({ page }, testInfo) => {
  await ready(page); await openEditorSection(page, "profile"); await edit(page, configs[2]);
  await page.route("**/rest/v1/profiles?**", route => route.request().method() === "GET" ? route.continue()
    : route.fulfill({ status: 500, json: { message: internal.repeat(100) } }));
  await form(page, "profile").locator("button[type=submit]").click();
  const alert = form(page, "profile").getByRole("alert");
  await expect(alert).toHaveText(formSaveError("profile", null));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await alert.scrollIntoViewIfNeeded();
    expect(await form(page, "profile").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const box = await alert.boundingBox(); expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`editor-error-${width}.png`) });
    const submit = form(page, "profile").locator("button[type=submit]");
    await submit.scrollIntoViewIfNeeded(); await expect(submit).toBeInViewport(); await expect(submit).toBeEnabled();
  }
});

test("missing selection RPC keeps fixed administrator advice without promising a database rollback", async ({ page }) => {
  await ready(page);
  await page.route("**/rest/v1/rpc/replace_portfolio_selection", route => route.fulfill({ status: 404, json: { code: "PGRST202", message: internal } }));
  for (const config of configs.slice(3)) {
    await openEditorSection(page, config.section); await edit(page, config);
    await form(page, config.section).locator("button[type=submit]").click();
    await expect(form(page, config.section).getByRole("alert")).toContainText("ระบบบันทึกยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบ");
    await expect(form(page, config.section).getByRole("alert")).not.toContainText("ข้อมูลเดิมยังอยู่ครบ");
    await expectDraft(page, config);
    await expect(page.locator(`#editor-heading-${config.section}`)).toContainText("ยังไม่บันทึก");
  }
  await expect(page.locator("body")).not.toContainText(internal);
});

test("save-time user lookup failure preserves the cover draft and does not expose auth details", async ({ page }) => {
  await ready(page); await edit(page, configs[0]);
  await page.route("**/auth/v1/user", route => route.fulfill({ status: 500, json: { message: internal } }));
  await form(page, "cover").locator("button[type=submit]").click();
  await expect(form(page, "cover").getByRole("alert")).toHaveText(formSaveError("cover", null), { timeout: 20000 });
  await expectDraft(page, configs[0]);
  await expect(form(page, "cover").locator("button[type=submit]")).toBeEnabled();
  await expect(page.locator("body")).not.toContainText(internal);
});

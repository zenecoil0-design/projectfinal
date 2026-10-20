import { test, expect, type Page } from "@playwright/test";
import { openEditorSection } from "./helpers/editor";
import { formLoadError, formSaveError } from "../../src/lib/editor/form-errors";

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
  await expect(page.getByText("โหลดข้อมูลครบทุกหมวดแล้ว")).toBeVisible();
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

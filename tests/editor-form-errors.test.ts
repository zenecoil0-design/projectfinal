import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorFormIssue, formLoadError, formSaveError } from "../src/lib/editor/form-errors";
import { errorMessage } from "../src/lib/errors";
import { createClient } from "@supabase/supabase-js";
import { saveSelection } from "../src/lib/editor/save-selection";

const sections = ["cover", "preface", "profile", "education", "activity", "certificate"] as const;
for (const section of sections) {
  test(`${section}: external/malformed/network errors never supply UI text`, () => {
    for (const error of [new Error("INTERNAL_constraint_42501 signed-url-token"), { message: "permission denied storage_bucket_private" }, {}, null, undefined, "raw string", 42, { name: "EditorFormIssue", reason: "invalidGpax", message: "spoof" }, Object.defineProperty({}, "message", { get() { throw new Error("must not read external message"); } })]) {
      const load = formLoadError(section);
      const save = formSaveError(section, error);
      assert.match(load, /โหลดข้อมูล.+ไม่สำเร็จ/);
      assert.match(save, /ยืนยันการบันทึก.+ไม่สำเร็จ/);
      assert.match(save, /ยังอยู่ในฟอร์ม/);
      assert.match(save, /ลองบันทึกอีกครั้ง/);
      assert.doesNotMatch(load + save, /INTERNAL|42501|permission|storage_bucket|signed-url|spoof|รีเฟรช|rollback/);
    }
  });
}
test("only locally constructed issues preserve validation/admin advice; mutable message is never trusted", () => {
  const validation = new EditorFormIssue("invalidGpax");
  validation.message = "INTERNAL mutable backend text";
  assert.equal(formSaveError("profile", validation), "GPAX ไม่ถูกต้อง");
  const unavailable = new EditorFormIssue("selectionUnavailable");
  for (const section of ["education", "activity", "certificate"] as const) {
    assert.match(formSaveError(section, unavailable), /รายการที่เลือกยังอยู่ในฟอร์ม ระบบบันทึกยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบ/);
    assert.doesNotMatch(formSaveError(section, unavailable), /ข้อมูลเดิมยังอยู่ครบ/);
  }
});
test("shared error reader stays unchanged for PDF and unrelated callers", () => {
  assert.equal(errorMessage(new Error("เนื้อหาล้นหน้า")), "เนื้อหาล้นหน้า");
  assert.equal(errorMessage(null), "");
});
test("selection helper preserves RPC payload/order and exposes only typed missing-RPC advice to forms", async () => {
  for (const code of ["PGRST202", "42501"]) {
    const requests: unknown[] = [];
    const client = createClient("http://127.0.0.1:54321", "unit-mock-key", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (_input, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ code, message: "INTERNAL_RPC_secret_constraint" }), { status: 404, headers: { "Content-Type": "application/json" } });
      } },
    });
    await assert.rejects(saveSelection(client, "portfolio-a", "activity", ["second", "first"]), (error: unknown) => {
      assert.equal(error instanceof EditorFormIssue, code === "PGRST202");
      const message = formSaveError("activity", error);
      assert.doesNotMatch(message, /INTERNAL|secret|constraint|ข้อมูลเดิมยังอยู่ครบ/);
      assert.match(message, code === "PGRST202" ? /แจ้งผู้ดูแลระบบ/ : /ลองบันทึกอีกครั้ง/);
      return true;
    });
    assert.deepEqual(requests, [{ p_portfolio_id: "portfolio-a", p_section: "activity", p_item_ids: ["second", "first"] }]);
  }
});

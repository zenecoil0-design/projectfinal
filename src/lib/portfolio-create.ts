export type CreateRequest = { user_id: string; title: string; template_key: string };
export const createAuthError = "ยืนยันบัญชีผู้ใช้ไม่สำเร็จ ชื่อและเทมเพลตที่เลือกยังอยู่ กรุณาลองอีกครั้ง";
export const createResultError = "ยืนยันการสร้างพอร์ตไม่สำเร็จ ชื่อและเทมเพลตที่เลือกยังอยู่ กรุณาตรวจรายการพอร์ตก่อนลองสร้างซ้ำ";

export function confirmedCreatedId(value: unknown, sent: CreateRequest): string | null {
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string" ||
    !value.id.trim() || value.id !== value.id.trim() || !("user_id" in value) || value.user_id !== sent.user_id ||
    !("title" in value) || value.title !== sent.title || !("template_key" in value) || value.template_key !== sent.template_key) return null;
  return value.id;
}

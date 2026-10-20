import type { Section } from "./section-state";

const labels: Record<Section, string> = {
  cover: "หน้าปก", preface: "คำนำ", profile: "ประวัติส่วนตัว",
  education: "ประวัติการศึกษา", activity: "ผลงานและกิจกรรม", certificate: "เกียรติบัตร",
};
const issueText = {
  invalidGpax: "GPAX ไม่ถูกต้อง",
  selectionUnavailable: "ระบบบันทึกยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบ",
} as const;

/** Only locally constructed issues can expose our fixed, actionable validation text. */
export class EditorFormIssue extends Error {
  constructor(readonly reason: keyof typeof issueText) {
    super(issueText[reason]);
    this.name = "EditorFormIssue";
  }
}

/** No external error argument: backend text cannot become load UI copy. */
export function formLoadError(section: Section): string {
  return `โหลดข้อมูล${labels[section]}ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ หากยังมีปัญหาให้แจ้งผู้ดูแลระบบ`;
}

export function formSaveError(section: Section, error: unknown): string {
  if (error instanceof EditorFormIssue && error.reason === "invalidGpax") return issueText.invalidGpax;
  const draft = ["education", "activity", "certificate"].includes(section)
    ? "รายการที่เลือกยังอยู่ในฟอร์ม" : "ข้อมูลที่กรอกยังอยู่ในฟอร์ม";
  const next = error instanceof EditorFormIssue && error.reason === "selectionUnavailable"
    ? issueText.selectionUnavailable : "กรุณาลองบันทึกอีกครั้ง";
  // A failed response does not prove that the server rolled back or never committed.
  return `ยืนยันการบันทึก${labels[section]}ไม่สำเร็จ ${draft} ${next}`;
}

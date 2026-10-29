import type { EducationItem } from "@/store/useEducationStore";
import type { ActivityItem } from "@/store/useActivityStore";
import type { CertificateItem } from "@/store/useCertificateStore";

export type SnapshotSection = "education" | "activity" | "certificate";
type PreviewItem = EducationItem | ActivityItem | CertificateItem;
export type SnapshotEntry<T extends PreviewItem> = {
  item: T;
  revision: string;
  version: number;
  latestRevision: string;
  hasUpdate: boolean;
};
type ReadContext = { portfolioId: string; ownerId: string };

// Fail closed at the RPC boundary. A malformed result must not become an empty
// selection or silently substitute live library data for an accepted edition.
function invalid(): never {
  throw new Error("ข้อมูลฉบับที่บันทึกไม่ครบ กรุณาลองโหลดอีกครั้ง");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (value === null) return "";
  if (typeof value !== "string") return invalid();
  return value;
}
function integer(value: unknown, min: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) return invalid();
  return value;
}
function revision(value: unknown): string {
  if (typeof value !== "string" || value.length !== 32 || !/^[a-f0-9]+$/.test(value)) return invalid();
  return value;
}
function id(value: unknown): string {
  if (typeof value !== "string" || value.length !== 36 || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)) return invalid();
  return value;
}

export function parsePortfolioSnapshots(value: unknown, section: "education", context: ReadContext): SnapshotEntry<EducationItem>[];
export function parsePortfolioSnapshots(value: unknown, section: "activity", context: ReadContext): SnapshotEntry<ActivityItem>[];
export function parsePortfolioSnapshots(value: unknown, section: "certificate", context: ReadContext): SnapshotEntry<CertificateItem>[];
export function parsePortfolioSnapshots(value: unknown, section: SnapshotSection, context: ReadContext): SnapshotEntry<PreviewItem>[];
export function parsePortfolioSnapshots(value: unknown, section: SnapshotSection, context: ReadContext): SnapshotEntry<PreviewItem>[] {
  const response = record(value);
  if (response.format_version !== 1 || response.portfolio_id !== context.portfolioId ||
      response.section !== section || !Array.isArray(response.items)) return invalid();
  id(context.portfolioId);
  id(context.ownerId);
  const seen = new Set<string>();
  let previousOrder = -1;
  let previousId = "";
  return response.items.map((value): SnapshotEntry<PreviewItem> => {
    const row = record(value);
    const itemId = id(row.item_id);
    const order = integer(row.sort_order, 0);
    if (seen.has(itemId) || order < previousOrder || (order === previousOrder && itemId <= previousId)) return invalid();
    seen.add(itemId);
    previousOrder = order;
    previousId = itemId;
    const data = record(row.data);
    const source = record(data.item);
    if (source.id !== itemId || source.user_id !== context.ownerId || !Array.isArray(data.images)) return invalid();
    const imageIds = new Set<string>();
    let lastImageOrder = -1;
    let lastImageId = "";
    const images = data.images.map((value) => {
      const image = record(value);
      const imageId = id(image.id);
      const imageOrder = integer(image.sort_order, 0);
      if (image[`${section}_id`] !== itemId || imageIds.has(imageId) || imageOrder < lastImageOrder ||
          (imageOrder === lastImageOrder && imageId <= lastImageId) || typeof image.image_url !== "string") return invalid();
      imageIds.add(imageId);
      lastImageOrder = imageOrder;
      lastImageId = imageId;
      return image.image_url; // Preserve even broken URLs so existing export validation can reject them.
    });
    let item: PreviewItem;
    switch (section) {
      case "education": {
        if (images.length || (source.gpa !== null && (typeof source.gpa !== "number" || !Number.isFinite(source.gpa)))) return invalid();
        item = {
          id: itemId, level: text(source.level), schoolName: text(source.school_name),
          studyPlan: text(source.study_plan), gpa: source.gpa === null ? "" : String(source.gpa),
          logoUrl: text(source.logo_url), startYear: text(source.start_year), endYear: text(source.end_year),
        };
        break;
      }
      case "activity":
        item = { id: itemId, title: text(source.title), description: text(source.description),
          activityDate: text(source.activity_date), organization: text(source.organization), images };
        break;
      case "certificate": {
        const legacyImage = text(source.image_url);
        item = { id: itemId, title: text(source.title), description: text(source.description),
          issuedBy: text(source.issued_by), issuedDate: text(source.issued_date),
          images: images.length ? images : legacyImage ? [legacyImage] : [] };
        break;
      }
      default: return invalid();
    }
    const acceptedRevision = revision(row.revision);
    const latestRevision = revision(row.latest_revision);
    return { item, revision: acceptedRevision, latestRevision,
      version: integer(row.version, 1), hasUpdate: acceptedRevision !== latestRevision };
  });
}

import type { EducationItem } from '@/store/useEducationStore';
import type { ActivityItem } from '@/store/useActivityStore';
import type { CertificateItem } from '@/store/useCertificateStore';
import type { SnapshotEntry } from './snapshot-reader';
import { parsePortfolioSnapshots, type SnapshotSection } from './snapshot-reader';

type Context = { portfolioId: string; ownerId: string; isCurrent: () => boolean };
type Client = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};
export class SnapshotPreparationRequired extends Error {
  constructor() { super('พอร์ตนี้ยังต้องเตรียมฉบับเริ่มต้น'); }
}
export class SnapshotSessionExpired extends Error {
  constructor() { super('หน้าปัจจุบันเปลี่ยนแล้ว กรุณาเปิดพอร์ตอีกครั้ง'); }
}
function current(context: Context) {
  if (!context.isCurrent()) throw new SnapshotSessionExpired();
}
async function owner(client: Client, context: Context) {
  current(context);
  const { data, error } = await client.auth.getUser();
  current(context);
  if (error || data.user?.id !== context.ownerId) throw new SnapshotSessionExpired();
}
function failure() { return new Error('ยืนยันข้อมูลฉบับที่บันทึกไม่สำเร็จ กรุณาลองตรวจสอบอีกครั้ง'); }

// No implicit preparation, acceptance or retry during a read. The caller owns
// draft/export readiness and must only apply a result to the matching session.
export function readPortfolioSnapshots(client: Client, context: Context, section: "education"): Promise<SnapshotEntry<EducationItem>[]>;
export function readPortfolioSnapshots(client: Client, context: Context, section: "activity"): Promise<SnapshotEntry<ActivityItem>[]>;
export function readPortfolioSnapshots(client: Client, context: Context, section: "certificate"): Promise<SnapshotEntry<CertificateItem>[]>;
export function readPortfolioSnapshots(client: Client, context: Context, section: SnapshotSection): Promise<ReturnType<typeof parsePortfolioSnapshots>>;
export async function readPortfolioSnapshots(client: Client, context: Context, section: SnapshotSection) {
  await owner(client, context);
  const { data, error } = await client.rpc('read_portfolio_item_snapshots', {
    p_portfolio_id: context.portfolioId, p_section: section,
  });
  current(context);
  if (error && typeof error === 'object' && 'code' in error && error.code === '55000') {
    throw new SnapshotPreparationRequired();
  }
  if (error) throw failure();
  return parsePortfolioSnapshots(data, section, context);
}

// After replace_portfolio_selection, read back the authoritative editions and require exactly the
// saved order. Returns null once the caller is no longer current; never merges into an old draft.
export function confirmSavedSelection(client: Client, portfolioId: string, section: "education", expectedIds: string[], isCurrent: () => boolean): Promise<SnapshotEntry<EducationItem>[] | null>;
export function confirmSavedSelection(client: Client, portfolioId: string, section: "activity", expectedIds: string[], isCurrent: () => boolean): Promise<SnapshotEntry<ActivityItem>[] | null>;
export function confirmSavedSelection(client: Client, portfolioId: string, section: "certificate", expectedIds: string[], isCurrent: () => boolean): Promise<SnapshotEntry<CertificateItem>[] | null>;
export async function confirmSavedSelection(client: Client, portfolioId: string, section: SnapshotSection,
  expectedIds: string[], isCurrent: () => boolean) {
  const { data: { user }, error } = await client.auth.getUser();
  if (!isCurrent()) return null;
  if (error || !user) throw new Error("ยืนยันบัญชีไม่สำเร็จ");
  const saved = await readPortfolioSnapshots(client, { portfolioId, ownerId: user.id, isCurrent }, section);
  if (!isCurrent()) return null;
  if (saved.length !== expectedIds.length || saved.some((entry, index) => entry.item.id !== expectedIds[index])) {
    throw new Error("ยืนยันรายการที่บันทึกไม่สำเร็จ");
  }
  return saved;
}

// Explicit transition only. A lost response is not evidence of rollback.
export async function preparePortfolioSnapshots(client: Client, context: Context) {
  await owner(client, context);
  const { data, error } = await client.rpc('prepare_portfolio_item_snapshots', {
    p_portfolio_id: context.portfolioId,
  });
  current(context);
  if (error || !data || typeof data !== 'object' || Array.isArray(data) ||
      !('portfolio_id' in data) || data.portfolio_id !== context.portfolioId || !('prepared_count' in data) ||
      typeof data.prepared_count !== 'number' || !Number.isSafeInteger(data.prepared_count) || data.prepared_count < 0) throw failure();
  return { preparedCount: data.prepared_count };
}

// Acceptance is sent once, using the revision the user actually reviewed.
// Always read back the authoritative whole section; never merge an unvalidated
// mutation result into an existing draft. A failed readback remains an error.
export async function acceptPortfolioSnapshot(client: Client, context: Context,
  section: SnapshotSection, itemId: string, expectedRevision: string) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(itemId) || itemId.length !== 36 ||
      !/^[0-9a-f]{32}$/.test(expectedRevision) || expectedRevision.length !== 32) throw failure();
  await owner(client, context);
  const { data, error } = await client.rpc('capture_portfolio_item_snapshot', {
    p_portfolio_id: context.portfolioId, p_section: section, p_item_id: itemId,
    p_refresh: true, p_expected_revision: expectedRevision,
  });
  current(context);
  if (error) throw failure();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure();
  const accepted = parsePortfolioSnapshots({
    format_version: 1, portfolio_id: context.portfolioId, section,
    items: [{ ...data, item_id: itemId, sort_order: 0 }],
  }, section, context)[0];
  if (accepted.revision !== expectedRevision) throw failure();
  const entries = await readPortfolioSnapshots(client, context, section);
  const confirmed = entries.find(entry => entry.item.id === itemId);
  if (!confirmed || confirmed.revision !== accepted.revision ||
      confirmed.version !== accepted.version) throw failure();
  return entries;
}

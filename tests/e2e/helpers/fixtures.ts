import { createHash } from 'node:crypto';

// Deterministic UUIDs shared with tests/mock-supabase.mjs (keep both functions identical).
// Snapshot payloads are validated as UUIDs by the app, so fixture ids must be UUIDs too.
export const fixtureId = (label: string) => {
  const h = createHash('md5').update(`fixture:${label}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const owner = '00000000-0000-0000-0000-000000000001';
/** Seeded portfolio with one prepared education, activity and certificate. */
export const portfolioA = fixtureId('portfolio-a');
/** Seeded empty portfolio. */
export const portfolioB = fixtureId('portfolio-b');
export const libraryItem = (kind: 'education' | 'activity' | 'certificate', label = 'a') => fixtureId(`${kind}-${label}`);
export const editorUrl = (portfolio: string) => `/editor?portfolio=${portfolio}`;
export const api = 'http://127.0.0.1:54321/rest/v1';
/** Re-capture all selected items after fixture library edits (as if every update were accepted). */
export const recaptureUrl = 'http://127.0.0.1:54321/__recapture';

type Kind = 'education' | 'activity' | 'certificate';
type Request = { post: (url: string, options?: { data?: unknown }) => Promise<{ ok(): boolean; status(): number; text(): Promise<string> }> };
const plural = { education: 'educations', activity: 'activities', certificate: 'certificates' } as const;
async function ensure(response: Awaited<ReturnType<Request['post']>>, what: string) {
  if (!response.ok()) throw new Error(`${what} failed: ${response.status()} ${await response.text()}`);
}
/** Insert library rows for the test owner; rows without an id get a deterministic one from `label`. */
export async function seedLibrary(request: Request, kind: Kind, rows: Record<string, unknown>[], label = 'seed') {
  const data = rows.map((row, index) => ({ user_id: owner, ...row, id: row.id ?? fixtureId(`${kind}-${label}-${index}`) }));
  await ensure(await request.post(`${api}/user_library_${plural[kind]}`, { data }), `seed ${kind}`);
  return data.map(row => row.id as string);
}
/** Insert ordered images for one library item (ids are UUIDs so they survive snapshot parsing). */
export async function seedImages(request: Request, kind: 'activity' | 'certificate', itemId: string, urls: string[], label = 'image') {
  const data = urls.map((image_url, sort_order) => ({ id: fixtureId(`${kind}-${itemId}-${label}-${sort_order}`), [`${kind}_id`]: itemId, image_url, sort_order }));
  await ensure(await request.post(`${api}/user_library_${kind}_images`, { data }), `seed ${kind} images`);
  return data.map(row => row.id);
}
/** Replace a portfolio section selection through the same RPC the editor uses (captures snapshots). */
export async function selectItems(request: Request, portfolio: string, kind: Kind, ids: string[]) {
  await ensure(await request.post(`${api}/rpc/replace_portfolio_selection`, { data: { p_portfolio_id: portfolio, p_section: kind, p_item_ids: ids } }), `select ${kind}`);
}
/** Make already selected items show the current library content (fixture shortcut, see mock-supabase.mjs). */
export async function recapture(request: Request) {
  await ensure(await request.post(recaptureUrl), 'recapture');
}

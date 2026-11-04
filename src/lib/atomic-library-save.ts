type Client = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  storage: { from: (bucket: string) => {
    upload: (path: string, file: File, options: { contentType: string }) => PromiseLike<{ error: unknown }>;
    getPublicUrl: (path: string) => { data: { publicUrl: string } };
  } };
};
import type { SnapshotSection } from "./editor/snapshot-reader";
type Input = { section: SnapshotSection; ownerId: string; itemId: string | null;
  fields: Record<string, string | number | null>; images: { id: string; image_url: string }[];
  files: File[]; tagIds: string[] };
export type LibrarySaveAttempt = { input: Input; id: string; urls: string[] };
const message = "ยังยืนยันการบันทึกไม่ได้ ข้อมูลในฟอร์มยังอยู่ กรุณาตรวจรายการคลังก่อนสร้างหรือแก้ไขซ้ำ";
export function makeLibrarySaveAttempt(input: Input): LibrarySaveAttempt {
  return { input: { ...input, fields: { ...input.fields }, images: input.images.map(image => ({ ...image })),
    files: [...input.files], tagIds: [...input.tagIds] }, id: input.itemId ?? crypto.randomUUID(), urls: [] };
}
export function sameLibrarySave(attempt: LibrarySaveAttempt, input: Input) {
  const a = attempt.input;
  return JSON.stringify({ ...a, files: [] }) === JSON.stringify({ ...input, files: [] }) &&
    a.files.length === input.files.length && a.files.every((file, index) => file === input.files[index]);
}
export async function saveAtomicLibrary(client: Client, attempt: LibrarySaveAttempt, isCurrent: () => boolean) {
  const input = attempt.input;
  const current = () => { if (!isCurrent()) throw new Error(message); };
  const verifyOwner = async () => {
    current();
    const { data, error } = await client.auth.getUser();
    current();
    if (error || data.user?.id !== input.ownerId) throw new Error(message);
  };
  await verifyOwner();
  const folder = input.section === "education" ? "education" : input.section === "activity" ? "activities" : "certificates";
  for (let index = attempt.urls.length; index < input.files.length; index++) {
    current();
    const file = input.files[index];
    const extension = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : null;
    if (!extension) throw new Error(message);
    const path = `users/${input.ownerId}/${folder}/${attempt.id}/${crypto.randomUUID()}.${extension}`;
    const bucket = client.storage.from("portfolio-images");
    const { error } = await bucket.upload(path, file, { contentType: file.type });
    current();
    if (error) throw new Error(message);
    attempt.urls.push(bucket.getPublicUrl(path).data.publicUrl);
  }
  await verifyOwner();
  const fields = { ...input.fields };
  if (input.section === "education" && attempt.urls.length) fields.logo_url = attempt.urls[0];
  const images = input.section === "education" ? [] : [
    ...input.images, ...attempt.urls.map(image_url => ({ image_url })),
  ];
  // Only the database transaction changes content, image references and tags.
  // Uploaded files are retained on uncertain outcomes; never delete snapshot assets.
  const { data, error } = await client.rpc(input.itemId ? "update_library_item_atomic" : "create_library_item_atomic", {
    p_section: input.section, p_item_id: attempt.id, p_fields: fields, p_images: images, p_tag_ids: input.tagIds,
  });
  current();
  if (error || !data || typeof data !== "object" || Array.isArray(data) || !("id" in data) || data.id !== attempt.id) throw new Error(message);
  if (!input.itemId && (!("status" in data) || data.status !== "confirmed")) throw new Error(message);
  if (input.itemId) {
    if (!("item" in data) || !data.item || typeof data.item !== "object" || Array.isArray(data.item)) throw new Error(message);
    const row = data.item as Record<string, unknown>;
    if (row.id !== attempt.id || row.user_id !== input.ownerId ||
      Object.entries(fields).some(([key, value]) => row[key] !== value)) throw new Error(message);
  }
  return attempt.id;
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateImageFile(file: File) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "รูปภาพต้องมีขนาดไม่เกิน 5MB";
  }

  return null;
}

export function revokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

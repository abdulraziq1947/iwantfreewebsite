/** Detect image type from file bytes (not browser MIME / extension). */

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedUploadContentType =
  (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOADS_PER_ORDER = 20;

export function sniffImageContentType(
  bytes: ArrayBuffer | Uint8Array,
): AllowedUploadContentType | null {
  const view =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.length < 12) return null;

  // JPEG SOI
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG signature
  if (
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  const riff =
    view[0] === 0x52 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x46;
  const webp =
    view[8] === 0x57 &&
    view[9] === 0x45 &&
    view[10] === 0x42 &&
    view[11] === 0x50;
  if (riff && webp) return "image/webp";

  return null;
}

export function extensionForContentType(
  contentType: AllowedUploadContentType,
): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export const UPLOAD_CATEGORIES = [
  "logo",
  "business_photo",
  "team_photo",
  "portfolio",
  "other",
] as const;

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

export function isUploadCategory(value: string): value is UploadCategory {
  return (UPLOAD_CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(category: UploadCategory): string {
  switch (category) {
    case "logo":
      return "Business logo";
    case "business_photo":
      return "Business photograph";
    case "team_photo":
      return "Team photograph";
    case "portfolio":
      return "Portfolio / project image";
    case "other":
      return "Other website image";
  }
}

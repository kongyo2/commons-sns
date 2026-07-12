// Shared text helpers.  This module intentionally has no server-only imports so
// it is safe to include in the client bundle.

export function countCodePoints(value: string): number {
  return [...value].length;
}

export function sliceCodePoints(value: string, max: number): string {
  if (max <= 0) return "";
  const points = [...value];
  if (points.length <= max) return value;
  return points.slice(0, max).join("");
}

// The sanitiser strips characters that carry no visible content but are common
// vectors for spoofing display names and handles.  Ranges are assembled from code
// points so the regex source itself never contains literal control characters.
const codePoint = (code: number) => String.fromCharCode(code);
const codeRange = (from: number, to: number) => `${codePoint(from)}-${codePoint(to)}`;

// DEL + C1 controls (U+007F-009F), zero-width space (U+200B), directional marks
// (U+200E-200F), word-joiner (U+2060), BOM / ZWNBSP (U+FEFF) and bidi overrides /
// isolates (U+202A-202E, U+2066-2069).  Stripped in every mode.
const INVISIBLE_CLASS =
  codeRange(0x007f, 0x009f) +
  codePoint(0x200b) +
  codeRange(0x200e, 0x200f) +
  codePoint(0x2060) +
  codePoint(0xfeff) +
  codeRange(0x202a, 0x202e) +
  codeRange(0x2066, 0x2069);

// ZWNJ (U+200C) and ZWJ (U+200D) carry meaning: ZWJ builds emoji sequences (the
// family emoji, professions) and ZWNJ controls shaping in Persian / Indic
// scripts.  They are stripped only in the stricter single-line mode (display
// names, handles), never from multiline bodies and bios, so user-authored text
// is stored as typed.
const JOINERS_CLASS = codeRange(0x200c, 0x200d);

// Single-line strips every C0 control (including TAB and LF) plus the joiners;
// multiline keeps TAB (U+0009) and LF (U+000A) so paragraph breaks survive, and
// keeps the joiners so emoji sequences and script shaping are preserved.
const SINGLE_LINE_PATTERN = new RegExp(`[${codeRange(0x0000, 0x001f)}${INVISIBLE_CLASS}${JOINERS_CLASS}]`, "gu");
const MULTILINE_PATTERN = new RegExp(
  `[${codeRange(0x0000, 0x0008)}${codeRange(0x000b, 0x001f)}${INVISIBLE_CLASS}]`,
  "gu",
);

export function sanitizeText(value: string, options: { multiline?: boolean } = {}): string {
  const pattern = options.multiline ? MULTILINE_PATTERN : SINGLE_LINE_PATTERN;
  return value.replace(pattern, "").trim();
}

export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "sysadmin",
  "mod",
  "moderator",
  "owner",
  "staff",
  "official",
  "support",
  "help",
  "info",
  "contact",
  "security",
  "abuse",
  "everyone",
  "all",
  "api",
  "settings",
  "login",
  "signin",
  "signup",
  "logout",
  "register",
  "bookmarks",
  "profile",
  "users",
  "commons",
  "commons_dev",
  "commons_official",
  "commonsteam",
  "commons_team",
  "commons_support",
]);

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle.toLowerCase());
}

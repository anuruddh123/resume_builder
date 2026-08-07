import type { DetectedDesign } from "./schemas";

/**
 * The model describes the uploaded document's appearance; this module is the
 * trust boundary around that description. Every value is clamped or whitelisted
 * before it reaches the PDF renderer, because @react-pdf's standard fonts only
 * cover WinAnsi — an out-of-range glyph renders as a blank box, and a malformed
 * colour throws during render.
 *
 * It is also where the user-facing format vocabulary lives. Keeping it here
 * rather than beside the zod schemas means the design panel, the preview and
 * the template picker can import it without dragging zod into the browser
 * bundle — the type import above is erased at build time.
 */

/**
 * Typefaces available to the exporter. Deliberately limited to the three PDF
 * standard families — Helvetica (Arial), Times, Courier. They need no embedded
 * font file, so every ATS extracts their text losslessly; an embedded webfont
 * with a nonstandard encoding is the usual cause of a resume parsing as noise.
 */
export const FONT_FAMILY_IDS = ["sans", "serif", "mono"] as const;
export type FontFamilyId = (typeof FONT_FAMILY_IDS)[number];

/** "match" keeps headings on the body typeface. */
export const HEADING_FAMILIES = ["match", ...FONT_FAMILY_IDS] as const;
export type HeadingFamily = (typeof HEADING_FAMILIES)[number];

export const PAPER_SIZES = ["LETTER", "A4"] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

export const LINK_STYLES = ["plain", "underline"] as const;
export type LinkStyle = (typeof LINK_STYLES)[number];

export const TEMPLATE_IDS = [
  "source",
  "classic",
  "modern",
  "compact",
  "elegant",
  "technical",
  "minimal",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * The full design the renderer consumes: what was detected, plus the format
 * controls the user drives. `fontFamily` is widened past the detected pair
 * because the user may pick a typeface the source never used.
 */
export type Design = Omit<DetectedDesign, "fontFamily"> & {
  fontFamily: FontFamilyId;
  headingFamily: HeadingFamily;
  lineHeight: number;
  paperSize: PaperSize;
  linkStyle: LinkStyle;
  templateId: TemplateId;
};

export const DEFAULT_DESIGN: Design = {
  fontFamily: "sans",
  baseFontSize: 10,
  nameFontSize: 20,
  headingFontSize: 11,
  accentColor: "",
  textColor: "#111111",
  headerAlign: "left",
  sectionHeadingCase: "upper",
  sectionHeadingRule: "full-width",
  bulletChar: "•",
  contactSeparator: "|",
  density: "normal",
  margin: "normal",
  headingFamily: "match",
  lineHeight: 1.38,
  paperSize: "LETTER",
  linkStyle: "plain",
  templateId: "source",
};

/** Glyphs guaranteed to exist in the WinAnsi encoding of the standard fonts. */
export const BULLET_CHARS = ["•", "–", "-", "·", "*", "o"] as const;
export const SEPARATOR_CHARS = ["|", "·", "•", "–", "-", "/"] as const;

export const FONT_FAMILIES = FONT_FAMILY_IDS;
export const HEADER_ALIGNS = ["left", "center"] as const;
export const HEADING_CASES = ["upper", "title", "as-written"] as const;
export const HEADING_RULES = ["full-width", "under-text", "none"] as const;
export const DENSITIES = ["compact", "normal", "roomy"] as const;
export const MARGINS = ["narrow", "normal", "wide"] as const;

/** Presets offered in the design panel when the detected accent needs a nudge. */
export const ACCENT_SWATCHES = [
  { name: "None", value: "" },
  { name: "Navy", value: "#1f3864" },
  { name: "Slate", value: "#374151" },
  { name: "Teal", value: "#0f5f5c" },
  { name: "Burgundy", value: "#7a1f2b" },
  { name: "Forest", value: "#1f4d2e" },
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hexOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return HEX.test(trimmed) ? trimmed : fallback;
}

/** Merges a partial/untrusted design over the defaults, clamping every field. */
export function normalizeDesign(raw: unknown): Design {
  const d = (raw ?? {}) as Partial<Design>;

  return {
    fontFamily: pick(d.fontFamily, FONT_FAMILIES, DEFAULT_DESIGN.fontFamily),
    baseFontSize: clampNumber(d.baseFontSize, 8, 13, DEFAULT_DESIGN.baseFontSize),
    nameFontSize: clampNumber(d.nameFontSize, 12, 34, DEFAULT_DESIGN.nameFontSize),
    headingFontSize: clampNumber(d.headingFontSize, 9, 16, DEFAULT_DESIGN.headingFontSize),
    // An empty accent is meaningful (pure black-and-white resume), so it is
    // preserved rather than replaced with the default.
    accentColor:
      typeof d.accentColor === "string" && !d.accentColor.trim() ? "" : hexOr(d.accentColor, ""),
    textColor: hexOr(d.textColor, DEFAULT_DESIGN.textColor),
    headerAlign: pick(d.headerAlign, HEADER_ALIGNS, DEFAULT_DESIGN.headerAlign),
    sectionHeadingCase: pick(d.sectionHeadingCase, HEADING_CASES, DEFAULT_DESIGN.sectionHeadingCase),
    sectionHeadingRule: pick(d.sectionHeadingRule, HEADING_RULES, DEFAULT_DESIGN.sectionHeadingRule),
    bulletChar: pick(d.bulletChar, BULLET_CHARS, DEFAULT_DESIGN.bulletChar),
    contactSeparator: pick(d.contactSeparator, SEPARATOR_CHARS, DEFAULT_DESIGN.contactSeparator),
    density: pick(d.density, DENSITIES, DEFAULT_DESIGN.density),
    margin: pick(d.margin, MARGINS, DEFAULT_DESIGN.margin),
    headingFamily: pick(d.headingFamily, HEADING_FAMILIES, DEFAULT_DESIGN.headingFamily),
    lineHeight: clampNumber(d.lineHeight, 1.05, 1.8, DEFAULT_DESIGN.lineHeight),
    paperSize: pick(d.paperSize, PAPER_SIZES, DEFAULT_DESIGN.paperSize),
    linkStyle: pick(d.linkStyle, LINK_STYLES, DEFAULT_DESIGN.linkStyle),
    templateId: pick(d.templateId, TEMPLATE_IDS, DEFAULT_DESIGN.templateId),
  };
}

/** Vertical rhythm multiplier — the single knob behind `density`. */
export const DENSITY_SCALE: Record<Design["density"], number> = {
  compact: 0.72,
  normal: 1,
  roomy: 1.35,
};

/** Horizontal page padding in points. */
export const MARGIN_POINTS: Record<Design["margin"], number> = {
  narrow: 32,
  normal: 46,
  wide: 64,
};

/** Page width in points — used to size the preview to the real sheet. */
export const PAPER_WIDTH_POINTS: Record<Design["paperSize"], number> = {
  LETTER: 612,
  A4: 595.28,
};

/** Labels for the typeface controls, naming the font an ATS will actually see. */
export const FONT_FAMILY_LABELS: Record<Design["fontFamily"], string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
};

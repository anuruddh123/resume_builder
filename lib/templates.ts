import { DEFAULT_DESIGN, normalizeDesign, type Design, type TemplateId } from "./design";

/**
 * Formats the resume can be re-cast into.
 *
 * Every template is a *typographic* preset only — it changes fonts, spacing,
 * rules and colour, never the content or the section order. That is also what
 * keeps them all ATS-safe: the skeleton the parser cares about (one column, no
 * tables, no text boxes, no graphics, standard fonts, real selectable text) is
 * fixed in the PDF renderer and is not something a template can opt out of.
 *
 * The remaining ATS risk in a design is colour contrast and glyphs outside
 * WinAnsi, both of which are already clamped in `design.ts`.
 */

export type Template = {
  id: TemplateId;
  name: string;
  blurb: string;
  /** Everything but the id; applying a template replaces the whole look. */
  design: Omit<Design, "templateId">;
};

/** Shared floor so a template only has to state what it changes. */
const base: Omit<Design, "templateId"> = {
  ...DEFAULT_DESIGN,
  textColor: "#111111",
};

export const TEMPLATES: Template[] = [
  {
    id: "source",
    name: "Match my upload",
    blurb: "The fonts, spacing and colour read off the file you uploaded.",
    design: base,
  },
  {
    id: "classic",
    name: "Classic",
    blurb: "Times, full-width rules, capitalised headings. The safest default.",
    design: {
      ...base,
      fontFamily: "serif",
      headingFamily: "match",
      baseFontSize: 10.5,
      nameFontSize: 20,
      headingFontSize: 11.5,
      accentColor: "",
      headerAlign: "center",
      sectionHeadingCase: "upper",
      sectionHeadingRule: "full-width",
      bulletChar: "•",
      contactSeparator: "|",
      density: "normal",
      margin: "normal",
      lineHeight: 1.34,
    },
  },
  {
    id: "modern",
    name: "Modern",
    blurb: "Sans body with a navy accent and title-case headings.",
    design: {
      ...base,
      fontFamily: "sans",
      headingFamily: "match",
      baseFontSize: 10,
      nameFontSize: 22,
      headingFontSize: 11,
      accentColor: "#1f3864",
      headerAlign: "left",
      sectionHeadingCase: "title",
      sectionHeadingRule: "full-width",
      bulletChar: "•",
      contactSeparator: "·",
      density: "normal",
      margin: "normal",
      lineHeight: 1.4,
    },
  },
  {
    id: "compact",
    name: "Compact",
    blurb: "Tight spacing and narrow margins to pull a long resume onto one page.",
    design: {
      ...base,
      fontFamily: "sans",
      headingFamily: "match",
      baseFontSize: 9,
      nameFontSize: 16,
      headingFontSize: 10,
      accentColor: "",
      headerAlign: "left",
      sectionHeadingCase: "upper",
      sectionHeadingRule: "full-width",
      bulletChar: "–",
      contactSeparator: "|",
      density: "compact",
      margin: "narrow",
      lineHeight: 1.2,
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    blurb: "Centred header, wide margins, generous leading. Reads unhurried.",
    design: {
      ...base,
      fontFamily: "serif",
      headingFamily: "sans",
      baseFontSize: 10.5,
      nameFontSize: 24,
      headingFontSize: 10.5,
      accentColor: "#374151",
      headerAlign: "center",
      sectionHeadingCase: "upper",
      sectionHeadingRule: "under-text",
      bulletChar: "·",
      contactSeparator: "·",
      density: "roomy",
      margin: "wide",
      lineHeight: 1.5,
    },
  },
  {
    id: "technical",
    name: "Technical",
    blurb: "Sans body with monospaced headings — engineering and data roles.",
    design: {
      ...base,
      fontFamily: "sans",
      headingFamily: "mono",
      baseFontSize: 9.5,
      nameFontSize: 18,
      headingFontSize: 10.5,
      accentColor: "#0f5f5c",
      headerAlign: "left",
      sectionHeadingCase: "upper",
      sectionHeadingRule: "full-width",
      bulletChar: "-",
      contactSeparator: "/",
      density: "compact",
      margin: "normal",
      lineHeight: 1.3,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "No rules, no colour. Pure hierarchy from size and weight.",
    design: {
      ...base,
      fontFamily: "sans",
      headingFamily: "match",
      baseFontSize: 10,
      nameFontSize: 19,
      headingFontSize: 10.5,
      accentColor: "",
      headerAlign: "left",
      sectionHeadingCase: "upper",
      sectionHeadingRule: "none",
      bulletChar: "•",
      contactSeparator: "·",
      density: "roomy",
      margin: "wide",
      lineHeight: 1.45,
    },
  },
];

export const TEMPLATES_BY_ID = new Map(TEMPLATES.map((template) => [template.id, template]));

/**
 * Produces the design for a template. `source` is not a fixed preset — it means
 * "whatever was read off the upload", so it is resolved against the detected
 * design that arrived with the tailoring result.
 */
export function applyTemplate(id: TemplateId, detected: unknown): Design {
  if (id === "source") return { ...normalizeDesign(detected), templateId: "source" };

  const template = TEMPLATES_BY_ID.get(id);
  if (!template) return normalizeDesign(detected);

  return normalizeDesign({ ...template.design, templateId: id });
}

import { z } from "zod";

/**
 * Structured outputs reject several JSON Schema keywords (minLength, maximum,
 * recursive $refs). Keep every field to plain types, enums, and arrays.
 */

/* ------------------------------------------------------------------ *
 * Hyperlinks
 * ------------------------------------------------------------------ */

export const LinkSchema = z.object({
  label: z
    .string()
    .describe("Visible text exactly as printed on the source resume, e.g. 'linkedin.com/in/ada'."),
  url: z
    .string()
    .describe(
      "Destination of the hyperlink, copied character-for-character from the source. " +
        "Empty string only if the text is not a link and no URL can be read from it.",
    ),
});

/* ------------------------------------------------------------------ *
 * Resume content
 * ------------------------------------------------------------------ */

export const ContactSchema = z.object({
  name: z.string().describe("Full name exactly as written in the source resume."),
  email: z.string().describe("Email address, or empty string if absent."),
  phone: z.string().describe("Phone number, or empty string if absent."),
  location: z.string().describe("City/region, or empty string if absent."),
  links: z
    .array(LinkSchema)
    .describe("LinkedIn, GitHub, portfolio and other links from the header. Empty array if none."),
});

export const EntrySchema = z.object({
  title: z
    .string()
    .describe(
      "Primary label: job title, degree, project name, certification, or skill-group name. " +
        "Copied verbatim when it is a factual anchor. Empty string for prose-only entries.",
    ),
  organization: z
    .string()
    .describe("Employer, institution, or publisher, copied verbatim. Empty string if none."),
  dates: z.string().describe("Date range, copied verbatim. Empty string if none."),
  location: z.string().describe("Location for this entry, copied verbatim. Empty string if none."),
  url: z
    .string()
    .describe(
      "Hyperlink attached to this entry in the source resume (project link, repo, publication). " +
        "Copied exactly. Empty string if the entry has no link.",
    ),
  body: z
    .array(z.string())
    .describe(
      "Prose lines for this entry. In a skills section, these are the individual skills that " +
        "belong under `title`. Empty array if the entry has none.",
    ),
  bullets: z
    .array(z.string())
    .describe("Bullet points, rewritten for the target job. Empty array if the entry has none."),
});

export const SECTION_KINDS = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "other",
] as const;

export const SectionSchema = z.object({
  heading: z
    .string()
    .describe(
      "Section heading copied verbatim from the source resume, including its original wording " +
        "and capitalisation, e.g. 'PROFESSIONAL EXPERIENCE' or 'Technical Skills'.",
    ),
  kind: z
    .enum(SECTION_KINDS)
    .describe("What this section is, so it can be laid out correctly. Use 'other' if unsure."),
  entries: z.array(EntrySchema).describe("The entries in this section, in display order."),
});

export const ResumeSchema = z.object({
  contact: ContactSchema,
  sections: z
    .array(SectionSchema)
    .describe(
      "Every section of the source resume, in the SAME order it appears there. Do not add, " +
        "merge, drop, or rename sections.",
    ),
});

/* ------------------------------------------------------------------ *
 * Visual design of the uploaded document
 * ------------------------------------------------------------------ */

export const DesignSchema = z.object({
  fontFamily: z
    .enum(["sans", "serif"])
    .describe("Body typeface of the uploaded resume: 'serif' for Times/Garamond/Cambria-like, otherwise 'sans'."),
  baseFontSize: z.number().describe("Body text size in points, typically 9-11."),
  nameFontSize: z.number().describe("Size of the candidate's name at the top, typically 16-26."),
  headingFontSize: z.number().describe("Size of section headings, typically 10-13."),
  accentColor: z
    .string()
    .describe(
      "Hex colour used for the name, section headings, or rules, e.g. '#1f3864'. " +
        "Empty string if the resume is entirely black-and-white.",
    ),
  textColor: z.string().describe("Hex colour of body text, usually '#000000' or a near-black."),
  headerAlign: z
    .enum(["left", "center"])
    .describe("How the name and contact block are aligned at the top of the page."),
  sectionHeadingCase: z
    .enum(["upper", "title", "as-written"])
    .describe("Capitalisation used for section headings in the source document."),
  sectionHeadingRule: z
    .enum(["full-width", "under-text", "none"])
    .describe(
      "Horizontal rule under section headings: 'full-width' spans the page, 'under-text' only " +
        "underlines the words, 'none' means there is no rule.",
    ),
  bulletChar: z
    .string()
    .describe("The bullet glyph used in the source document, e.g. '•', '-', or '·'."),
  contactSeparator: z
    .string()
    .describe("Character separating items on the contact line, e.g. '|', '·', or '-'."),
  density: z
    .enum(["compact", "normal", "roomy"])
    .describe("How tightly packed the source resume is vertically."),
  margin: z
    .enum(["narrow", "normal", "wide"])
    .describe("Page margin width in the source document."),
});

/**
 * What the model reads off the upload. Kept to exactly the fields the model can
 * observe — every knob the *user* turns afterwards lives on `Design` in
 * `lib/design.ts`, so adding a control never changes the structured-output
 * contract, and the client never has to load zod to know about one.
 */
export type DetectedDesign = z.infer<typeof DesignSchema>;

/* ------------------------------------------------------------------ *
 * Change tracking
 * ------------------------------------------------------------------ */

export const CHANGE_KINDS = ["reworded", "reordered", "keyword-added", "inferred"] as const;

export const ChangeSchema = z.object({
  section: z.string().describe("Where the change happened, e.g. 'Experience - Acme Corp'."),
  before: z.string().describe("Original text. Empty string if this content is new."),
  after: z.string().describe("Rewritten text."),
  kind: z
    .enum(CHANGE_KINDS)
    .describe(
      "reworded = same facts, new phrasing. reordered = moved for emphasis. " +
        "keyword-added = job-description term inserted into existing content. " +
        "inferred = asserts something not clearly evidenced in the source resume.",
    ),
  reason: z.string().describe("One short sentence explaining why."),
});

export const TailorResultSchema = z.object({
  resume: ResumeSchema,
  design: DesignSchema.describe(
    "A description of how the UPLOADED document looks, so the export can reproduce its " +
      "appearance. Describe the source, not what you think would look better.",
  ),
  changes: z.array(ChangeSchema).describe("Every modification made, one entry each."),
  keywordsInjected: z
    .array(z.string())
    .describe("Job-description keywords now present in the tailored resume."),
  keywordsMissing: z
    .array(z.string())
    .describe(
      "Job-description keywords that could NOT be worked in without fabricating experience.",
    ),
});

export type ResumeLink = z.infer<typeof LinkSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Section = z.infer<typeof SectionSchema>;
export type SectionKind = (typeof SECTION_KINDS)[number];
export type Resume = z.infer<typeof ResumeSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export type TailorResult = z.infer<typeof TailorResultSchema>;

import { marked, type Token } from "marked";
import type { Entry, Resume, Section } from "./schemas";

/** Matches DEFAULT_DESIGN, inlined so this module has no runtime imports. */
const FALLBACK_SEPARATOR = "|";

/* ------------------------------------------------------------------ *
 * Links
 * ------------------------------------------------------------------ */

/**
 * Turns whatever the model or the user wrote into something a PDF viewer will
 * actually open. Bare domains are the common case — "linkedin.com/in/ada" is a
 * link to a human but not to a URL parser.
 */
export function normalizeHref(href: string): string {
  const value = href.trim();
  if (!value) return "";
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[\w-]+(?:\.[\w-]+)+(?:[/?#].*)?$/.test(value)) return `https://${value}`;
  return value;
}

/** Escapes the two characters that would break out of `[label](url)`. */
function escapeLinkLabel(label: string): string {
  return label.replace(/([[\]])/g, "\\$1");
}

/** Escapes characters that would terminate the URL portion of a link. */
function escapeHref(href: string): string {
  return href.replace(/[()\s]/g, encodeURIComponent);
}

/** Renders `[label](url)`, or bare text when there is no URL to attach. */
export function mdLink(label: string, url: string): string {
  const text = label.trim();
  const href = url.trim();
  if (!text) return "";
  if (!href) return text;
  return `[${escapeLinkLabel(text)}](${escapeHref(href)})`;
}

/* ------------------------------------------------------------------ *
 * Resume -> Markdown (deterministic serializer)
 * ------------------------------------------------------------------ */

function serializeEntry(entry: Entry, section: Section, out: string[]): void {
  const title = entry.title.trim();
  const organization = entry.organization.trim();
  const body = entry.body.map((line) => line.trim()).filter(Boolean);
  const bullets = entry.bullets.map((line) => line.trim()).filter(Boolean);

  // Skill groups read as "**Category:** a, b, c" rather than as a heading with
  // a list under it, which is how they are almost always printed.
  if (section.kind === "skills" && title) {
    const items = [...body, ...bullets];
    out.push(items.length ? `**${title}:** ${items.join(", ")}` : `**${title}**`);
    return;
  }

  const headingLine = [mdLink(title, entry.url), organization].filter(Boolean).join(" — ");
  if (headingLine) out.push(`### ${headingLine}`);

  const meta = [entry.dates.trim(), entry.location.trim()].filter(Boolean).join(" · ");
  if (meta) out.push(`*${meta}*`);

  for (const line of body) out.push(line);
  if (bullets.length) out.push(bullets.map((line) => `- ${line}`).join("\n"));
}

/**
 * Serializes a Resume into Markdown. Because we always generate the Markdown,
 * the PDF exporter only has to understand this small subset: H1/H2/H3,
 * paragraphs, unordered lists, and inline bold/italic/link.
 */
export function resumeToMarkdown(
  resume: Resume,
  design?: { contactSeparator?: string },
): string {
  const separator = design?.contactSeparator?.trim() || FALLBACK_SEPARATOR;
  const out: string[] = [];
  const { contact } = resume;

  out.push(`# ${contact.name.trim()}`);

  const contactBits: string[] = [];
  const email = contact.email.trim();
  const phone = contact.phone.trim();
  if (email) contactBits.push(mdLink(email, `mailto:${email}`));
  if (phone) contactBits.push(mdLink(phone, `tel:${phone.replace(/[^\d+]/g, "")}`));
  if (contact.location.trim()) contactBits.push(contact.location.trim());
  for (const link of contact.links) {
    const rendered = mdLink(link.label || link.url, link.url);
    if (rendered) contactBits.push(rendered);
  }
  if (contactBits.length) out.push(contactBits.join(` ${separator} `));

  for (const section of resume.sections) {
    const heading = section.heading.trim();
    if (heading) out.push(`## ${heading}`);
    for (const entry of section.entries) serializeEntry(entry, section, out);
  }

  return out.join("\n\n") + "\n";
}

/* ------------------------------------------------------------------ *
 * Markdown -> flat blocks (for the PDF renderer)
 * ------------------------------------------------------------------ */

export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Set when this run sits inside a link; carried through to the PDF. */
  href?: string;
};

export type BlockType = "h1" | "h2" | "h3" | "para" | "bullet";

export type Block = {
  type: BlockType;
  runs: TextRun[];
};

/** Flattens marked's inline token tree into a flat list of styled runs. */
function flattenInline(tokens: Token[] | undefined, inherited: TextRun = { text: "" }): TextRun[] {
  if (!tokens?.length) return [];
  const runs: TextRun[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        runs.push(...flattenInline(token.tokens, { ...inherited, text: "", bold: true }));
        break;
      case "em":
        runs.push(...flattenInline(token.tokens, { ...inherited, text: "", italic: true }));
        break;
      case "codespan":
        runs.push({ ...inherited, text: token.text });
        break;
      case "br":
        runs.push({ ...inherited, text: " " });
        break;
      case "link": {
        const href = normalizeHref(token.href ?? "");
        const nested = flattenInline(token.tokens, { ...inherited, text: "", href });
        // A link whose label was consumed entirely (rare, e.g. an image label)
        // still deserves to appear, so fall back to the raw text.
        runs.push(...(nested.length ? nested : [{ ...inherited, text: token.text, href }]));
        break;
      }
      case "text":
      case "escape":
      case "html": {
        // `text` tokens can themselves carry nested inline tokens.
        const nested = (token as { tokens?: Token[] }).tokens;
        if (nested?.length) {
          runs.push(...flattenInline(nested, inherited));
        } else {
          runs.push({ ...inherited, text: token.text });
        }
        break;
      }
      default: {
        const raw = (token as { text?: string; raw?: string }).text ?? "";
        if (raw) runs.push({ ...inherited, text: raw });
      }
    }
  }

  return runs.filter((run) => run.text !== "");
}

const HEADING_BY_DEPTH: Record<number, BlockType> = { 1: "h1", 2: "h2", 3: "h3" };

/**
 * Parses the Markdown the user edited back into ordered blocks the PDF
 * template can render. Unsupported constructs degrade to plain paragraphs
 * rather than being dropped.
 */
export function markdownToBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];

  const walk = (tokens: Token[]) => {
    for (const token of tokens) {
      switch (token.type) {
        case "heading": {
          const type = HEADING_BY_DEPTH[token.depth] ?? "h3";
          const runs = flattenInline(token.tokens);
          if (runs.length) blocks.push({ type, runs });
          break;
        }
        case "paragraph": {
          const runs = flattenInline(token.tokens);
          if (runs.length) blocks.push({ type: "para", runs });
          break;
        }
        case "list": {
          for (const item of token.items) {
            const runs = flattenInline(item.tokens);
            if (runs.length) blocks.push({ type: "bullet", runs });
          }
          break;
        }
        case "blockquote": {
          walk(token.tokens ?? []);
          break;
        }
        case "code": {
          if (token.text.trim()) {
            blocks.push({ type: "para", runs: [{ text: token.text.trim() }] });
          }
          break;
        }
        case "text": {
          const runs = flattenInline((token as { tokens?: Token[] }).tokens ?? [token]);
          if (runs.length) blocks.push({ type: "para", runs });
          break;
        }
        // space, hr, html, def -> nothing to render
        default:
          break;
      }
    }
  };

  walk(marked.lexer(markdown));
  return blocks;
}

/** Convenience for tests and previews: the plain text of a block. */
export function blockText(block: Block): string {
  return block.runs.map((run) => run.text).join("");
}

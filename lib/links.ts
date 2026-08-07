// Explicit extensions: this module is loaded directly by the node:test suite,
// whose ESM resolver does not guess at them.
import { mdLink, normalizeHref } from "./markdown.ts";
import { SEPARATOR_CHARS } from "./design.ts";

/**
 * The header contact line is the one place in the document where structure
 * matters to the UI rather than only to the renderer: it is a single Markdown
 * paragraph that has to be split apart to be edited item-by-item, and rejoined
 * with whatever separator the current design asks for.
 *
 * Everything here operates on the Markdown string, which stays the single
 * source of truth — there is no parallel model of the header to drift out of
 * sync with what the user typed in the editor.
 */

export type ContactItem = {
  /** Visible text. For a plain item (a city, say) this is the whole thing. */
  label: string;
  /** Destination, or "" when the item is not a link. */
  url: string;
};

/** Matches ` | `, ` · `, ` – ` … — the separators we ever emit, spaces required
 *  so a slash inside a URL or a hyphen inside a word is never a split point. */
const SEPARATOR_SPLIT = new RegExp(
  `\\s+[${SEPARATOR_CHARS.map((c) => c.replace(/[-^\]\\]/g, "\\$&")).join("")}]\\s+`,
);

const MD_LINK = /^\[((?:\\.|[^\]\\])*)\]\(([^)]*)\)$/;

function unescapeLabel(label: string): string {
  return label.replace(/\\([[\]])/g, "$1");
}

/**
 * Locates the contact paragraph: the first non-empty, non-heading line after
 * the `# Name` heading. Returns the insertion point when the header has a name
 * but no contact line yet, so links can still be added to a bare resume.
 */
export function findContactLine(markdown: string): {
  lines: string[];
  index: number;
  exists: boolean;
} | null {
  const lines = markdown.split("\n");
  const nameIndex = lines.findIndex((line) => /^#\s+\S/.test(line));
  if (nameIndex === -1) return null;

  for (let i = nameIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // A heading means the header block ended without a contact line.
    if (line.startsWith("#")) return { lines, index: i, exists: false };
    return { lines, index: i, exists: true };
  }

  return { lines, index: lines.length, exists: false };
}

/** Splits a rendered contact line back into its individual items. */
export function parseContactItems(line: string): ContactItem[] {
  return line
    .split(SEPARATOR_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(MD_LINK);
      if (match) return { label: unescapeLabel(match[1]).trim(), url: match[2].trim() };
      return { label: part, url: "" };
    });
}

/** Joins items back into one Markdown paragraph. */
export function formatContactItems(items: ContactItem[], separator: string): string {
  return items
    .map((item) => mdLink(item.label.trim(), item.url.trim()))
    .filter(Boolean)
    .join(` ${separator.trim() || "|"} `);
}

/** The header items of a document, or an empty list if it has no header. */
export function readContactItems(markdown: string): ContactItem[] {
  const found = findContactLine(markdown);
  if (!found?.exists) return [];
  return parseContactItems(found.lines[found.index]);
}

/**
 * Writes the items back, replacing the existing contact line or inserting one
 * directly under the name. Removing every item removes the line entirely rather
 * than leaving a stray blank paragraph.
 */
export function writeContactItems(
  markdown: string,
  items: ContactItem[],
  separator: string,
): string {
  const found = findContactLine(markdown);
  if (!found) return markdown;

  const { lines, index, exists } = found;
  const line = formatContactItems(items, separator);
  const next = [...lines];

  if (exists) {
    if (line) next[index] = line;
    // Drop the line and the blank that followed it, so the name does not end up
    // with two blank lines under it.
    else next.splice(index, next[index + 1]?.trim() === "" ? 2 : 1);
  } else if (line) {
    next.splice(index, 0, line, "");
  }

  return next.join("\n");
}

/** Re-joins the existing header items with a different separator. */
export function setContactSeparator(markdown: string, separator: string): string {
  const items = readContactItems(markdown);
  if (!items.length) return markdown;
  return writeContactItems(markdown, items, separator);
}

/**
 * Normalizes a URL the user typed. Bare domains become https, and an address
 * that is plainly an email or phone number gets the scheme that makes it
 * actionable in the exported PDF.
 */
export function hrefFromInput(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^\+?[\d\s()-]{7,}$/.test(value)) return `tel:${value.replace(/[^\d+]/g, "")}`;
  return normalizeHref(value);
}

/** Suggestions offered as one-tap adds in the links panel. */
export const LINK_PRESETS = [
  { name: "LinkedIn", label: "linkedin.com/in/", url: "https://linkedin.com/in/" },
  { name: "GitHub", label: "github.com/", url: "https://github.com/" },
  { name: "Portfolio", label: "", url: "https://" },
  { name: "Email", label: "", url: "" },
  { name: "Phone", label: "", url: "" },
] as const;

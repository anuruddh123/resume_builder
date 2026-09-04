"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  DENSITY_SCALE,
  MARGIN_POINTS,
  PAPER_WIDTH_POINTS,
  type Design,
} from "@/lib/design";

type Props = {
  markdown: string;
  design: Design;
  onChange: (next: string) => void;
  onReset: () => void;
  dirty: boolean;
};

/** Screen equivalents of the PDF standard families the exporter uses. */
const FONT_STACKS: Record<Design["fontFamily"], string> = {
  sans: "Helvetica, Arial, sans-serif",
  serif: '"Times New Roman", Times, serif',
  mono: '"Courier New", Courier, ui-monospace, monospace',
};

export function ResumeEditor({ markdown, design, onChange, onReset, dirty }: Props) {
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(
    () => markdown.trim().split(/\s+/).filter(Boolean).length,
    [markdown],
  );

  /**
   * The preview is driven by the same values the PDF renderer uses, in the same
   * units (points against a 612pt LETTER page), so what is on screen is what
   * comes out of the export.
   */
  const paperStyle = {
    "--paper-accent": design.accentColor || design.textColor,
    "--paper-text": design.textColor,
    "--paper-align": design.headerAlign,
    "--paper-family": FONT_STACKS[design.fontFamily],
    "--paper-heading-family":
      FONT_STACKS[design.headingFamily === "match" ? design.fontFamily : design.headingFamily],
    "--paper-base": `${design.baseFontSize}pt`,
    "--paper-name": `${design.nameFontSize}pt`,
    "--paper-heading": `${design.headingFontSize}pt`,
    "--paper-leading": String(design.lineHeight),
    "--paper-gap": String(DENSITY_SCALE[design.density]),
    "--paper-bullet": `"${design.bulletChar}"`,
    paddingTop: `${40 * DENSITY_SCALE[design.density]}pt`,
    paddingBottom: `${40 * DENSITY_SCALE[design.density]}pt`,
    paddingLeft: `${MARGIN_POINTS[design.margin]}pt`,
    paddingRight: `${MARGIN_POINTS[design.margin]}pt`,
  } as React.CSSProperties;

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy to the clipboard.");
    }
  }

  async function download() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, design }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not generate the PDF.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? "resume-tailored.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-surface p-0.5">
          {(["preview", "edit"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                tab === value ? "bg-ink text-canvas" : "text-muted hover:text-ink"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <span className="hidden text-xs text-faint sm:inline">
          {words} words
          {dirty && <span className="ml-2 text-warn">· edited</span>}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <button
              onClick={onReset}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-line-strong hover:text-ink"
            >
              Revert edits
            </button>
          )}
          <button
            onClick={copyMarkdown}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-line-strong hover:text-ink"
          >
            {copied ? "Copied ✓" : "Copy text"}
          </button>
          <button
            onClick={download}
            disabled={exporting}
            className="sheen rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent shadow-[var(--lift)] transition hover:enabled:bg-accent-hover disabled:opacity-50"
          >
            {exporting ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-xs text-danger"
        >
          {error}
        </p>
      )}

      {tab === "edit" ? (
        <div className="min-h-[32rem] flex-1 overflow-hidden rounded-2xl border border-line bg-surface">
          <textarea
            value={markdown}
            onChange={(e) => onChange(e.target.value)}
            spellCheck
            className="scroll-slim h-full min-h-[32rem] w-full resize-none bg-transparent p-5 font-mono text-xs leading-relaxed text-ink outline-none"
          />
        </div>
      ) : (
        <div className="scroll-slim min-h-[32rem] flex-1 overflow-auto rounded-2xl border border-line bg-sunken p-4 sm:p-6">
          <div
            className="paper mx-auto w-full shadow-[var(--lift-lg)]"
            style={{ ...paperStyle, maxWidth: `${PAPER_WIDTH_POINTS[design.paperSize]}pt` }}
            data-case={design.sectionHeadingCase}
            data-rule={design.sectionHeadingRule}
            data-links={design.linkStyle}
          >
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer noopener">
                    {children}
                  </a>
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <p className="mt-2.5 text-xs text-faint">
        {tab === "edit"
          ? "Edit the Markdown directly — links written as [text](url) stay clickable in the PDF."
          : "This is the exported page at actual size. Links are live in the PDF."}
      </p>
    </div>
  );
}

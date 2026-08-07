"use client";

import { useState } from "react";
import {
  ACCENT_SWATCHES,
  BULLET_CHARS,
  DENSITIES,
  FONT_FAMILIES,
  FONT_FAMILY_LABELS,
  HEADER_ALIGNS,
  HEADING_CASES,
  HEADING_FAMILIES,
  HEADING_RULES,
  LINK_STYLES,
  MARGINS,
  PAPER_SIZES,
  SEPARATOR_CHARS,
  type Design,
} from "@/lib/design";

type Props = {
  design: Design;
  onChange: (next: Design) => void;
};

function Segmented<T extends string>({
  label,
  value,
  options,
  labels,
  onSelect,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels?: Record<string, string>;
  onSelect: (next: T) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-medium text-muted">{label}</span>
      <div className="flex rounded-lg border border-line bg-sunken p-0.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${
              value === option
                ? "bg-surface text-ink shadow-[var(--lift)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {labels?.[option] ?? option.replace("-", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The detected design is a reading of a PDF, so it is occasionally off by a
 * shade or a rule style. This makes every value the exporter uses correctable
 * without touching the Markdown.
 */
export function DesignPanel({ design, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof Design>(key: K, value: Design[K]) =>
    onChange({ ...design, [key]: value });

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>◈</span>
          Typography
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-normal text-muted">
            {FONT_FAMILY_LABELS[design.fontFamily]} · {design.baseFontSize}pt
          </span>
        </span>
        <span className="text-faint" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="space-y-3.5 border-t border-line p-3.5">
          <p className="text-[11px] leading-relaxed text-muted">
            Every choice here is reproduced exactly in the PDF. The three typefaces are the PDF
            standard families — Arial, Times and Courier — so no ATS has to guess at an embedded
            font.
          </p>

          <Segmented
            label="Body typeface"
            value={design.fontFamily}
            options={FONT_FAMILIES}
            labels={FONT_FAMILY_LABELS}
            onSelect={(v) => set("fontFamily", v)}
          />

          <Segmented
            label="Heading typeface"
            value={design.headingFamily}
            options={HEADING_FAMILIES}
            labels={{ match: "Match", ...FONT_FAMILY_LABELS }}
            onSelect={(v) => set("headingFamily", v)}
          />

          <Segmented
            label="Page size"
            value={design.paperSize}
            options={PAPER_SIZES}
            labels={{ LETTER: "US Letter", A4: "A4" }}
            onSelect={(v) => set("paperSize", v)}
          />

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-muted">Accent colour</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {ACCENT_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  title={swatch.name}
                  onClick={() => set("accentColor", swatch.value)}
                  className={`size-6 rounded-full border transition ${
                    design.accentColor === swatch.value
                      ? "border-ink ring-2 ring-accent ring-offset-2 ring-offset-surface"
                      : "border-line-strong hover:scale-110"
                  }`}
                  style={{
                    background: swatch.value || "repeating-conic-gradient(#bbb 0 25%, #fff 0 50%)",
                    backgroundSize: swatch.value ? undefined : "8px 8px",
                  }}
                />
              ))}
              <label className="ml-1 cursor-pointer text-[11px] text-accent underline underline-offset-2">
                custom
                <input
                  type="color"
                  value={design.accentColor || "#1f3864"}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <Segmented
            label="Header"
            value={design.headerAlign}
            options={HEADER_ALIGNS}
            onSelect={(v) => set("headerAlign", v)}
          />

          <Segmented
            label="Section headings"
            value={design.sectionHeadingCase}
            options={HEADING_CASES}
            labels={{ upper: "CAPS", title: "Title", "as-written": "As-is" }}
            onSelect={(v) => set("sectionHeadingCase", v)}
          />

          <Segmented
            label="Heading rule"
            value={design.sectionHeadingRule}
            options={HEADING_RULES}
            labels={{ "full-width": "Full", "under-text": "Text", none: "None" }}
            onSelect={(v) => set("sectionHeadingRule", v)}
          />

          <Segmented
            label="Density"
            value={design.density}
            options={DENSITIES}
            onSelect={(v) => set("density", v)}
          />

          <Segmented
            label="Margins"
            value={design.margin}
            options={MARGINS}
            onSelect={(v) => set("margin", v)}
          />

          <Segmented
            label="Link style"
            value={design.linkStyle}
            options={LINK_STYLES}
            labels={{ plain: "Plain", underline: "Underlined" }}
            onSelect={(v) => set("linkStyle", v)}
          />

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-muted">Bullet</span>
            <div className="flex gap-1.5">
              {BULLET_CHARS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => set("bulletChar", char)}
                  className={`size-7 rounded-lg border text-xs transition ${
                    design.bulletChar === char
                      ? "border-ink bg-ink text-canvas"
                      : "border-line bg-sunken text-muted hover:border-line-strong"
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-muted">
              Contact separator
            </span>
            <div className="flex gap-1.5">
              {SEPARATOR_CHARS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => set("contactSeparator", char)}
                  className={`size-7 rounded-lg border text-xs transition ${
                    design.contactSeparator === char
                      ? "border-ink bg-ink text-canvas"
                      : "border-line bg-sunken text-muted hover:border-line-strong"
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted">
              Body text size · {design.baseFontSize}pt
            </span>
            <input
              type="range"
              min={8}
              max={13}
              step={0.5}
              value={design.baseFontSize}
              onChange={(e) => set("baseFontSize", Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted">
              Name size · {design.nameFontSize}pt
            </span>
            <input
              type="range"
              min={12}
              max={34}
              step={1}
              value={design.nameFontSize}
              onChange={(e) => set("nameFontSize", Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted">
              Heading size · {design.headingFontSize}pt
            </span>
            <input
              type="range"
              min={9}
              max={16}
              step={0.5}
              value={design.headingFontSize}
              onChange={(e) => set("headingFontSize", Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted">
              Line spacing · {design.lineHeight.toFixed(2)}
            </span>
            <input
              type="range"
              min={1.05}
              max={1.8}
              step={0.01}
              value={design.lineHeight}
              onChange={(e) => set("lineHeight", Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </label>
        </div>
      )}
    </div>
  );
}

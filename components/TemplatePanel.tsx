"use client";

import type { Design, TemplateId } from "@/lib/design";
import { TEMPLATES } from "@/lib/templates";

type Props = {
  active: TemplateId;
  /** True once the user has nudged a control, so the card can say so. */
  customised: boolean;
  onSelect: (id: TemplateId) => void;
};

const PREVIEW_FONTS: Record<Design["fontFamily"], string> = {
  sans: "Helvetica, Arial, sans-serif",
  serif: '"Times New Roman", Times, serif',
  mono: 'ui-monospace, "Courier New", monospace',
};

/** A three-line sketch of the format: name, rule, two body lines. */
function Thumbnail({ design }: { design: Omit<Design, "templateId"> }) {
  const accent = design.accentColor || design.textColor;
  const align = design.headerAlign === "center" ? "center" : "flex-start";
  const rule = design.sectionHeadingRule;

  return (
    <div
      aria-hidden
      className="mb-2 flex h-14 flex-col gap-[3px] rounded-md bg-white px-2 py-2 ring-1 ring-black/10"
      style={{ alignItems: align, fontFamily: PREVIEW_FONTS[design.fontFamily] }}
    >
      <span
        className="text-[7px] font-bold leading-none"
        style={{ color: accent, letterSpacing: design.sectionHeadingCase === "upper" ? 0.4 : 0 }}
      >
        NAME
      </span>
      <span
        className="block"
        style={{
          width: rule === "under-text" ? "34%" : "100%",
          height: rule === "none" ? 0 : 1,
          background: rule === "none" ? "transparent" : accent,
          marginTop: 1,
        }}
      />
      {[92, 74].map((width) => (
        <span
          key={width}
          className="block rounded-full bg-black/25"
          style={{ width: `${width}%`, height: 1.5 }}
        />
      ))}
    </div>
  );
}

/**
 * Re-casts the resume into a different format. Templates are typography only —
 * none of them can introduce the two-column layouts, tables or text boxes that
 * break applicant tracking systems, so switching format is never a bet on
 * whether the file still parses.
 */
export function TemplatePanel({ active, customised, onSelect }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold">
          <span aria-hidden className="mr-2">
            ▤
          </span>
          Format
        </span>
        <span className="ml-auto rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-medium text-good">
          all ATS-safe
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-muted">
        Single column, standard fonts, real selectable text — in every one.
        {customised && active !== "source" && " Your tweaks are on top of this."}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((template) => {
          const selected = template.id === active;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              aria-pressed={selected}
              title={template.blurb}
              className={`rounded-xl border p-2 text-left transition ${
                selected
                  ? "border-accent bg-accent-soft ring-1 ring-accent"
                  : "border-line bg-sunken hover:border-line-strong"
              }`}
            >
              <Thumbnail design={template.design} />
              <span className="block text-[11px] font-semibold leading-tight">{template.name}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                {template.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

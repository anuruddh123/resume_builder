"use client";

import { useState } from "react";
import { hrefFromInput, LINK_PRESETS, type ContactItem } from "@/lib/links";

type Props = {
  items: ContactItem[];
  onChange: (next: ContactItem[]) => void;
};

/**
 * Edits the header line item by item. The panel deliberately shows plain text
 * entries (a city, say) alongside real links: they share one line in the
 * document, so reordering or removing one has to work the same either way.
 *
 * Anything outside the header — a repo link on a project, a publication DOI —
 * is written straight into the body as `[text](url)` in the Markdown editor.
 */
export function LinksPanel({ items, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContactItem>({ label: "", url: "" });
  const [error, setError] = useState<string | null>(null);

  const linkCount = items.filter((item) => item.url).length;

  const update = (index: number, patch: Partial<ContactItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  function add() {
    const label = draft.label.trim();
    const url = draft.url.trim();
    if (!label && !url) {
      setError("Give the link a label or an address.");
      return;
    }
    setError(null);
    // A bare address with no label prints as the address itself, which is what
    // people expect from "github.com/ada" on a resume.
    onChange([...items, { label: label || url, url: hrefFromInput(url) }]);
    setDraft({ label: "", url: "" });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>🔗</span>
          Links
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-normal text-muted">
            {linkCount} in header
          </span>
        </span>
        <span className="text-faint" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-3.5">
          <p className="text-[11px] leading-relaxed text-muted">
            The contact line under your name. Every entry stays clickable in the exported PDF.
          </p>

          {items.length === 0 && (
            <p className="rounded-lg bg-sunken px-3 py-2 text-[11px] text-muted">
              No header items yet — add one below.
            </p>
          )}

          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="rounded-xl border border-line bg-sunken p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={item.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    placeholder="Label"
                    aria-label={`Item ${index + 1} label`}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="rounded px-1 text-xs text-muted transition hover:text-ink disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                    className="rounded px-1 text-xs text-muted transition hover:text-ink disabled:opacity-25"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remove"
                    className="rounded px-1 text-xs text-muted transition hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
                <input
                  value={item.url}
                  onChange={(e) => update(index, { url: e.target.value })}
                  onBlur={(e) => update(index, { url: hrefFromInput(e.target.value) })}
                  placeholder="https://… (leave empty for plain text)"
                  aria-label={`Item ${index + 1} address`}
                  className="mt-1.5 w-full rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[10px] text-muted outline-none focus:border-accent"
                />
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-dashed border-line-strong p-2">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {LINK_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setDraft({ label: preset.label, url: preset.url })}
                  className="rounded-full border border-line bg-sunken px-2 py-0.5 text-[10px] text-muted transition hover:border-line-strong hover:text-ink"
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Text to show, e.g. linkedin.com/in/ada"
              aria-label="New link label"
              className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
            />
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Address — URL, email, or phone"
              aria-label="New link address"
              className="mt-1.5 w-full rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[10px] outline-none focus:border-accent"
            />
            {error && <p className="mt-1.5 text-[10px] text-danger">{error}</p>}
            <button
              type="button"
              onClick={add}
              className="mt-2 w-full rounded-lg bg-ink px-2 py-1.5 text-[11px] font-semibold text-canvas transition hover:opacity-90"
            >
              Add to header
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-faint">
            For a link somewhere else in the resume, write{" "}
            <code className="rounded bg-sunken px-1">[text](url)</code> in the Edit tab.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Change, ChangeKind } from "@/lib/schemas";

const KIND_ORDER: ChangeKind[] = ["inferred", "keyword-added", "reworded", "reordered"];

const KIND_META: Record<
  ChangeKind,
  { label: string; blurb: string; chip: string; card: string; icon: string }
> = {
  inferred: {
    label: "Review these",
    blurb:
      "These assert something your original resume did not clearly state. Check each one is defensible in an interview, and edit anything that overstates your experience.",
    chip: "bg-warn-soft text-warn border border-warn-line",
    card: "border-warn-line bg-warn-soft/50",
    icon: "⚠",
  },
  "keyword-added": {
    label: "Keywords added",
    blurb: "Job-posting terms worked into experience you already had.",
    chip: "bg-accent-soft text-accent",
    card: "border-line bg-sunken",
    icon: "＋",
  },
  reworded: {
    label: "Reworded",
    blurb: "Same facts, phrasing tuned to the posting.",
    chip: "bg-sunken text-muted",
    card: "border-line bg-sunken",
    icon: "✎",
  },
  reordered: {
    label: "Reordered",
    blurb: "Content moved so the most relevant material comes first.",
    chip: "bg-sunken text-muted",
    card: "border-line bg-sunken",
    icon: "⇅",
  },
};

function MatchMeter({ matched, missing }: { matched: number; missing: number }) {
  const total = matched + missing;
  const pct = total === 0 ? 0 : Math.round((matched / total) * 100);
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 60 60" className="size-16 -rotate-90">
          <circle cx="30" cy="30" r="26" fill="none" stroke="var(--line)" strokeWidth="6" />
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Keyword coverage</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {matched} of {total} posting keyword{total === 1 ? "" : "s"} are now in your resume.
        </p>
      </div>
    </div>
  );
}

function ChangeCard({ change }: { change: Change }) {
  const meta = KIND_META[change.kind];
  return (
    <li className={`rounded-xl border p-3 text-xs ${meta.card}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-ink">{change.section}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.chip}`}>
          {change.kind}
        </span>
      </div>
      {change.before && (
        <p className="mb-1.5 text-faint line-through">{change.before}</p>
      )}
      <p className="mb-2 leading-relaxed text-ink">{change.after}</p>
      <p className="italic text-muted">{change.reason}</p>
    </li>
  );
}

export function ChangeList({
  changes,
  keywordsInjected,
  keywordsMissing,
}: {
  changes: Change[];
  keywordsInjected: string[];
  keywordsMissing: string[];
}) {
  const [open, setOpen] = useState<ChangeKind | null>("inferred");

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: changes.filter((c) => c.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-3">
      <MatchMeter matched={keywordsInjected.length} missing={keywordsMissing.length} />

      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold">What changed</h2>
        <span className="text-xs text-muted">
          {changes.length} edit{changes.length === 1 ? "" : "s"}
        </span>
      </div>

      {grouped.map(({ kind, items }) => {
        const meta = KIND_META[kind];
        const isOpen = open === kind;
        return (
          <div
            key={kind}
            className={`overflow-hidden rounded-2xl border bg-surface ${
              kind === "inferred" ? "border-warn-line" : "border-line"
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : kind)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left transition hover:bg-sunken"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden className={kind === "inferred" ? "text-warn" : "text-faint"}>
                  {meta.icon}
                </span>
                {meta.label}
                <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-normal text-muted">
                  {items.length}
                </span>
              </span>
              <span className="text-faint" aria-hidden>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-line p-3.5">
                <p className="mb-3 text-xs leading-relaxed text-muted">{meta.blurb}</p>
                <ul className="space-y-2">
                  {items.map((change, i) => (
                    <ChangeCard key={i} change={change} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {keywordsInjected.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <h3 className="mb-2 text-xs font-semibold">Keywords matched</h3>
          <div className="flex flex-wrap gap-1.5">
            {keywordsInjected.map((kw) => (
              <span
                key={kw}
                className="rounded-md bg-good-soft px-2 py-0.5 text-[11px] text-good"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {keywordsMissing.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <h3 className="mb-1 text-xs font-semibold">Still missing</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-muted">
            Requirements with no support in your resume. Add them yourself only if true.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywordsMissing.map((kw) => (
              <span key={kw} className="rounded-md bg-sunken px-2 py-0.5 text-[11px] text-muted">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

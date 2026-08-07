"use client";

import { useEffect, useState } from "react";

/**
 * The tailoring call is a single opaque request, so there is no real progress
 * to report. These steps are paced to the typical 30–60s round trip and are
 * honest about what the model is doing, in order — they are not a fake
 * percentage bar.
 */
const STEPS = [
  { label: "Reading your document", detail: "Layout, fonts, sections and links" },
  { label: "Mining the job posting", detail: "Requirements, tools and exact phrasing" },
  { label: "Matching your evidence", detail: "Pairing each requirement to real experience" },
  { label: "Rewriting for the match", detail: "Keeping your structure and wording intact" },
  { label: "Rebuilding your layout", detail: "Reproducing the design you uploaded" },
];

const STEP_MS = 9000;

export function WorkingPanel({ fileName }: { fileName?: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Holds on the last step rather than looping, so a slow request does not
    // look like it restarted.
    const timer = setInterval(
      () => setActive((current) => Math.min(current + 1, STEPS.length - 1)),
      STEP_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rise rounded-3xl border border-line bg-surface p-7 shadow-[var(--lift)]">
      <div className="flex items-center gap-3">
        <span
          className="spin-slow grid size-9 place-items-center rounded-full border-2 border-line border-t-accent"
          aria-hidden
        />
        <div>
          <p className="font-display text-lg font-semibold">Tailoring your resume</p>
          <p className="text-xs text-muted">
            {fileName ? `Working on ${fileName}` : "This usually takes 30–60 seconds."}
          </p>
        </div>
      </div>

      <ol className="mt-6 space-y-1" aria-live="polite">
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li
              key={step.label}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${
                current ? "bg-accent-soft" : ""
              } ${i > active ? "opacity-35" : ""}`}
            >
              <span
                aria-hidden
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-good text-canvas"
                    : current
                      ? "pulse-soft bg-accent text-on-accent"
                      : "border border-line-strong text-faint"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{step.label}</span>
                <span className="block text-xs text-muted">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 h-1 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full bg-accent transition-all duration-700 ease-out"
          style={{ width: `${((active + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

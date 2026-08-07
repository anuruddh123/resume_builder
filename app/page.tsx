"use client";

import { useMemo, useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ChangeList } from "@/components/ChangeList";
import { DesignPanel } from "@/components/DesignPanel";
import { LinksPanel } from "@/components/LinksPanel";
import { TemplatePanel } from "@/components/TemplatePanel";
import { WorkingPanel } from "@/components/WorkingPanel";
import {
  DEFAULT_DESIGN,
  normalizeDesign,
  type Design,
  type TemplateId,
} from "@/lib/design";
import { applyTemplate } from "@/lib/templates";
import {
  readContactItems,
  setContactSeparator,
  writeContactItems,
  type ContactItem,
} from "@/lib/links";
import type { TailorResponse } from "@/lib/types";

const PROMISES = [
  {
    icon: "◫",
    title: "Your layout, or a new one",
    body: "The export reproduces the file you uploaded — or re-casts it into any of six ATS-safe formats.",
  },
  {
    icon: "🔗",
    title: "Your links, editable",
    body: "Every hyperlink comes through clickable, and you can add, reorder or remove them.",
  },
  {
    icon: "◎",
    title: "Nothing invented",
    body: "Anything the rewrite implies but your resume did not state is flagged for you to review.",
  },
];

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  /** Whether any individual control was moved after the template was picked. */
  const [touched, setTouched] = useState(false);

  const contactItems = useMemo(() => readContactItems(markdown), [markdown]);

  /**
   * What "unedited" means once a format has been chosen: the model's text, but
   * with the separator the current design asks for. Without this, reverting
   * would silently undo a format choice as well as the edits.
   */
  const baseline = useMemo(
    () => (result ? setContactSeparator(result.markdown, design.contactSeparator) : ""),
    [result, design.contactSeparator],
  );

  /**
   * Changing the contact separator has to rewrite the header line, because the
   * Markdown — not the design object — is what actually holds it.
   */
  function updateDesign(next: Design) {
    if (next.contactSeparator !== design.contactSeparator) {
      setMarkdown((current) => setContactSeparator(current, next.contactSeparator));
    }
    setDesign(next);
    setTouched(true);
  }

  function selectTemplate(id: TemplateId) {
    const next = applyTemplate(id, result?.design);
    if (next.contactSeparator !== design.contactSeparator) {
      setMarkdown((current) => setContactSeparator(current, next.contactSeparator));
    }
    setDesign(next);
    setTouched(false);
  }

  function updateContactItems(items: ContactItem[]) {
    setMarkdown((current) => writeContactItems(current, items, design.contactSeparator));
  }

  async function tailor(resume: File, jobDescription: string) {
    setBusy(true);
    setError(null);
    setFileName(resume.name);
    try {
      const form = new FormData();
      form.set("resume", resume);
      form.set("jobDescription", jobDescription);

      const response = await fetch("/api/tailor", { method: "POST", body: form });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");

      const tailored = body as TailorResponse;
      setResult(tailored);
      setMarkdown(tailored.markdown);
      setDesign(normalizeDesign(tailored.design));
      setTouched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setResult(null);
    setMarkdown("");
    setError(null);
    setDesign(DEFAULT_DESIGN);
    setTouched(false);
  }

  if (result) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="rise mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Your tailored resume
            </h1>
            <p className="mt-1 text-sm text-muted">
              Review the flagged claims, change the format, fonts or links, then export.
            </p>
          </div>
          <button
            onClick={startOver}
            className="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-muted transition hover:border-line-strong hover:text-ink"
          >
            Start over
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="rise d1">
            <ResumeEditor
              markdown={markdown}
              design={design}
              onChange={setMarkdown}
              onReset={() => setMarkdown(baseline)}
              dirty={markdown !== baseline}
            />
          </div>

          <aside className="rise d2 space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 scroll-slim">
            <TemplatePanel
              active={design.templateId}
              customised={touched}
              onSelect={selectTemplate}
            />
            <LinksPanel items={contactItems} onChange={updateContactItems} />
            <DesignPanel design={design} onChange={updateDesign} />
            <ChangeList
              changes={result.changes}
              keywordsInjected={result.keywordsInjected}
              keywordsMissing={result.keywordsMissing}
            />
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <section className="text-center">
        <span className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-good" aria-hidden />
          One posting at a time, done properly
        </span>

        <h1 className="rise d1 mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Rewrite your resume for
          <br className="hidden sm:block" />{" "}
          <span className="text-accent">the job you actually want</span>
        </h1>

        <p className="rise d2 mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
          Upload your resume and paste the posting. You get back the same document — same
          sections, same design, same links — rewritten to match what they asked for.
        </p>
      </section>

      <div className="mt-10">
        {busy && <WorkingPanel fileName={fileName} />}

        {/* Kept mounted while busy so a failed request does not discard the
            uploaded file and the pasted posting. */}
        <div className={busy ? "hidden" : "rise d3"}>
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--lift)] sm:p-8">
            <UploadForm onSubmit={tailor} busy={busy} />
          </div>
        </div>
      </div>

      {error && !busy && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="rise d4 mt-12 grid gap-3 sm:grid-cols-3">
        {PROMISES.map((promise) => (
          <div key={promise.title} className="rounded-2xl border border-line bg-surface/70 p-4">
            <span className="text-lg" aria-hidden>
              {promise.icon}
            </span>
            <h2 className="mt-2 text-sm font-semibold">{promise.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{promise.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

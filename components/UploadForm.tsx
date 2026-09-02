"use client";

import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, MIN_JD_CHARS } from "@/lib/constants";

type Props = {
  onSubmit: (resume: File, jobDescription: string) => void;
  busy: boolean;
};

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function UploadForm({ onSubmit, busy }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const jdLength = jd.trim().length;
  const jdReady = jdLength >= MIN_JD_CHARS;
  const ready = Boolean(file) && jdReady;
  // Full at 1,200 characters — roughly where a posting carries enough signal
  // for the keyword pass to be worth running.
  const jdProgress = Math.min(100, Math.round((jdLength / 1200) * 100));

  function acceptFile(next: File | null) {
    if (!next) return;
    if (next.size > MAX_FILE_BYTES) {
      setError(`That file is ${formatSize(next.size)}. Please upload a resume under 4 MB.`);
      return;
    }
    setError(null);
    setFile(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Upload your current resume first.");
    if (!jdReady) {
      return setError("Paste the full job description — a few sentences at minimum.");
    }
    setError(null);
    onSubmit(file, jd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <label className="flex items-center gap-2.5 text-sm font-bold text-ink">
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-tr from-accent to-purple-500 text-[11px] font-bold text-white shadow-xs">
              1
            </span>
            Upload Current Resume
          </label>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-semibold text-danger transition hover:underline"
            >
              Remove
            </button>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer.files[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload your resume"
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
            dragging
              ? "scale-[1.01] border-accent bg-accent-soft/80 shadow-md shadow-accent/10"
              : file
                ? "border-good/50 bg-good-soft/30 shadow-xs"
                : "border-line-strong/80 bg-surface/60 hover:border-accent hover:bg-accent-soft/30 hover:shadow-md"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center justify-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-good/15 text-xl font-bold text-good shadow-xs">
                ✓
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-bold text-ink">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatSize(file.size)} · <span className="text-accent underline font-medium">Click to replace</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="grid size-12 place-items-center rounded-2xl border border-line bg-surface text-xl text-accent shadow-xs transition group-hover:-translate-y-1 group-hover:scale-105 group-hover:border-accent/40"
                aria-hidden
              >
                📄
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Drag & drop your resume here, or{" "}
                  <span className="text-accent underline underline-offset-4">browse files</span>
                </p>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="rounded-md border border-line bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">PDF</span>
                  <span className="rounded-md border border-line bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">DOCX</span>
                  <span className="rounded-md border border-line bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">TXT</span>
                  <span className="text-[11px] text-faint ml-1">up to 4 MB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <label htmlFor="jd" className="flex items-center gap-2.5 text-sm font-bold text-ink">
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-tr from-accent to-purple-500 text-[11px] font-bold text-white shadow-xs">
              2
            </span>
            Target Job Description
          </label>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
              jdReady ? "bg-good-soft text-good" : "bg-sunken text-muted"
            }`}
          >
            {jdLength.toLocaleString()} characters {jdReady && "• Ready"}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line/80 bg-surface/70 transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 focus-within:shadow-md">
          <textarea
            id="jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={10}
            placeholder="Paste the full job posting here — requirements, responsibilities, and key technologies. The more complete the description, the better the keyword matching."
            className="scroll-slim w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-faint"
          />
          <div className="h-1.5 w-full bg-sunken">
            <div
              className={`h-full transition-all duration-500 bg-gradient-to-r ${
                jdReady ? "from-indigo-500 via-purple-500 to-emerald-500" : "from-accent to-indigo-500"
              }`}
              style={{ width: `${jdProgress}%` }}
            />
          </div>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger shadow-xs"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !ready}
        className="sheen relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-accent via-indigo-600 to-purple-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all duration-300 hover:enabled:-translate-y-0.5 hover:enabled:shadow-xl hover:enabled:shadow-accent/35 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? (
          <>
            <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Analyzing & Tailoring Resume…
          </>
        ) : (
          <>
            Tailor My Resume Now
            <span aria-hidden className="transition-transform group-hover:translate-x-1 font-bold">
              →
            </span>
          </>
        )}
      </button>

      <p className="text-center text-xs font-medium text-muted">
        {ready
          ? "⚡ Fast AI generation takes ~2–4 seconds."
          : "Upload a resume and paste a job description to begin."}
      </p>
    </form>
  );
}

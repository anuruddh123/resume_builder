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
    <form onSubmit={handleSubmit} className="space-y-7">
      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-canvas">
              1
            </span>
            Your current resume
          </label>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-medium text-muted transition hover:text-ink"
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
          className={`group cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-all duration-200 ${
            dragging
              ? "scale-[1.01] border-accent bg-accent-soft"
              : file
                ? "border-good/50 bg-good-soft/40"
                : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft/40"
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
            <div className="flex items-center justify-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-good-soft text-lg text-good">
                ✓
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatSize(file.size)} · click to choose a different file
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <span
                className="grid size-11 place-items-center rounded-xl border border-line bg-sunken text-lg text-muted transition group-hover:-translate-y-0.5 group-hover:text-accent"
                aria-hidden
              >
                ↑
              </span>
              <p className="text-sm font-medium">
                Drop your resume here, or{" "}
                <span className="text-accent underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-faint">PDF, DOCX, TXT or MD · up to 4 MB</p>
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-faint">
          Upload the PDF itself, not a copy-paste — that is how the layout and links are read.
        </p>
      </section>

      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <label htmlFor="jd" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-canvas">
              2
            </span>
            Job description
          </label>
          <span className={`text-xs tabular-nums ${jdReady ? "text-good" : "text-faint"}`}>
            {jdLength.toLocaleString()} characters
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface transition focus-within:border-accent">
          <textarea
            id="jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={11}
            placeholder="Paste the full posting here — requirements, responsibilities, and the tech stack. The more of it you include, the more keywords there are to match."
            className="scroll-slim w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-faint"
          />
          <div className="h-1 w-full bg-sunken">
            <div
              className={`h-full transition-all duration-500 ${jdReady ? "bg-good" : "bg-accent"}`}
              style={{ width: `${jdProgress}%` }}
            />
          </div>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !ready}
        className="sheen flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-semibold text-canvas shadow-[var(--lift)] transition hover:enabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Tailoring your resume…" : "Tailor my resume"}
        {!busy && (
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        )}
      </button>

      <p className="text-center text-xs text-faint">
        {ready
          ? "Takes about 30–60 seconds."
          : "Add both a resume and a job description to continue."}
      </p>
    </form>
  );
}

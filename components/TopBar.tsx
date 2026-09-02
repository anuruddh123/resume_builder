"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function ThemeToggle() {
  // Undefined until mounted: the real theme lives in localStorage / the OS, and
  // reading either during render would not match the server-rendered HTML.
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem("rt-theme");
    if (stored === "dark" || stored === "light") return setTheme(stored);
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("rt-theme", next);
    } catch {
      // Private browsing — the theme just will not persist.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle colour theme"
      className="grid size-9 place-items-center rounded-full border border-line bg-surface text-muted transition hover:border-line-strong hover:text-ink"
    >
      <span className="text-sm" aria-hidden>
        {theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent via-indigo-600 to-purple-500 shadow-md shadow-accent/20 text-white font-bold text-sm tracking-tight">
            ⚡
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-ink via-ink to-muted bg-clip-text">
              ResumeCraft
            </span>
          </div>
          <span className="ml-2 hidden rounded-full border border-line bg-surface/80 px-3 py-1 text-[11px] font-medium text-muted shadow-2xs backdrop-blur-sm sm:inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-good animate-pulse" />
            ATS Optimization Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

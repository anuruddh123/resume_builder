"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function ThemeToggle() {
  // Undefined until mounted: the real theme lives in localStorage / the OS, and
  // reading either during render would not match the server-rendered HTML.
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem("rt-theme");
    const next =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
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
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-[13px] font-bold text-canvas">
            RT
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Resume Tailor</span>
        </div>

        <span className="ml-1 hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-muted sm:inline">
          Keeps your layout · Keeps your links
        </span>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

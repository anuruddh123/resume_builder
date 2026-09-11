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

import { useAuth } from "@/context/AuthContext";

export function TopBar() {
  const { user, loading, openAuthModal, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent via-indigo-600 to-purple-500 text-sm font-bold text-white shadow-md shadow-accent/20">
            ⚡
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-ink via-ink to-muted bg-clip-text">
              ResumeCraft
            </span>
          </div>
          <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1 text-[11px] font-medium text-muted shadow-2xs backdrop-blur-sm sm:inline-flex">
            <span className="size-1.5 rounded-full bg-good animate-pulse" />
            ATS Engine
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!loading && (
            <>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface p-1 pr-3 text-xs font-semibold text-ink shadow-2xs transition hover:border-line-strong hover:bg-sunken"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-gradient-to-tr from-accent to-purple-500 font-bold text-white text-[11px]">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-accent-soft text-accent"
                      }`}
                    >
                      {user.role}
                    </span>
                  </button>

                  {/* Profile Dropdown */}
                  {profileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileOpen(false)}
                        aria-hidden
                      />
                      <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl backdrop-blur-xl">
                        <div className="border-b border-line/70 px-3 py-2">
                          <p className="truncate text-xs font-bold text-ink">{user.name}</p>
                          <p className="truncate text-[11px] text-muted">{user.email}</p>
                        </div>
                        <div className="p-1">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              logout();
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-danger transition hover:bg-danger-soft"
                          >
                            <span>🚪</span> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-canvas shadow-xs transition hover:opacity-90"
                >
                  Sign In
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

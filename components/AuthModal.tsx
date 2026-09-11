"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register, demoLogin } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDemo(role: "user" | "admin") {
    setError(null);
    setBusy(true);
    try {
      await demoLogin(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={closeAuthModal}
        aria-hidden
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl transition-all sm:p-8">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-5 top-5 grid size-8 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent via-indigo-600 to-purple-500 text-xl font-bold text-white shadow-md shadow-accent/25">
            ⚡
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
            {tab === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {tab === "login"
              ? "Sign in to customize and download tailored resumes"
              : "Sign up to start tailoring your resume for every application"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex rounded-xl border border-line bg-sunken p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={
              "flex-1 rounded-lg py-2 transition-all " +
              (tab === "login" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink")
            }
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={
              "flex-1 rounded-lg py-2 transition-all " +
              (tab === "register" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink")
            }
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-semibold text-ink">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "At least 6 characters" : "••••••••"}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-10 text-xs text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-xs text-muted hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="sheen relative mt-2 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-accent via-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md shadow-accent/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : tab === "login" ? (
              "Sign In to ResumeCraft"
            ) : (
              "Create My Account"
            )}
          </button>
        </form>

        {/* 1-Click Demo Login */}
        <div className="mt-6 border-t border-line/70 pt-5">
          <p className="text-center text-[11px] font-medium text-muted">
            ⚡ Quick Test with 1-Click Demo Accounts:
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDemo("user")}
              className="rounded-xl border border-line bg-sunken py-2 text-center text-xs font-semibold text-ink transition hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              Demo User
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDemo("admin")}
              className="rounded-xl border border-line bg-sunken py-2 text-center text-xs font-semibold text-ink transition hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

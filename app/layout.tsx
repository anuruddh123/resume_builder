import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Tailor",
  description: "Rewrite your resume for a specific job description.",
  icons: {
    icon: "/icon.svg",
  },
};

/**
 * Applies the saved theme before first paint. Without this the page renders in
 * the system theme and then snaps to the stored one.
 */
const THEME_INIT = `try{var t=localStorage.getItem("rt-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        Extensions (Grammarly, ColorZilla, etc.) inject attributes into <body>
        before React hydrates, which reads as a hydration mismatch. This
        suppresses the warning for this element's own attributes only —
        mismatches inside the tree are still reported.
      */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <div className="aurora" aria-hidden />
        <TopBar />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Tailor",
  description: "Rewrite your resume for a specific job description.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <div className="aurora" aria-hidden />
        <ClientOnly>
          <TopBar />
          {children}
        </ClientOnly>
      </body>
    </html>
  );
}

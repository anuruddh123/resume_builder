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

import { AuthProvider } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <div className="aurora" aria-hidden />
        <AuthProvider>
          <ClientOnly>
            <TopBar />
            {children}
            <AuthModal />
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}

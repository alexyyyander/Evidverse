import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vidgit",
  description: "AI Video Editor",
};

import { Toaster } from "@/components/ui/toast";
import Providers from "@/app/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased flex flex-col`}>
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[80] rounded-md bg-popover text-popover-foreground border border-border px-3 py-2"
          >
            Skip to content
          </a>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

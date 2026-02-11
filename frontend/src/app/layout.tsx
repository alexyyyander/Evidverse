import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vidgit",
  description: "AI Video Editor",
};

import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-200 min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">
            {children}
        </main>
      </body>
    </html>
  );
}

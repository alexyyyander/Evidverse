import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import Providers from "@/app/providers";
import { cn } from "@/lib/cn";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-space",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evidverse",
  description: "AI Video Generation with Git-like Version Control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        "min-h-screen bg-background text-foreground antialiased flex flex-col font-sans",
        spaceGrotesk.variable,
        ibmPlexSans.variable
      )}>
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

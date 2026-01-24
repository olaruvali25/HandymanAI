import type { Metadata } from "next";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/convex-client-provider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: {
    default: "Fixly",
    template: "%s | Fixly",
  },
  description:
    "Fast, reliable step-by-step home repair guidance powered by Fixly.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plexSans.variable} ${sora.variable} bg-[var(--bg)] text-[var(--text)] antialiased`}
        suppressHydrationWarning
      >
        <ConvexAuthNextjsServerProvider storageNamespace="handymanai">
          <ConvexClientProvider>
            <div className="flex min-h-screen flex-col bg-[var(--bg)]">
              <Navbar />
              <main className="relative flex min-h-0 flex-1 flex-col">
                {children}
              </main>
            </div>
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}

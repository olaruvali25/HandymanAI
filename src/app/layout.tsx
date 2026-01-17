import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/convex-client-provider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";

import "./globals.css";

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
        className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased"
        suppressHydrationWarning
      >
        <ConvexAuthNextjsServerProvider storageNamespace="handymanai">
          <ConvexClientProvider>
            <div className="flex min-h-dvh flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}

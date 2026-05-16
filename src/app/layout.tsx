import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "CartonTrack — LybyTex",
  description: "QR-based finished goods and carton tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <SessionProvider>
          <Nav />
          <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}

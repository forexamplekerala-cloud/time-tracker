import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "The Time Mirror",
  description: "Write your day freely. See your time brutally.",
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[var(--background)] text-[var(--ink)] min-h-screen relative`}>
        <main className="max-w-[480px] mx-auto px-5 pt-6 pb-24">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}

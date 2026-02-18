import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { LiveReloadInstrumentation } from "@/components/dev/LiveReloadInstrumentation";

export const metadata: Metadata = {
  title: "CollabBoard",
  description: "Real-time collaborative whiteboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={<div className="min-h-screen" />}>
          {children}
        </Suspense>
        <LiveReloadInstrumentation />
      </body>
    </html>
  );
}

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
      <body className="antialiased font-sans">
        {/* SVG filter for hand-drawn / crayon wobble effect */}
        <svg
          className="absolute w-0 h-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <filter id="hand-drawn">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.055 0.055"
                numOctaves="2"
                seed="3"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="1.8"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        <Suspense fallback={<div className="min-h-screen" />}>
          {children}
        </Suspense>
        <LiveReloadInstrumentation />
      </body>
    </html>
  );
}

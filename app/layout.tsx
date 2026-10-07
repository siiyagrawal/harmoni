import type { Metadata } from "next";
import "./globals.css";
import "./harmoni-overrides.css";

export const metadata: Metadata = {
  title: "Harmoni — Your card. Your circle.",
  description:
    "Meet someone, swap cards, and open doors through each other's networks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="w">{children}</body>
    </html>
  );
}

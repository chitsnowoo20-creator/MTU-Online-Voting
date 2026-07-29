import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import "./globals.css";

/*
 * Plex Sans carries the whole hierarchy — there is no display/body pairing.
 * 300 is the display weight, 400 body, 600 emphasis. Nothing else is needed.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Campus Elections",
  description:
    "Secure online voting for the university King & Queen election. One vote per person, secret ballots, full auditability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

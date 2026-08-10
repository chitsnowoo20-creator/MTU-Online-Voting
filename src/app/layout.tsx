import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mercatura",
    template: "%s | Mercatura",
  },
  description:
    "Mercatura is a CPU-oriented proof-of-work digital currency with post-quantum ownership, adaptive issuance, and 150-second blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

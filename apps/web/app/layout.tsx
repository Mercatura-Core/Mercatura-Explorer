import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mercatura Explorer",
  description: "Mercatura-native blockchain explorer",
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

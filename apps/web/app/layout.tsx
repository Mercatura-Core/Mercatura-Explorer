import type { Metadata } from "next";

import { SiteHeader } from "../components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mercatura Explorer",
    template: "%s | Mercatura Explorer",
  },
  description:
    "Mercatura-native blockchain, mining, network, emission, and witness-version analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

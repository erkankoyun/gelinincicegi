import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gelin Çiçeği",
  description: "Amerika'da düğün firmaları, kişisel düğün planı ve oturma planı.",
  icons: {
    icon: "/assets/brand/favicon-rose.png",
    shortcut: "/assets/brand/favicon-rose.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

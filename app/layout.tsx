import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gelin Çiçeği",
  description: "US wedding vendors, personal wedding planning and a drag-and-drop seating planner.",
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
    <html lang="en-US">
      <body className="antialiased">{children}</body>
    </html>
  );
}

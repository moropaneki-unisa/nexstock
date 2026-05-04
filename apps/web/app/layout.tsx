import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InventoryHub",
  description: "Zoho-first inventory API and sync layer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

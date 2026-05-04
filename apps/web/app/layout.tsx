import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "InventoryHub",
    template: "%s | InventoryHub",
  },
  description: "Zoho-first inventory, product API, and webhook platform for growing teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

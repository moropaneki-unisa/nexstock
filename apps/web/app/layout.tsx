import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NexStock",
    template: "%s | NexStock",
  },
  description: "Modern SaaS platform for inventory, product operations, integrations, and automation.",
  keywords: ["inventory", "saas", "products", "warehouse", "ecommerce", "integrations", "nexstock"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#050505] text-white antialiased">{children}</body>
    </html>
  );
}

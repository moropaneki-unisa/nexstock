import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexstock.co.za";
const siteName = "NexStock";
const title = "NexStock | Product Operations, Inventory Management & Integrations";
const description =
  "NexStock helps businesses centralize product data, manage inventory, connect integrations, automate workflows, and launch with clean operational visibility.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    "NexStock",
    "inventory management software",
    "product operations platform",
    "product catalog management",
    "stock management",
    "ecommerce inventory",
    "WooCommerce inventory",
    "Shopify inventory",
    "Zoho inventory integration",
    "API webhooks inventory",
    "South Africa inventory software",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "Software",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: siteUrl,
    siteName,
    title,
    description,
    images: [
      {
        url: "/nexstock-logo.svg",
        width: 1200,
        height: 360,
        alt: "NexStock logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/nexstock-logo.svg"],
  },
  icons: {
    icon: "/nexstock-logo.svg",
    shortcut: "/nexstock-logo.svg",
    apple: "/nexstock-logo.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexstock.co.za";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/products",
        "/organization",
        "/settings",
        "/profile",
        "/api-keys",
        "/webhooks",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

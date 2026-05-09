import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexstock.co.za";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/login",
    "/signup",
    "/forgot-password",
    "/integrations",
    "/integration/csv/configuration",
    "/integration/xlsx/configuration",
    "/integration/json/configuration",
    "/integration/wordpress/configuration",
    "/integration/shopify/configuration",
    "/integration/custom/configuration",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/integration") ? 0.7 : 0.6,
  }));
}

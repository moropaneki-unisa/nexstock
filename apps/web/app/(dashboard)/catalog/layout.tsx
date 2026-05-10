"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ProductCatalogPage } from "@/components/products/product-catalog-page";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/catalog") {
    return <ProductCatalogPage eyebrow="Catalog" title="Products" />;
  }

  return <>{children}</>;
}

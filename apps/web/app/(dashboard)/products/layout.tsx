"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ProductCatalogPage } from "@/components/products/product-catalog-page";

export default function ProductsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/products") {
    return <ProductCatalogPage />;
  }

  return <>{children}</>;
}

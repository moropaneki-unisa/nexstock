import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/products") {
    const url = request.nextUrl.clone();
    url.pathname = "/catalog";
    return NextResponse.rewrite(url);
  }

  if (pathname === "/imports") {
    const url = request.nextUrl.clone();
    url.pathname = "/imports-currency";
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/integration/json")) {
    const url = request.nextUrl.clone();
    url.pathname = "/imports-json";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/integration/csv") || pathname.startsWith("/integration/xlsx")) {
    const url = request.nextUrl.clone();
    url.pathname = "/imports";
    url.search = pathname.startsWith("/integration/xlsx") ? "?source=xlsx" : "?source=csv";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/products", "/imports", "/integration/csv/:path*", "/integration/xlsx/:path*", "/integration/json/:path*"],
};

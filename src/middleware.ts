import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. If someone accesses /global or /global/, redirect to /global/dashboard
  if (pathname === "/global" || pathname === "/global/") {
    return NextResponse.redirect(new URL("/global/dashboard", request.url));
  }

  // 2. Strictly block /admin and all /admin/* sub-routes on web with the custom 404 page
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isDesktop =
      request.headers.get("x-collecto-desktop") === "true" ||
      (request.headers.get("user-agent") || "").includes("CollectoDesktop");

    // Only the Electron desktop application is allowed to access /admin
    if (!isDesktop) {
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        status: 404,
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/global", "/global/:path*"],
};

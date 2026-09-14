import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. If someone accesses /global or /global/, unlock admin cookie and redirect directly to admin login page
  if (pathname === "/global" || pathname === "/global/") {
    const redirectUrl = new URL("/login?admin=true", request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("collecto_admin_unlocked", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year persistence
      sameSite: "lax",
    });
    return response;
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

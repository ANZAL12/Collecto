import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Secret URL slash: /global unlocks web admin and redirects to admin dashboard
  if (pathname === "/global" || pathname === "/global/") {
    const redirectUrl = new URL("/admin/dashboard", request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("collecto_admin_unlocked", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year persistence
      sameSite: "lax",
    });
    return response;
  }

  // Protect all /admin routes from web deployment unless unlocked
  if (pathname.startsWith("/admin")) {
    const isDesktop =
      request.headers.get("x-collecto-desktop") === "true" ||
      (request.headers.get("user-agent") || "").includes("CollectoDesktop");

    const isUnlockedCookie =
      request.cookies.get("collecto_admin_unlocked")?.value === "1";

    const hasSecretQuery =
      searchParams.get("key") === "global" ||
      searchParams.get("secret") === "global" ||
      searchParams.has("global");

    // Allow if desktop app, env flag enabled, cookie unlocked, or secret query param provided
    const isWebAllowed =
      process.env.ALLOW_WEB_ADMIN === "true" ||
      isUnlockedCookie ||
      hasSecretQuery;

    if (!isDesktop && !isWebAllowed) {
      // Return 404 error on web deployment for unauthorized access
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        status: 404,
      });
    }

    // If accessed with secret query param, persist the unlock cookie for future navigation
    if (hasSecretQuery && !isUnlockedCookie) {
      const response = NextResponse.next();
      response.cookies.set("collecto_admin_unlocked", "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/global", "/global/:path*"],
};


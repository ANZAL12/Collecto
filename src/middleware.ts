import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes from web deployment
  if (pathname.startsWith("/admin")) {
    const isDesktop =
      request.headers.get("x-collecto-desktop") === "true" ||
      (request.headers.get("user-agent") || "").includes("CollectoDesktop");

    // Only allow if requested from the Electron Desktop app (or if explicitly enabled via env flag)
    const isWebAllowed = process.env.ALLOW_WEB_ADMIN === "true";

    if (!isDesktop && !isWebAllowed) {
      // Return 404 error on web deployment
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        status: 404,
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

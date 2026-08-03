import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/certifications", "/sessions", "/results"];

// "exam_admin_session" is a presence flag only (no token/secret) set by
// auth.store.ts after a successful login — see that file for why. Real API
// authorization still comes from the Bearer token held client-side; this
// exists purely so a fully logged-out browser gets redirected before any
// protected page's HTML/JS (and its client-side data fetching, which
// includes exam answer keys) ever ships, rather than relying entirely on
// the (portal) layout's client-side useEffect redirect, which only runs
// after the page has already mounted and rendered once.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.get("exam_admin_session")?.value === "1";
  if (!hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/certifications/:path*", "/sessions/:path*", "/results/:path*"],
};

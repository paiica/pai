import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except: Next.js internals, static files, API-style assets,
  // and the SSO iframe sync routes (auth/login-sync, auth/logout-sync) —
  // those are invisible plumbing loaded by the student portal at a fixed
  // URL and must never move behind a locale prefix.
  matcher: ["/((?!api|_next|_vercel|auth/login-sync|auth/logout-sync|.*\\..*).*)"],
};

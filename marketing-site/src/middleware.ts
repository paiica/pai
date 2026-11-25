import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Canada -> CAD, everywhere else stays on the platform's default (USD) — a
// deliberately small, explicit map rather than a broad country->currency
// table: start with the one pair that was actually asked for, and only add
// a country once its currency actually exists in the admin Currency
// settings (no sense guessing a mapping for a currency nobody's configured).
const COUNTRY_CURRENCY: Record<string, string> = { CA: "CAD" };

export default async function middleware(request: NextRequest) {
  const response = await intlMiddleware(request);

  // Only ever fires on a visitor's first request with no currency cookie at
  // all — never overrides a choice they (or an earlier geo-detection) already
  // made. A Canadian who explicitly picks USD, or a traveler passing through,
  // keeps whatever they picked on every later visit.
  if (!request.cookies.get("paii_currency")) {
    // Vercel's edge network sets this on every request when deployed there —
    // no geo-IP API call, no extra cost. Empty/undefined locally (dev) and on
    // any non-Vercel host, which just means no auto-detection happens there,
    // not a crash or a wrong guess.
    const country = request.headers.get("x-vercel-ip-country");
    const currency = country ? COUNTRY_CURRENCY[country] : undefined;
    if (currency) {
      response.cookies.set("paii_currency", currency, { path: "/", maxAge: 31536000 });
    }
  }

  return response;
}

export const config = {
  // Everything except: Next.js internals, static files, API-style assets,
  // and the SSO iframe sync routes (auth/login-sync, auth/logout-sync) —
  // those are invisible plumbing loaded by the student portal at a fixed
  // URL and must never move behind a locale prefix.
  matcher: ["/((?!api|_next|_vercel|auth/login-sync|auth/logout-sync|.*\\..*).*)"],
};

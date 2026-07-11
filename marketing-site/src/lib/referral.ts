// Shared affiliate referral-code cookie helpers. A "product link" a sales rep shares
// points at a marketing page (e.g. paii.ca/certifications/xyz?ref=CODE) — unlike the
// invite link, which points straight at learn.paii.ca/register?ref=CODE, so it needs
// this cookie to survive the visitor browsing around before eventually enrolling.
const COOKIE_NAME = "paii_ref";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — standard attribution window

export function setRefCookie(code: string) {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  // Scope to the parent domain in production so paii.ca, www.paii.ca, and learn.paii.ca
  // all read the same cookie. Leaving domain unset on localhost keeps it visible across
  // every dev port on the same hostname (cookies aren't port-scoped).
  const domain = isLocalhost ? "" : host.split(".").slice(-2).join(".");
  const domainAttr = domain ? `; domain=.${domain}` : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${COOKIE_MAX_AGE}${domainAttr}`;
}

export function getRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Reads ?ref= off the current URL and persists it if present. Safe to call on every page.
export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) setRefCookie(ref);
}

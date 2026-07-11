// Shared affiliate referral-code cookie helpers. Mirrors marketing-site/src/lib/referral.ts —
// a visitor referred via a product link may land on any page of this app first (not just
// /register), so every page captures ?ref= into this cookie and /register falls back to it
// when there's no ref param directly on its own URL.
const COOKIE_NAME = "paii_ref";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — standard attribution window

export function setRefCookie(code: string) {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  const domain = isLocalhost ? "" : host.split(".").slice(-2).join(".");
  const domainAttr = domain ? `; domain=.${domain}` : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${COOKIE_MAX_AGE}${domainAttr}`;
}

export function getRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) setRefCookie(ref);
}

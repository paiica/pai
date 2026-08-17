"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingCart, User, LogOut, ExternalLink, ChevronDown, Globe } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import LoginModal from "@/components/LoginModal";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Maps each UI-chrome-supported locale (routing.locales) to its TopBar
// translation key — adding a new locale here (plus its messages/{locale}.json
// and a routing.ts entry) is the whole "wire up a new switchable language"
// step; the dropdown below renders generically off this list rather than a
// fixed set of hardcoded buttons.
const LOCALE_LABEL_KEYS: Record<string, string> = { en: "english", ar: "arabic", fr: "french" };

export default function TopBar({
  logoUrl, logoHeight,
}: {
  logoUrl: string | null;
  logoHeight: number;
}) {
  const t = useTranslations("TopBar");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, hydrated, logout, ssoLink } = useAuth();
  const { count }                  = useCart();
  const [showLogin, setShowLogin]  = useState(false);
  const [menuOpen,  setMenuOpen]   = useState(false);
  const [langOpen,  setLangOpen]   = useState(false);
  // Only English is assumed enabled until the real list loads, so the
  // switcher stays hidden rather than flashing a language that turns out
  // not to be enabled — matches the "no languages enabled -> no dropdown"
  // requirement even during the brief loading window.
  const [enabledLocales, setEnabledLocales] = useState<string[]>(["en"]);
  const menuRef                     = useRef<HTMLDivElement>(null);
  const langRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/languages`)
      .then((r) => r.json())
      .then((json) => {
        const codes: string[] = (json?.data ?? json ?? []).map((l: any) => l.code);
        // Intersected with the locales this app actually has UI-chrome
        // translations for — a content-only language enabled in Site
        // Settings (e.g. French, with no messages/fr.json yet) shouldn't
        // show up here even though its CMS content is already translated.
        setEnabledLocales(codes.filter((c) => (routing.locales as readonly string[]).includes(c)));
      })
      .catch(() => {});
  }, []);

  const showLanguageSwitcher = enabledLocales.length > 1;

  function switchLocale(next: string) {
    setLangOpen(false);
    // Persisted so the choice follows the student to their next
    // login/device (student portal reads it back via syncLocaleCookie) —
    // fire-and-forget, the URL navigation below already drives this
    // session's UI immediately.
    if (accessToken) {
      fetch(`${API}/users/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ language: next }),
      }).catch(() => {});
    }
    router.replace(pathname, { locale: next as (typeof routing.locales)[number] });
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // The bar grows to fit the configured logo with a slim margin, rather than
  // a generous one — a utility bar should stay compact even as the logo
  // scales up. The fixed header (this bar + the 56px main menu row) is
  // exposed as a CSS var so sections like the hero can keep clearing it
  // exactly, even as it grows.
  const barHeight = Math.max(32, logoHeight + 16);

  useEffect(() => {
    document.documentElement.style.setProperty("--header-height", `${barHeight + 56}px`);
  }, [barHeight]);

  const initial = user?.profile?.first_name?.[0]
    ?? user?.email?.[0]?.toUpperCase()
    ?? "U";
  const displayName = user?.profile?.first_name
    ?? user?.email?.split("@")[0]
    ?? "Account";

  return (
    <>
      <div className="bg-teal-900 border-b border-white/[0.08] flex items-center transition-[height] duration-150" style={{ height: `${barHeight}px` }}>
        {/* Logo — anchored flush against the viewport edge, outside the centered content column.
            The default PAII mark uses a pre-whitened asset instead of a runtime CSS filter: some
            mobile browsers fail to preserve PNG alpha through `filter: brightness(0) invert(1)`,
            rendering the whole bounding box as a solid white block instead of the wordmark. A
            custom logo uploaded via admin site settings has no pre-whitened variant, so it still
            relies on the filter as a best-effort fallback. */}
        <Link href="/" className="flex items-center flex-shrink-0 ps-4 sm:ps-6 pe-4 sm:pe-6">
          <img
            src={logoUrl || "/paii.logo.white.png"}
            alt="Professional Artificial Intelligence Institute"
            style={logoUrl ? { height: `${logoHeight}px`, filter: "brightness(0) invert(1)" } : { height: `${logoHeight}px` }}
            className="w-auto object-contain"
          />
        </Link>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-white/40 text-[13px] hidden sm:block tracking-wide">
              {t("tagline")}
            </p>
          </div>

          <div className="flex items-center gap-6 ms-auto">
            {/* Language switcher — hidden entirely when no additional
                language is enabled (or none have UI-chrome support yet) */}
            {showLanguageSwitcher && (
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  aria-label={t("language")}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-[13px] font-medium transition-colors"
                >
                  <Globe size={15} />
                  <span className="hidden sm:inline">{t(LOCALE_LABEL_KEYS[locale] ?? "english")}</span>
                  <ChevronDown size={12} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
                </button>
                {langOpen && (
                  <div className="absolute end-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-sand-200 py-1.5 z-50">
                    {/* enabledLocales is already in the admin-configured
                        display order — it comes straight from GET /languages,
                        which is sorted by each language's sort_order. */}
                    {enabledLocales.map((code) => (
                      <button
                        key={code}
                        onClick={() => switchLocale(code)}
                        className={`w-full text-start px-3.5 py-2 text-sm transition-colors ${locale === code ? "text-ink-900 font-semibold bg-sand-50" : "text-ink-900 hover:bg-sand-50"}`}
                      >
                        {t(LOCALE_LABEL_KEYS[code] ?? code)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <a
              href={ssoLink("/cart")}
              className="relative flex items-center gap-2 text-white/60 hover:text-white text-[13px] font-medium transition-colors"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">{t("cart")}</span>
              {count > 0 && (
                <span className="absolute -top-2 -end-2.5 min-w-[18px] h-[18px] rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                  {count}
                </span>
              )}
            </a>

            <div className="h-4 w-px bg-white/10" />

            {/* Auth section */}
            {!hydrated ? (
              <div className="w-16 h-3.5 bg-white/10 rounded animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-white/70 hover:text-white text-[13px] font-medium transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown size={12} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="absolute end-0 top-full mt-2 w-48 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-sand-200 py-1.5 z-50">
                    <div className="px-3.5 py-2.5 border-b border-sand-100">
                      <p className="text-[13px] font-semibold text-ink-900 truncate">{user.profile?.first_name} {user.profile?.last_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>
                    <a
                      href={ssoLink("/dashboard")}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink-900 hover:bg-sand-50 transition-colors"
                    >
                      <ExternalLink size={13} /> {t("myLearningPortal")}
                    </a>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={13} /> {t("signOut")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 text-white/60 hover:text-white text-[13px] font-medium transition-colors"
              >
                <User size={16} />
                <span>{t("signIn")}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
    </>
  );
}

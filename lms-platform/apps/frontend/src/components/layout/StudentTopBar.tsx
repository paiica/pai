"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingCart, X, Award, BookOpen, LogOut, User, ChevronDown, Globe } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import NotificationBell from "./NotificationBell";
import { UI_SUPPORTED_LOCALES } from "@/i18n/locales";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
// Maps each UI-chrome-supported locale to its TopBar translation key —
// adding a new locale is just UI_SUPPORTED_LOCALES + messages/{locale}.json
// + a key here; the dropdown below renders generically off this list rather
// than fixed per-locale buttons.
const LOCALE_LABEL_KEYS: Record<string, string> = { en: "english", ar: "arabic", fr: "french" };

export default function StudentTopBar() {
  const [mounted,   setMounted]   = useState(false);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);
  const [langOpen,  setLangOpen]  = useState(false);
  // Only English assumed enabled until the real list loads, so the switcher
  // stays hidden rather than flashing a language that turns out unavailable.
  const [enabledLocales, setEnabledLocales] = useState<string[]>(["en"]);
  const user       = useAuthStore(s => s.user);
  const token      = useAuthStore(s => s.accessToken);
  const logout     = useAuthStore(s => s.logout);
  const items      = useCartStore(s => s.items);
  const removeItem = useCartStore(s => s.removeItem);
  const router     = useRouter();
  const cartRef    = useRef<HTMLDivElement>(null);
  const userRef    = useRef<HTMLDivElement>(null);
  const langRef    = useRef<HTMLDivElement>(null);
  const t          = useTranslations("TopBar");
  const locale     = useLocale();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch(`${API_BASE}/languages`)
      .then((r) => r.json())
      .then((json) => {
        const codes: string[] = (json?.data ?? json ?? []).map((l: any) => l.code);
        setEnabledLocales(codes.filter((c) => (UI_SUPPORTED_LOCALES as readonly string[]).includes(c)));
      })
      .catch(() => {});
  }, []);

  const showLanguageSwitcher = enabledLocales.length > 1;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) setCartOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchLocale(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    setLangOpen(false);
    // Persisted so the choice follows the student to their next
    // login/device instead of resetting to the default — fire-and-forget,
    // the cookie above already drives this session's UI immediately.
    if (token) api.patch("/users/me/profile", { language: next }, token).catch(() => {});
    router.refresh();
  }

  if (!mounted || !token || !user) return null;

  const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || user.email;
  const total = items.reduce((s, i) => s + i.price, 0);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="w-full bg-white border-b border-slate-100 pl-14 pr-3 lg:px-6 h-10 flex items-center justify-end gap-2.5 sm:gap-5 flex-shrink-0 sticky top-0 z-30">

      {/* Cart dropdown */}
      <div className="relative flex-shrink-0" ref={cartRef}>
        <button
          onClick={() => { setCartOpen(v => !v); setUserOpen(false); setLangOpen(false); }}
          aria-label={t("cart")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-navy-700 transition-colors text-xs font-medium"
        >
          <div className="relative">
            <ShoppingCart size={16} />
            {items.length > 0 && (
              <span className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-navy-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && <span className="hidden sm:inline">({items.length})</span>}
        </button>

        {cartOpen && (
          // Anchored start-0 (not end-0) — the cart button sits near the
          // left side of this packed icon row, not the screen's right edge,
          // so opening the panel end-anchored (growing leftward, off a
          // fixed w-80) pushed most of it past the left edge of the
          // viewport on mobile. Opening it start-anchored (growing
          // rightward) instead, with a width capped to the viewport, keeps
          // it fully on-screen regardless of where the button lands.
          <div className="absolute start-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {t("cart")} {items.length > 0 ? `(${items.length})` : ""}
              </span>
              <button onClick={() => setCartOpen(false)} aria-label="Close cart" className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">{t("cartEmpty")}</div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                        item.type === "certification" ? "from-violet-400 to-indigo-500" : "from-blue-400 to-cyan-500"
                      )}>
                        {item.type === "certification"
                          ? <Award size={13} className="text-white" />
                          : <BookOpen size={13} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.price === 0 ? t("free") : `$${item.price.toFixed(2)}`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                        title={t("remove")}
                        aria-label={t("remove")}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700">
                    {t("total")}: ${total.toFixed(2)}
                  </span>
                  <Link
                    href="/cart"
                    onClick={() => setCartOpen(false)}
                    className="text-xs font-bold bg-navy-900 hover:bg-navy-700 text-white px-4 py-1.5 rounded-xl transition-colors"
                  >
                    {t("viewCart")}
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <NotificationBell />

      {/* Divider */}
      <span className="hidden sm:inline-block h-4 w-px bg-slate-200 flex-shrink-0" />

      {/* Language switcher — hidden entirely when no additional language is
          enabled (or none have UI-chrome support yet) */}
      {showLanguageSwitcher && (
        <div className="relative flex-shrink-0" ref={langRef}>
          <button
            onClick={() => { setLangOpen(v => !v); setCartOpen(false); setUserOpen(false); }}
            aria-label={t("language")}
            className="flex items-center gap-1 text-slate-500 hover:text-navy-700 transition-colors text-xs font-medium"
          >
            <Globe size={15} />
          </button>

          {langOpen && (
            <div className="absolute end-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
              {/* enabledLocales is already in the admin-configured display
                  order — it comes straight from GET /languages, which is
                  sorted by each language's sort_order. */}
              {enabledLocales.map((code) => (
                <button
                  key={code}
                  onClick={() => switchLocale(code)}
                  className={cn(
                    "w-full text-start flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors",
                    locale === code ? "text-navy-900 font-bold" : "text-slate-700"
                  )}
                >
                  {t(LOCALE_LABEL_KEYS[code] ?? code)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <span className="hidden sm:inline-block h-4 w-px bg-slate-200 flex-shrink-0" />

      {/* User dropdown */}
      <div className="relative flex-shrink-0" ref={userRef}>
        <button
          onClick={() => { setUserOpen(v => !v); setCartOpen(false); setLangOpen(false); }}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-navy-900 font-medium transition-colors max-w-[70px] sm:max-w-[130px]"
        >
          <span className="truncate">{name}</span>
          <ChevronDown size={11} className="flex-shrink-0 text-slate-400" />
        </button>

        {userOpen && (
          <div className="absolute end-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
            <Link
              href="/profile"
              onClick={() => setUserOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User size={13} className="text-slate-400" />
              {t("myProfile")}
            </Link>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} />
              {t("signOut")}
            </button>
          </div>
        )}
      </div>

      {/* Support */}
      <Link
        href="mailto:support@paii.ca"
        className="flex-shrink-0 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1 rounded transition-colors"
      >
        {t("support")}
      </Link>
    </div>
  );
}

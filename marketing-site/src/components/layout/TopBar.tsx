"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, User, LogOut, ExternalLink, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import LoginModal from "@/components/LoginModal";

export default function TopBar({
  logoUrl, logoHeight,
}: {
  logoUrl: string | null;
  logoHeight: number;
}) {
  const { user, hydrated, logout, ssoLink } = useAuth();
  const { count }                  = useCart();
  const [showLogin, setShowLogin]  = useState(false);
  const [menuOpen,  setMenuOpen]   = useState(false);
  const menuRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
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
        <Link href="/" className="flex items-center flex-shrink-0 pl-4 sm:pl-6 pr-4 sm:pr-6">
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
              Professional Artificial Intelligence Institute — AI Certification Programs
            </p>
          </div>

          <div className="flex items-center gap-6 ml-auto">
            {/* Cart */}
            <a
              href={ssoLink("/cart")}
              className="relative flex items-center gap-2 text-white/60 hover:text-white text-[13px] font-medium transition-colors"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
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
                  <div className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-sand-200 py-1.5 z-50">
                    <div className="px-3.5 py-2.5 border-b border-sand-100">
                      <p className="text-[13px] font-semibold text-ink-900 truncate">{user.profile?.first_name} {user.profile?.last_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>
                    <a
                      href={ssoLink("/dashboard")}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink-900 hover:bg-sand-50 transition-colors"
                    >
                      <ExternalLink size={13} /> My Learning Portal
                    </a>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={13} /> Sign Out
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
                <span>Sign In</span>
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

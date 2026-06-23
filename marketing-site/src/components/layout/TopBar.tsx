"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingCart, User, LogOut, ExternalLink, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import LoginModal from "@/components/LoginModal";

export default function TopBar() {
  const { user, hydrated, logout, ssoLink } = useAuth();
  const { count }                  = useCart();
  const [showLogin, setShowLogin]  = useState(false);
  const [menuOpen,  setMenuOpen]   = useState(false);
  const menuRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = user?.profile?.first_name?.[0]
    ?? user?.email?.[0]?.toUpperCase()
    ?? "U";
  const displayName = user?.profile?.first_name
    ?? user?.email?.split("@")[0]
    ?? "Account";

  return (
    <>
      <div className="bg-ink-900 border-b border-white/[0.08] h-10 flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex items-center justify-between">
          <p className="text-white/40 text-[11px] hidden sm:block tracking-wide">
            Professional AI Institute — AI Certification Programs
          </p>

          <div className="flex items-center gap-5 ml-auto">
            {/* Cart */}
            <a
              href={ssoLink("/cart")}
              className="relative flex items-center gap-1.5 text-white/60 hover:text-white text-[11px] font-medium transition-colors"
            >
              <ShoppingCart size={13} />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-teal-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                  {count}
                </span>
              )}
            </a>

            <div className="h-3 w-px bg-white/10" />

            {/* Auth section */}
            {!hydrated ? (
              <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-white/70 hover:text-white text-[11px] font-medium transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown size={10} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-sand-200 py-1 z-50">
                    <div className="px-3 py-2 border-b border-sand-100">
                      <p className="text-[11px] font-semibold text-ink-900 truncate">{user.profile?.first_name} {user.profile?.last_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                    <a
                      href={ssoLink("/dashboard")}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-ink-900 hover:bg-sand-50 transition-colors"
                    >
                      <ExternalLink size={11} /> My Learning Portal
                    </a>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={11} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 text-white/60 hover:text-white text-[11px] font-medium transition-colors"
              >
                <User size={13} />
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

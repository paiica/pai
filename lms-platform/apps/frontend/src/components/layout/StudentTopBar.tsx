"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Award, BookOpen, LogOut, User, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { cn } from "@/lib/utils";

export default function StudentTopBar() {
  const [mounted,   setMounted]   = useState(false);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);
  const user       = useAuthStore(s => s.user);
  const token      = useAuthStore(s => s.accessToken);
  const logout     = useAuthStore(s => s.logout);
  const items      = useCartStore(s => s.items);
  const removeItem = useCartStore(s => s.removeItem);
  const router     = useRouter();
  const cartRef    = useRef<HTMLDivElement>(null);
  const userRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) setCartOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted || !token || !user) return null;

  const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || user.email;
  const total = items.reduce((s, i) => s + i.price, 0);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="w-full bg-white border-b border-slate-100 px-6 h-10 flex items-center justify-end gap-5 flex-shrink-0 sticky top-0 z-30">

      {/* Cart dropdown */}
      <div className="relative" ref={cartRef}>
        <button
          onClick={() => { setCartOpen(v => !v); setUserOpen(false); }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-navy-700 transition-colors text-xs font-medium"
        >
          <div className="relative">
            <ShoppingCart size={16} />
            {items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-navy-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && <span className="hidden sm:inline">({items.length})</span>}
        </button>

        {cartOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Cart {items.length > 0 ? `(${items.length})` : ""}
              </span>
              <button onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Your cart is empty</div>
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
                          {item.price === 0 ? "Free" : `$${item.price.toFixed(2)}`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700">
                    Total: ${total.toFixed(2)}
                  </span>
                  <Link
                    href="/cart"
                    onClick={() => setCartOpen(false)}
                    className="text-xs font-bold bg-navy-900 hover:bg-navy-700 text-white px-4 py-1.5 rounded-xl transition-colors"
                  >
                    View Cart
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <span className="h-4 w-px bg-slate-200" />

      {/* User dropdown */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => { setUserOpen(v => !v); setCartOpen(false); }}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-navy-900 font-medium transition-colors max-w-[130px]"
        >
          <span className="truncate">{name}</span>
          <ChevronDown size={11} className="flex-shrink-0 text-slate-400" />
        </button>

        {userOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
            <Link
              href="/profile"
              onClick={() => setUserOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User size={13} className="text-slate-400" />
              My Profile
            </Link>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Support */}
      <Link
        href="mailto:support@paii.ca"
        className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1 rounded transition-colors"
      >
        SUPPORT
      </Link>
    </div>
  );
}

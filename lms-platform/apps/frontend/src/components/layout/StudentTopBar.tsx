"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";

export default function StudentTopBar() {
  const [mounted, setMounted] = useState(false);
  const user  = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.accessToken);
  const items = useCartStore(s => s.items);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !token || !user) return null;

  const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || user.email;

  return (
    <div className="w-full bg-white border-b border-slate-100 px-6 h-10 flex items-center justify-end gap-5 flex-shrink-0 sticky top-0 z-30">
      {/* Cart */}
      <Link href="/cart" className="flex items-center gap-1.5 text-slate-500 hover:text-navy-700 transition-colors text-xs font-medium group">
        <div className="relative">
          <ShoppingCart size={16} />
          {items.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-navy-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && <span className="hidden sm:inline">({items.length})</span>}
      </Link>

      {/* Divider */}
      <span className="h-4 w-px bg-slate-200" />

      {/* User name */}
      <Link href="/profile" className="text-xs text-slate-600 hover:text-navy-900 font-medium transition-colors truncate max-w-[120px]">
        {name}
      </Link>

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

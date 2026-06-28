"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Copy, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn, copyToClipboard } from "@/lib/utils";
import type { Notification } from "@/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/products":      "Products",
  "/promo-codes":   "Promo Codes",
  "/invites":       "Invites",
  "/leads":         "My Leads",
  "/commissions":   "Commissions",
  "/analytics":     "Analytics",
  "/notifications": "Notifications",
  "/profile":       "Profile",
};

function fetcher(url: string, token: string) {
  return api.get<{ data: Notification[] }>(url, token).then((r) => r.data);
}

export default function AffiliateTopNav() {
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const { data: notifications } = useSWR(
    accessToken ? ["/affiliate/notifications?limit=5&unread=true", accessToken] : null,
    ([url, t]) => fetcher(url, t),
    { refreshInterval: 30_000 }
  );
  const unreadCount = notifications?.length ?? 0;

  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3000";
  const referralLink = user?.referral_code ? `${marketingUrl}?ref=${user.referral_code}` : "";

  async function handleCopyLink() {
    if (!referralLink) return;
    await copyToClipboard(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "Dashboard";

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 flex-shrink-0 dark:bg-slate-900 dark:border-slate-800">
      <h1 className="text-lg font-display font-black text-navy-900 dark:text-white flex-1">{title}</h1>

      {/* Quick referral link copy */}
      {user?.referral_code && (
        <button
          onClick={handleCopyLink}
          className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 hover:border-navy-300 hover:text-navy-700 px-3 py-1.5 rounded-lg transition-all"
          title="Copy your referral link"
        >
          {copied ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
          <span className="font-mono text-[11px]">ref: {user.referral_code}</span>
        </button>
      )}

      {/* Notifications bell */}
      <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      {/* Avatar */}
      <Link href="/profile" className="flex items-center gap-2.5">
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-slate-200" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-bold text-white">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
        )}
      </Link>
    </header>
  );
}

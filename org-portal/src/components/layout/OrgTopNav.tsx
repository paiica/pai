"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":        "Dashboard",
  "/employees/invite": "Invite Employees",
  "/employees":        "Employees",
  "/profile":          "Profile",
};

export default function OrgTopNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "Dashboard";

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 flex-shrink-0">
      <h1 className="text-lg font-display font-black text-navy-900 flex-1">{title}</h1>

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

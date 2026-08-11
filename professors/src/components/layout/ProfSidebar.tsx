"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
  BookOpen, LayoutDashboard, FileText, Award, Users2, Compass, Bell,
  ChevronLeft, ChevronRight, LogOut, Shield, User, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/students", icon: Users2, label: "My Students" },
  { href: "/courses", icon: BookOpen, label: "My Courses" },
  { href: "/programs", icon: GraduationCap, label: "My Programs" },
  { href: "/browse", icon: Compass, label: "Online Tools" },
  { href: "/certifications", icon: Award, label: "Certifications" },
  { href: "/grades", icon: FileText, label: "Submissions" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/profile", icon: User, label: "My Profile" },
];

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

export function ProfSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [collapsed, setCollapsed] = useState(false);

  const { data: countData } = useSWR(
    token ? ["/notifications/unread-count", token] : null,
    ([url, t]) => fetcher(url, t),
    { refreshInterval: 30000 }
  );
  const unreadCount = countData?.count ?? 0;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-navy-800 text-white transition-all duration-200 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center py-5 border-b border-navy-700", collapsed ? "justify-center px-2" : "gap-3 px-4")}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <img src="/paii.logo.png" alt="PAII" className="h-6 w-auto object-contain flex-shrink-0" style={{ filter: "brightness(0) invert(1)" }} />
            <p className="text-[10px] text-gold-400 uppercase tracking-widest truncate">Professor Portal</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("text-navy-400 hover:text-white hover:bg-navy-700 transition-colors p-1.5 rounded-lg flex-shrink-0", !collapsed && "ml-auto")}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isNotifications = href === "/notifications";
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-gold-500 text-white"
                  : "text-navy-300 hover:bg-navy-700 hover:text-white"
              )}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} />
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-navy-700 space-y-1">
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <Link
            href={process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.paii.ca"}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-navy-400 hover:text-white hover:bg-navy-700 transition-colors"
            title={collapsed ? "Admin Panel" : undefined}
          >
            <Shield size={16} className="flex-shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}

        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-navy-200 truncate">
              {user.profile?.first_name} {user.profile?.last_name}
            </p>
            <p className="text-xs text-navy-400 truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-navy-400 hover:text-red-400 hover:bg-navy-700 transition-colors"
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}

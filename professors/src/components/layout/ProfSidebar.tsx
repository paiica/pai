"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, LayoutDashboard, FileText, Award,
  ChevronLeft, ChevronRight, LogOut, GraduationCap, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/courses", icon: BookOpen, label: "My Courses" },
  { href: "/certifications", icon: Award, label: "Certifications" },
  { href: "/grades", icon: FileText, label: "Submissions" },
];

export function ProfSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);

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
      <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-700">
        <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-xs text-navy-300 font-medium leading-none">PAII</p>
            <p className="text-sm font-bold leading-tight">Professor Portal</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-navy-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
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
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-navy-700 space-y-1">
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <Link
            href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002"}
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

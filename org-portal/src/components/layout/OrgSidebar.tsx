"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users2, UserPlus, User, LogOut, ChevronLeft, ChevronRight, CreditCard, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const NAV = [
  { href: "/dashboard",        label: "Dashboard",         icon: LayoutDashboard },
  { href: "/employees",        label: "Employees",          icon: Users2          },
  { href: "/employees/invite", label: "Invite Employees",   icon: UserPlus        },
  { href: "/billing",          label: "Billing",            icon: CreditCard      },
  { href: "/profile",          label: "Profile",            icon: User            },
];

export default function OrgSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Mobile hamburger trigger — sits outside the sliding <aside> so it
          stays put (and visible) while the sidebar itself is off-canvas. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-navy-900 text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "flex flex-col h-screen bg-navy-900 transition-all duration-300",
        "fixed inset-y-0 left-0 z-50 w-[240px]",
        "lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "lg:w-[68px]" : "lg:w-[240px]"
      )}>
        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-navy-700/50", collapsed ? "lg:justify-center lg:px-2 px-4" : "px-4")}>
          <div className={cn("flex items-center gap-2 min-w-0", collapsed && "lg:hidden")}>
            <img src="/paii.logo.png" alt="PAII" className="h-6 w-auto object-contain flex-shrink-0" style={{ filter: "brightness(0) invert(1)" }} />
            <div className="text-[9px] text-gold-400 uppercase tracking-widest truncate">Org Portal</div>
          </div>
          {/* Desktop collapse/expand toggle — collapsed icon-only mode is a
              desktop-only concept, doesn't apply to the mobile off-canvas drawer. */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("hidden lg:block text-navy-400 hover:text-white hover:bg-navy-800 transition-colors p-1.5 rounded-lg flex-shrink-0", !collapsed && "ml-auto")}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="lg:hidden ml-auto text-navy-400 hover:text-white hover:bg-navy-800 transition-colors p-1.5 rounded-lg flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                collapsed && "lg:justify-center",
                isActive(href)
                  ? "bg-gold-500/20 text-gold-300"
                  : "text-navy-300 hover:bg-navy-800 hover:text-white"
              )}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-navy-700/50">
          {user && (
            <div className={cn("px-3 py-2 mb-1", collapsed && "lg:hidden")}>
              <div className="text-xs font-semibold text-white truncate">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[9px] text-gold-400 uppercase tracking-widest truncate">{user.organization_name}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full",
              collapsed && "lg:justify-center"
            )}
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, Tag, Mail, Users, DollarSign,
  BarChart3, Bell, User, LogOut, Shield, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/products",     label: "Products",     icon: Package         },
  { href: "/promo-codes",  label: "Promo Codes",  icon: Tag             },
  { href: "/invites",      label: "Invites",       icon: Mail            },
  { href: "/leads",        label: "My Leads",     icon: Users           },
  { href: "/commissions",  label: "Commissions",  icon: DollarSign      },
  { href: "/analytics",    label: "Analytics",    icon: BarChart3       },
  { href: "/notifications",label: "Notifications",icon: Bell            },
  { href: "/profile",      label: "Profile",      icon: User            },
];

export default function AffiliateSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-navy-900 sticky top-0 flex-shrink-0 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-navy-700/50">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Image
            src="/paii.logo.png"
            alt="PAI"
            width={32}
            height={32}
            className="rounded-lg object-contain flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.08)", padding: "3px" }}
          />
          {!collapsed && (
            <div>
              <div className="text-xs font-display font-black text-white">Affiliate Portal</div>
              <div className="text-[9px] text-gold-400 uppercase tracking-widest">PAI</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto text-navy-400 hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              collapsed && "justify-center",
              isActive(href)
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-navy-700/50">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-semibold text-white truncate">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-[9px] text-gold-400 uppercase tracking-widest">Affiliate</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

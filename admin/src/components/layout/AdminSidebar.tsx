"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, Award,
  ClipboardList, LogOut, Shield, Settings,
  Paintbrush, LayoutTemplate, Navigation, ChevronDown, PanelBottom, FileText, Rss, Tag, Wrench, CalendarDays, Key, CreditCard, BarChart3, ReceiptText, Mail, ListChecks, UserCheck, DollarSign, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/assignments", label: "Assignments", icon: ListChecks },
  { href: "/exam-sessions", label: "Exam Sessions", icon: CalendarDays },
  { href: "/users", label: "Users", icon: Users },
  { href: "/blog", label: "Blog", icon: Rss },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/online-tools", label: "Online Tools", icon: Wrench },
];

const SALES_NAV = [
  { href: "/affiliates",   label: "Sales Reps",   icon: UserCheck  },
  { href: "/commissions",  label: "Commissions",  icon: DollarSign },
  { href: "/promo-codes",  label: "Promo Codes",  icon: Tag        },
];

const PAYMENTS_NAV = [
  { href: "/payments",         label: "Transactions", icon: ReceiptText },
  { href: "/payments/reports", label: "Reports",      icon: BarChart3   },
];

const SETTINGS_NAV = [
  { href: "/settings",      label: "General", icon: Settings },
  { href: "/settings/apis", label: "APIs",    icon: Key      },
];

const COURSE_NAV = [
  { href: "/courses?tab=manage", label: "Manage Courses", icon: BookOpen },
  { href: "/courses?tab=enrollments", label: "Enrollments", icon: Users },
];

const CERT_NAV = [
  { href: "/certifications", label: "Manage Certifications", icon: BookOpen },
  { href: "/certificates", label: "Issued Certificates", icon: Award },
];

const DESIGN_NAV = [
  { href: "/design/blocks", label: "Page Blocks", icon: LayoutTemplate },
  { href: "/design/navigation", label: "Navigation", icon: Navigation },
  { href: "/design/footer", label: "Footer", icon: PanelBottom },
  { href: "/design/email-templates", label: "Email Templates", icon: Mail },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [designOpen,   setDesignOpen]   = useState(pathname.startsWith("/design"));
  const [courseOpen,   setCourseOpen]   = useState(pathname.startsWith("/courses"));
  const [certOpen,     setCertOpen]     = useState(pathname.startsWith("/certificates") || pathname.startsWith("/certifications"));
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings"));
  const [paymentsOpen, setPaymentsOpen] = useState(pathname.startsWith("/payments"));
  const [salesOpen,    setSalesOpen]    = useState(pathname.startsWith("/affiliates") || pathname.startsWith("/commissions") || pathname.startsWith("/promo-codes"));

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isCourseTabActive(href: string) {
    if (!pathname.startsWith("/courses")) return false;
    const tab = href.includes("?tab=") ? href.split("?tab=")[1] : "manage";
    const currentTab = searchParams.get("tab") || "manage";
    return currentTab === tab;
  }

  const designActive = pathname.startsWith("/design");

  return (
    <aside className="w-[240px] flex flex-col h-screen bg-navy-900 sticky top-0 flex-shrink-0">
      <div className="h-16 flex items-center px-5 border-b border-navy-700/50">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            <Shield size={17} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-display font-black text-white">Admin Portal</div>
            <div className="text-[9px] text-gold-400 uppercase tracking-widest">PAI</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isActive(href, exact)
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}

        {/* Sales collapsible */}
        <div>
          <button
            onClick={() => setSalesOpen(!salesOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              (pathname.startsWith("/affiliates") || pathname.startsWith("/commissions") || pathname.startsWith("/promo-codes"))
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <TrendingUp size={17} />
            <span className="flex-1 text-left">Sales</span>
            <ChevronDown size={14} className={cn("transition-transform", salesOpen && "rotate-180")} />
          </button>

          {salesOpen && (
            <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-navy-700/50">
              {SALES_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    isActive(href)
                      ? "bg-gold-500/20 text-gold-300"
                      : "text-navy-400 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Payments collapsible */}
        <div>
          <button
            onClick={() => setPaymentsOpen(!paymentsOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              pathname.startsWith("/payments")
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <CreditCard size={17} />
            <span className="flex-1 text-left">Payments</span>
            <ChevronDown size={14} className={cn("transition-transform", paymentsOpen && "rotate-180")} />
          </button>

          {paymentsOpen && (
            <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-navy-700/50">
              {PAYMENTS_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    pathname === href
                      ? "bg-gold-500/20 text-gold-300"
                      : "text-navy-400 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Site Settings collapsible */}
        <div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              pathname.startsWith("/settings")
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <Settings size={17} />
            <span className="flex-1 text-left">Site Settings</span>
            <ChevronDown size={14} className={cn("transition-transform", settingsOpen && "rotate-180")} />
          </button>

          {settingsOpen && (
            <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-navy-700/50">
              {SETTINGS_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    pathname === href
                      ? "bg-gold-500/20 text-gold-300"
                      : "text-navy-400 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Prep Courses collapsible */}
        <div>
          <button
            onClick={() => setCourseOpen(!courseOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              pathname.startsWith("/courses")
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <BookOpen size={17} />
            <span className="flex-1 text-left">Prep Courses</span>
            <ChevronDown size={14} className={cn("transition-transform", courseOpen && "rotate-180")} />
          </button>

          {courseOpen && (
            <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-navy-700/50">
              {COURSE_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    isCourseTabActive(href)
                      ? "bg-gold-500/20 text-gold-300"
                      : "text-navy-400 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Certificates collapsible */}
        <div>
          <button
            onClick={() => setCertOpen(!certOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              (pathname.startsWith("/certificates") || pathname.startsWith("/design/certifications"))
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <Award size={17} />
            <span className="flex-1 text-left">Certificates</span>
            <ChevronDown size={14} className={cn("transition-transform", certOpen && "rotate-180")} />
          </button>

          {certOpen && (
            <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-navy-700/50">
              {CERT_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    isActive(href)
                      ? "bg-gold-500/20 text-gold-300"
                      : "text-navy-400 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Design collapsible */}
        <div>
          <button
            onClick={() => setDesignOpen(!designOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
              designActive
                ? "bg-gold-500/20 text-gold-300"
                : "text-navy-300 hover:bg-navy-800 hover:text-white"
            )}
          >
            <Paintbrush size={17} />
            <span className="flex-1 text-left">Design</span>
            <ChevronDown size={14} className={cn("transition-transform", designOpen && "rotate-180")} />
          </button>

          {designOpen && (
            <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-navy-700/50">
              {DESIGN_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    isActive(href)
                      ? "bg-gold-500/20 text-gold-300"
                      : "text-navy-400 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-navy-700/50">
        {user && (
          <div className="px-3 py-2 mb-2">
            <div className="text-xs font-semibold text-white truncate">
              {user.profile?.first_name} {user.profile?.last_name}
            </div>
            <div className="text-[10px] text-gold-400 uppercase tracking-widest">{user.role.replace("_", " ")}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  LayoutDashboard, BookOpen, Award,
  User, LogOut, FileText, BarChart2, ChevronLeft, ChevronRight, ExternalLink, Shield,
  Wrench, ChevronDown, Lock, Bell, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const TOP_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const LEARNING_ITEMS = [
  { href: "/learn",  label: "Courses",      icon: BookOpen },
  { href: "/tools",  label: "Online Tools", icon: Wrench },
];

const BOTTOM_ITEMS = [
  { href: "/student/assignments", label: "Assignments", icon: FileText },
  { href: "/student/grades",      label: "Grades",      icon: BarChart2 },
];

const ACCOUNT_ITEMS = [
  { tab: "basic",    href: "/profile",              label: "Profile",       icon: User },
  { tab: "security", href: "/profile?tab=security", label: "Password",      icon: Lock },
  { tab: "comms",    href: "/profile?tab=comms",    label: "Notifications", icon: Bell },
  { tab: "payment",  href: "/profile?tab=payment",  label: "Payment",       icon: CreditCard },
  { tab: "orders",   href: "/profile?tab=orders",   label: "Orders",        icon: FileText },
];

function AccountNavItems({ collapsed, accountOpen }: { collapsed: boolean; accountOpen: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onProfilePage = pathname === "/profile";
  const currentTab = onProfilePage ? (searchParams.get("tab") || "basic") : null;

  if (collapsed) {
    return (
      <Link
        href="/profile"
        className={cn("sidebar-link justify-center !px-2", onProfilePage ? "sidebar-link-active" : "")}
        title="Account Settings"
      >
        <User size={18} className="flex-shrink-0" />
      </Link>
    );
  }

  return accountOpen ? (
    <>
      {ACCOUNT_ITEMS.map(({ tab, href, label, icon: Icon }) => (
        <Link
          key={tab}
          href={href}
          className={cn("sidebar-link pl-5", currentTab === tab ? "sidebar-link-active" : "")}
        >
          <Icon size={18} className="flex-shrink-0" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  ) : null;
}

function CertificationsSection({ collapsed, token }: { collapsed: boolean; token: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const { data: enrollmentData } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false },
  );

  const { data: appsData } = useSWR(
    token ? ["/applications/my", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false },
  );

  const enrollments: any[] = Array.isArray(enrollmentData?.data)
    ? enrollmentData.data
    : Array.isArray(enrollmentData)
    ? enrollmentData
    : [];

  const myApps: any[] = Array.isArray(appsData?.data)
    ? appsData.data
    : Array.isArray(appsData)
    ? appsData
    : [];

  const activeEnrollments = enrollments.filter(
    (e) => e.status === "active" || e.status === "completed" || e.status === "suspended",
  );

  // Show applications that are in-flight but don't have an enrollment entry yet
  const enrolledCertIds = new Set(activeEnrollments.map((e) => e.certification_id));
  const pendingApps = myApps.filter(
    (a) =>
      ["pending_payment", "payment_submitted", "pending_review"].includes(a.status) &&
      !enrolledCertIds.has(a.certification_id),
  );

  const onCertPage = pathname === "/certificates";

  if (collapsed) {
    return (
      <Link
        href="/certificates"
        className={cn("sidebar-link justify-center !px-2", onCertPage ? "sidebar-link-active" : "")}
        title="Certifications"
      >
        <Award size={18} className="flex-shrink-0" />
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="sidebar-link w-full text-slate-500 hover:text-teal-700"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">Certifications</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform flex-shrink-0", open ? "rotate-0" : "-rotate-90")}
        />
      </button>

      {open && (
        <>
          <Link
            href="/certificates"
            className={cn("sidebar-link pl-5", onCertPage ? "sidebar-link-active" : "")}
          >
            <Award size={18} className="flex-shrink-0" />
            <span>All Certifications</span>
          </Link>

          {activeEnrollments.map((enrollment) => {
            const cert = enrollment.certification;
            if (!cert) return null;
            const href = `/certificates/${cert.id}`;
            return (
              <Link
                key={enrollment.id}
                href={href}
                className={cn("sidebar-link pl-8 gap-2 text-slate-600 hover:text-navy-800", pathname === href ? "sidebar-link-active" : "")}
                title={cert.title}
              >
                {cert.badge_icon ? (
                  <span className="text-sm leading-none flex-shrink-0">{cert.badge_icon}</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                )}
                <span className="font-semibold text-xs truncate">{cert.acronym}</span>
              </Link>
            );
          })}

          {pendingApps.map((app) => {
            const cert = app.certification;
            if (!cert) return null;
            const href = `/certificates/${cert.id}`;
            return (
              <Link
                key={app.id}
                href={href}
                className={cn("sidebar-link pl-8 gap-2 text-slate-500 hover:text-navy-800", pathname === href ? "sidebar-link-active" : "")}
                title={cert.title}
              >
                {cert.badge_icon ? (
                  <span className="text-sm leading-none flex-shrink-0 opacity-60">{cert.badge_icon}</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                )}
                <span className="font-semibold text-xs truncate">{cert.acronym}</span>
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wide ml-auto flex-shrink-0">Step 1</span>
              </Link>
            );
          })}
        </>
      )}
    </>
  );
}

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [collapsed, setCollapsed] = useState(false);

  const [learningOpen, setLearningOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(() => pathname.startsWith("/profile"));

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-white border-r border-slate-100 sticky top-0 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <img src="/paii.logo.png" alt="Professional AI Institute" className={collapsed ? "w-8 h-8 object-contain flex-shrink-0" : "h-7 w-auto object-contain flex-shrink-0"} />
          {!collapsed && (
            <span className="text-[11px] font-semibold text-slate-700 leading-tight truncate">Professional AI<br />Institute</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        {TOP_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "sidebar-link",
              pathname === href ? "sidebar-link-active" : "",
              collapsed && "justify-center !px-2"
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Certifications (dynamic, from enrollments) */}
        {!collapsed && <div className="h-px bg-slate-100 my-1" />}
        <CertificationsSection collapsed={collapsed} token={token} />

        {/* Learning group */}
        {!collapsed && <div className="h-px bg-slate-100 my-1" />}
        {!collapsed && (
          <button
            onClick={() => setLearningOpen(!learningOpen)}
            className="sidebar-link w-full text-slate-500 hover:text-teal-700"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">Learning</span>
            <ChevronDown
              size={12}
              className={cn("transition-transform flex-shrink-0", learningOpen ? "rotate-0" : "-rotate-90")}
            />
          </button>
        )}
        {(collapsed || learningOpen) && LEARNING_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "sidebar-link",
              pathname === href || pathname.startsWith(href + "/") ? "sidebar-link-active" : "",
              collapsed ? "justify-center !px-2" : "pl-5"
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Other items */}
        {!collapsed && <div className="h-px bg-slate-100 my-1" />}
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "sidebar-link",
              pathname === href ? "sidebar-link-active" : "",
              collapsed && "justify-center !px-2"
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Divider */}
        {!collapsed && <div className="h-px bg-slate-100 my-1" />}

        {/* Account Settings group */}
        {!collapsed && (
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className="sidebar-link w-full text-slate-500 hover:text-teal-700"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">Account</span>
            <ChevronDown
              size={12}
              className={cn("transition-transform flex-shrink-0", accountOpen ? "rotate-0" : "-rotate-90")}
            />
          </button>
        )}
        <Suspense fallback={null}>
          <AccountNavItems collapsed={collapsed} accountOpen={accountOpen} />
        </Suspense>
      </nav>

      {/* Bottom: user + logout */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <Link
            href="/admin"
            className={cn("sidebar-link text-xs text-teal-700 hover:bg-teal-50", collapsed && "justify-center !px-2")}
            title={collapsed ? "Admin Panel" : undefined}
          >
            <Shield size={16} className="flex-shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}
        <Link
          href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}
          target="_blank"
          className={cn("sidebar-link text-xs", collapsed && "justify-center !px-2")}
        >
          <ExternalLink size={16} className="flex-shrink-0" />
          {!collapsed && <span>Main Website</span>}
        </Link>

        {!collapsed && user && (
          <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs font-semibold text-navy-900 truncate">
              {user.profile?.first_name} {user.profile?.last_name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn("sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-700", collapsed && "justify-center !px-2")}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

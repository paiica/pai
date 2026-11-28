"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import {
  LayoutDashboard, BookOpen, Award, GraduationCap,
  User, LogOut, BarChart2, ChevronLeft, ChevronRight, ExternalLink, Shield,
  Wrench, ChevronDown, Menu, X, FlaskConical, Lock, Bell, CreditCard, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { CertIcon } from "@/lib/cert-icons";

const TOP_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
] as const;

const LEARNING_ITEMS = [
  { href: "/labs",     labelKey: "labs",        icon: FlaskConical },
  { href: "/tools",    labelKey: "onlineTools", icon: Wrench },
] as const;

const BOTTOM_ITEMS = [
  { href: "/student/grades", labelKey: "grades", icon: BarChart2 },
] as const;

const ACCOUNT_SUB_ITEMS = [
  { tab: "security", labelKey: "password",      icon: Lock },
  { tab: "comms",     labelKey: "notifications", icon: Bell },
  { tab: "payment",   labelKey: "payment",       icon: CreditCard },
  { tab: "orders",    labelKey: "orders",        icon: FileText },
] as const;

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

// Only shown once the student is actually enrolled in at least one Program —
// an unenrolled student has nothing to see there, so the tab stays hidden
// until they join one.
function ProgramsNavItem({ collapsed, token }: { collapsed: boolean; token: string | null }) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const { data: myPrograms } = useSWR(
    token ? ["/programs/my", token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false },
  );

  if (!Array.isArray(myPrograms) || myPrograms.length === 0) return null;

  const href = "/programs";
  return (
    <Link
      href={href}
      className={cn(
        "sidebar-link",
        pathname === href || pathname.startsWith(href + "/") ? "sidebar-link-active" : "",
        collapsed ? "justify-center !px-2" : "pl-5"
      )}
      title={collapsed ? t("programs") : undefined}
    >
      <GraduationCap size={16} className="flex-shrink-0" />
      {!collapsed && <span>{t("programs")}</span>}
    </Link>
  );
}

// Only shown once the student has an active InstitutionMembership at any
// institution — most students have none, so this stays hidden by default.
function UniversityNavItem({ collapsed, token }: { collapsed: boolean; token: string | null }) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const { data: memberships } = useSWR(
    token ? ["/me/institution-memberships", token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false },
  );

  if (!Array.isArray(memberships) || memberships.length === 0) return null;

  const href = "/university";
  return (
    <Link
      href={href}
      className={cn(
        "sidebar-link",
        pathname === href || pathname.startsWith(href + "/") ? "sidebar-link-active" : "",
        collapsed ? "justify-center !px-2" : "pl-5"
      )}
      title={collapsed ? t("university") : undefined}
    >
      <GraduationCap size={16} className="flex-shrink-0" />
      {!collapsed && <span>{t("university")}</span>}
    </Link>
  );
}

function CertificationsSection({ collapsed, token }: { collapsed: boolean; token: string | null }) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const [open, setOpen] = useState(false);

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

  // A toggle only earns its place once there's enough enrolled/pending certs
  // to actually be worth hiding — below that it's just a label.
  const totalItems = activeEnrollments.length + pendingApps.length;
  const showToggle = totalItems >= 4;

  if (collapsed) {
    return (
      <Link
        href="/certificates"
        className={cn("sidebar-link justify-center !px-2", onCertPage ? "sidebar-link-active" : "")}
        title={t("certifications")}
      >
        <Award size={16} className="flex-shrink-0" />
      </Link>
    );
  }

  return (
    <>
      {showToggle ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className="sidebar-link w-full text-slate-500 hover:text-teal-700"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">{t("certifications")}</span>
          <ChevronDown
            size={12}
            className={cn("transition-transform flex-shrink-0", open ? "rotate-0" : "-rotate-90")}
          />
        </button>
      ) : (
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t("certifications")}
        </div>
      )}

      {(!showToggle || open) && (
        <>
          <Link
            href="/certificates"
            className={cn("sidebar-link ps-5", onCertPage ? "sidebar-link-active" : "")}
          >
            <Award size={16} className="flex-shrink-0" />
            <span>{t("allCertifications")}</span>
          </Link>

          {activeEnrollments.map((enrollment) => {
            const cert = enrollment.certification;
            if (!cert) return null;
            const href = `/certificates/${cert.id}`;
            return (
              <Link
                key={enrollment.id}
                href={href}
                className={cn("sidebar-link ps-8 gap-2 text-slate-600 hover:text-navy-800", pathname === href ? "sidebar-link-active" : "")}
                title={cert.title}
              >
                <CertIcon iconKey={cert.badge_icon} size={14} className="flex-shrink-0 text-teal-600" />
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
                className={cn("sidebar-link ps-8 gap-2 text-slate-500 hover:text-navy-800", pathname === href ? "sidebar-link-active" : "")}
                title={cert.title}
              >
                <CertIcon iconKey={cert.badge_icon} size={14} className="flex-shrink-0 text-amber-500" />
                <span className="font-semibold text-xs truncate">{cert.acronym}</span>
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wide ms-auto flex-shrink-0">{t("step1")}</span>
              </Link>
            );
          })}
        </>
      )}
    </>
  );
}

// "Account" is both a direct destination (your profile) and a group of four
// account-management pages — collapsed by default since those four are
// occasional visits, not every-time ones, same reasoning as Certifications'
// conditional toggle above. Auto-expands if a bookmark or notification link
// lands directly on one of them.
function AccountSection({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Sidebar");

  const onProfilePage = pathname === "/profile";
  const activeTab = onProfilePage ? (searchParams.get("tab") || "basic") : null;

  const [open, setOpen] = useState(() => ACCOUNT_SUB_ITEMS.some((i) => i.tab === activeTab));

  if (collapsed) {
    return (
      <Link
        href="/profile"
        className={cn("sidebar-link justify-center !px-2", onProfilePage ? "sidebar-link-active" : "")}
        title={t("account")}
      >
        <User size={16} className="flex-shrink-0" />
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Link
          href="/profile"
          className={cn("sidebar-link flex-1", onProfilePage && activeTab === "basic" ? "sidebar-link-active" : "")}
        >
          <User size={16} className="flex-shrink-0" />
          <span>{t("account")}</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={t("account")}
          className="p-2 rounded-lg text-slate-400 hover:text-navy-700 hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && ACCOUNT_SUB_ITEMS.map(({ tab, labelKey, icon: Icon }) => {
        const active = onProfilePage && activeTab === tab;
        return (
          <Link
            key={tab}
            href={`/profile?tab=${tab}`}
            className={cn("sidebar-link ps-5", active ? "sidebar-link-active" : "")}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </>
  );
}

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLearn = pathname === "/learn";
  const onMyCourses = pathname === "/learn/my-courses";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile hamburger trigger — sits outside the sliding <aside> so it
          stays put (and visible) while the sidebar itself is off-canvas. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t("openMenu")}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-white border border-slate-200 shadow-lg text-slate-600"
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

      <aside
        className={cn(
          "flex flex-col h-screen bg-white border-r border-slate-100 transition-all duration-300",
          "fixed inset-y-0 left-0 z-50 w-[260px]",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[68px]"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <img src="/paii.logo.png" alt="Professional Artificial Intelligence Institute" className={collapsed ? "w-8 h-8 object-contain flex-shrink-0 lg:w-8 lg:h-8" : "h-7 w-auto object-contain flex-shrink-0"} />
            {!collapsed && (
              <span className="text-[11px] font-semibold text-slate-700 leading-tight truncate">Professional AI<br />Institute</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className="hidden lg:block ms-auto text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label={t("closeMenu")}
            className="lg:hidden ms-auto text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        {TOP_ITEMS.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "sidebar-link",
              pathname === href ? "sidebar-link-active" : "",
              collapsed && "justify-center !px-2"
            )}
            title={collapsed ? t(labelKey) : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{t(labelKey)}</span>}
          </Link>
        ))}

        {/* Certifications (dynamic, from enrollments) — its own label below
            already separates it from Dashboard, so no divider needed here
            too */}
        <CertificationsSection collapsed={collapsed} token={token} />

        {/* Learning group — a fixed set of primary destinations, so just a
            label, not another collapsible accordion */}
        {!collapsed && (
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {t("learning")}
          </div>
        )}
        <Link
          href="/learn"
          className={cn("sidebar-link", onLearn ? "sidebar-link-active" : "", collapsed && "justify-center !px-2")}
          title={collapsed ? t("myLearning") : undefined}
        >
          <BookOpen size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t("myLearning")}</span>}
        </Link>
        <Link
          href="/learn/my-courses"
          className={cn("sidebar-link", onMyCourses ? "sidebar-link-active" : "", collapsed && "justify-center !px-2")}
          title={collapsed ? t("myCourses") : undefined}
        >
          <BookOpen size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t("myCourses")}</span>}
        </Link>
        {LEARNING_ITEMS.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "sidebar-link",
              pathname === href || pathname.startsWith(href + "/") ? "sidebar-link-active" : "",
              collapsed && "justify-center !px-2"
            )}
            title={collapsed ? t(labelKey) : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{t(labelKey)}</span>}
          </Link>
        ))}
        <ProgramsNavItem collapsed={collapsed} token={token} />
        <UniversityNavItem collapsed={collapsed} token={token} />

        {/* Other items */}
        {!collapsed && <div className="h-px bg-slate-100 my-1" />}
        {BOTTOM_ITEMS.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "sidebar-link",
              pathname === href ? "sidebar-link-active" : "",
              collapsed && "justify-center !px-2"
            )}
            title={collapsed ? t(labelKey) : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{t(labelKey)}</span>}
          </Link>
        ))}

        {/* Divider */}
        {!collapsed && <div className="h-px bg-slate-100 my-1" />}

        {/* Account */}
        <AccountSection collapsed={collapsed} />
      </nav>

      {/* Bottom: user + logout */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <Link
            href="/admin"
            className={cn("sidebar-link text-xs text-teal-700 hover:bg-teal-50", collapsed && "justify-center !px-2")}
            title={collapsed ? t("adminPanel") : undefined}
          >
            <Shield size={16} className="flex-shrink-0" />
            {!collapsed && <span>{t("adminPanel")}</span>}
          </Link>
        )}
        <Link
          href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}
          target="_blank"
          className={cn("sidebar-link text-xs", collapsed && "justify-center !px-2")}
        >
          <ExternalLink size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t("mainWebsite")}</span>}
        </Link>

        <button
          onClick={handleLogout}
          className={cn("sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-700", collapsed && "justify-center !px-2")}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t("signOut")}</span>}
        </button>
      </div>
      </aside>
    </>
  );
}

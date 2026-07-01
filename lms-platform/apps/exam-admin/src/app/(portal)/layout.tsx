"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/certifications",
    label: "Certifications",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
  {
    href: "/sessions",
    label: "Exam Sessions",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    href: "/results",
    label: "Results",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-[17px] h-[17px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, user, _hydrated, clear } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("exam-admin-theme");
    if (saved === "light") {
      setIsLight(true);
      document.documentElement.classList.add("light");
    }
  }, []);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add("light");
      localStorage.setItem("exam-admin-theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("exam-admin-theme", "dark");
    }
  }

  useEffect(() => {
    if (!_hydrated) return;
    if (!accessToken) { router.replace("/"); return; }
    if (user?.role !== "admin" && user?.role !== "super_admin") {
      clear();
      router.replace("/");
    }
  }, [_hydrated, accessToken, user, router, clear]);

  if (!_hydrated || !accessToken) return null;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const displayName = (user as any)?.profile?.first_name
    ? `${(user as any).profile.first_name} ${(user as any).profile.last_name ?? ""}`.trim()
    : user?.email?.split("@")[0] ?? "Admin";

  const lightSidebarText = isLight ? "#1e293b" : undefined;
  const lightSidebarSubtext = isLight ? "#64748b" : undefined;
  const lightNavInactive = isLight ? "#475569" : undefined;
  const lightNavHover = isLight ? "hover:bg-black/[0.05]" : "hover:bg-white/[0.06]";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-[248px] flex flex-col
          transition-transform md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
        }}
      >
        {/* Brand header */}
        <div
          className="flex items-center gap-3 px-5 h-16 shrink-0 relative overflow-hidden"
          style={{ borderBottom: "1px solid var(--border-sidebar)" }}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-brand-600/20 blur-xl pointer-events-none" />

          <div
            className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center relative z-10"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3d5291 100%)" }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <div className="min-w-0 relative z-10 flex-1">
            <p className="text-sm font-bold leading-tight tracking-tight" style={{ color: lightSidebarText ?? "#ffffff" }}>PAII Exam Admin</p>
            <p className="text-[11px] leading-tight mt-0.5 tracking-wide" style={{ color: lightSidebarSubtext ?? "#64748b" }}>Management Portal</p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="relative z-10 p-1.5 rounded-lg transition-colors shrink-0"
            style={{
              color: isLight ? "#64748b" : "#94a3b8",
              background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
            }}
            title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          >
            {isLight ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>

        {/* Nav section label */}
        <div className="px-4 pt-5 pb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: lightSidebarSubtext ?? "#64748b" }}>Navigation</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2.5 pb-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group
                  ${active ? "" : lightNavHover}
                `}
                style={active ? {
                  color: isLight ? "#4f46e5" : "#ffffff",
                  background: isLight
                    ? "rgba(79,70,229,0.10)"
                    : "linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(61,82,145,0.14) 100%)",
                  boxShadow: isLight
                    ? "inset 0 0 0 1px rgba(79,70,229,0.20)"
                    : "inset 0 0 0 1px rgba(99,102,232,0.18)",
                } : {
                  color: lightNavInactive ?? "#94a3b8",
                }}
              >
                <span style={{ color: active ? (isLight ? "#4f46e5" : "#818cf8") : (isLight ? "#94a3b8" : "#64748b") }}>
                  <NavIcon d={item.icon} />
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="mx-2.5 mb-3 rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-user-section)",
            border: "1px solid var(--border-user-section)",
          }}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <div
              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #334375 100%)" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: lightSidebarText ?? "#e2e8f0" }}>{displayName}</p>
              <p className="text-[11px] capitalize tracking-wide" style={{ color: lightSidebarSubtext ?? "#64748b" }}>
                {user?.role?.replace("_", " ")}
              </p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-user-section)" }}>
            <button
              onClick={() => { clear(); router.replace("/"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all"
              style={{ color: lightSidebarSubtext ?? "#64748b" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = isLight ? "#0f172a" : "#e2e8f0";
                (e.currentTarget as HTMLButtonElement).style.background = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = isLight ? "#64748b" : "#64748b";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[248px]">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center gap-3 px-4 h-14 shrink-0"
          style={{ background: "var(--bg-sidebar-header)", borderBottom: "1px solid var(--border-sidebar)" }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: isLight ? "#64748b" : "#64748b" }} className="hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-bold flex-1" style={{ color: lightSidebarText ?? "#ffffff" }}>PAII Exam Admin</span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: isLight ? "#64748b" : "#94a3b8" }}
          >
            {isLight ? <MoonIcon /> : <SunIcon />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";

type NavChild = { id: string; label: string; href: string; open_new_tab: boolean };
type NavItem  = { id: string; label: string; href: string; open_new_tab: boolean; children: NavChild[] };

const FALLBACK_NAV: NavItem[] = [
  { id: "1", label: "Certifications", href: "/certifications", open_new_tab: false, children: [
    { id: "1-1", label: "AI Foundations (Free)",           href: "/certifications/ai-foundations",           open_new_tab: false },
    { id: "1-2", label: "CAIP – Certified AI Professional",href: "/certifications/certified-ai-professional", open_new_tab: false },
    { id: "1-3", label: "CAIM – Certified AI Manager",     href: "/certifications/certified-ai-manager",     open_new_tab: false },
    { id: "1-4", label: "CAIE – Certified AI Educator",    href: "/certifications/certified-ai-educator",    open_new_tab: false },
    { id: "1-5", label: "CAIDA – Certified AI Data Analyst",href: "/certifications/certified-ai-data-analyst",open_new_tab: false },
  ]},
  { id: "2", label: "Learning",          href: "/blog",      open_new_tab: false, children: [] },
  { id: "3", label: "Resources",         href: "/faq",       open_new_tab: false, children: [] },
  { id: "4", label: "For Organizations", href: "/corporate", open_new_tab: false, children: [] },
  { id: "5", label: "For Educators",     href: "/educator",  open_new_tab: false, children: [] },
  { id: "6", label: "About PAI",         href: "/about",     open_new_tab: false, children: [] },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function Navbar() {
  const [navItems,    setNavItems]    = useState<NavItem[]>(FALLBACK_NAV);
  const [logoUrl,     setLogoUrl]     = useState<string | null>(null);
  const [logoHeight,  setLogoHeight]  = useState<number>(48);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [openId,     setOpenId]     = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const pathname   = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API}/navigation/public`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.data?.length) setNavItems(json.data); })
      .catch(() => {});

    fetch(`${API}/site-settings/public`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const data = json?.data ?? json;
        if (data?.site_logo_url) setLogoUrl(data.site_logo_url);
        if (data?.logo_height)   setLogoHeight(parseInt(data.logo_height) || 48);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenId(null); }, [pathname]);

  const openDropdown  = (id: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpenId(id); };
  const closeDropdown = ()           => { closeTimer.current = setTimeout(() => setOpenId(null), 120); };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-white border-b border-sand-300 transition-shadow duration-200",
      scrolled && "shadow-sm"
    )}>
      <TopBar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="h-[68px] flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 mr-6">
            <img
              src={logoUrl || "/paii.logo.png"}
              alt="Professional AI Institute"
              style={{ height: `${logoHeight}px` }}
              className="w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0 flex-1">
            {navItems.map((item) =>
              item.children.length > 0 ? (
                <div key={item.id} className="relative" onMouseEnter={() => openDropdown(item.id)} onMouseLeave={closeDropdown}>
                  <button className={cn(
                    "flex items-center gap-1 px-4 py-2 text-[13.5px] font-bold transition-colors border-b-2 h-[68px] hover:bg-teal-100",
                    pathname.startsWith(item.href) ? "text-ink-900 border-ink-900" : "text-ink-900 border-transparent"
                  )}>
                    {item.label}
                    <ChevronDown size={13} className={cn("text-ink-900 transition-transform", openId === item.id && "rotate-180")} />
                  </button>
                  {openId === item.id && (
                    <div
                      className="absolute top-full left-0 mt-0 w-72 bg-white rounded-xl shadow-card-hover border border-sand-300 py-2"
                      onMouseEnter={() => openDropdown(item.id)}
                      onMouseLeave={closeDropdown}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.href}
                          target={child.open_new_tab ? "_blank" : undefined}
                          rel={child.open_new_tab ? "noopener noreferrer" : undefined}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-teal-100 transition-colors mx-1"
                        >
                          <div className="w-8 h-8 rounded-md bg-ink-900 text-white flex items-center justify-center flex-shrink-0 text-[9px] font-black">
                            {child.label.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-[13px] font-semibold text-ink-900 leading-tight truncate">{child.label}</div>
                        </Link>
                      ))}
                      <div className="mx-3 mt-1 pt-2 border-t border-sand-200">
                        <Link href={item.href} className="block text-xs font-semibold text-ink-900 py-2 hover:text-ink-900 transition-colors">
                          View all →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.open_new_tab ? "_blank" : undefined}
                  rel={item.open_new_tab ? "noopener noreferrer" : undefined}
                  className={cn(
                    "px-4 py-2 text-[13.5px] font-bold transition-colors border-b-2 h-[68px] flex items-center hover:bg-teal-100",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "text-ink-900 border-ink-900"
                      : "text-ink-900 border-transparent"
                  )}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-1 ml-auto flex-shrink-0">
            {searchOpen ? (
              <div className="flex items-center border border-sand-300 rounded-lg overflow-hidden bg-white">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search…"
                  className="w-44 pl-3 pr-2 py-1.5 text-sm text-ink-900 focus:outline-none"
                  onBlur={() => setSearchOpen(false)}
                />
                <button className="px-2 text-ink-900 hover:text-ink-900" onClick={() => setSearchOpen(false)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="p-2 text-ink-900 hover:text-ink-900 hover:bg-teal-100 rounded-lg transition-colors">
                <Search size={17} />
              </button>
            )}
            <Link
              href="/certifications/certified-ai-professional"
              className="ml-1 px-5 py-2 bg-ink-900 hover:bg-ink-800 text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              Get Certified
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden ml-auto p-2 text-ink-900 hover:text-ink-900 hover:bg-teal-100 rounded-lg">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-sand-200">
          <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-0.5">
            {navItems.map((item) => (
              <div key={item.id}>
                {item.children.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-900 px-3 pt-2 pb-1">{item.label}</p>
                )}
                {item.children.length > 0 ? item.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.href}
                    target={child.open_new_tab ? "_blank" : undefined}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-ink-900 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">
                      {child.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-semibold text-ink-900">{child.label}</div>
                  </Link>
                )) : (
                  <Link
                    href={item.href}
                    target={item.open_new_tab ? "_blank" : undefined}
                    className="block px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-teal-100 hover:text-ink-900 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="border-t border-sand-200 mt-2 pt-3">
              <Link href="/certifications/certified-ai-professional"
                className="block text-center py-3 bg-ink-900 text-white text-sm font-semibold rounded-lg hover:bg-ink-800 transition-colors">
                Get Certified
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

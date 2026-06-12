"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Award, BookOpen, Building2, Search, GraduationCap, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  {
    label: "Certifications",
    href: "/certifications",
    icon: Award,
    children: [
      { label: "All Certifications", href: "/certifications", desc: "Browse all PAI credentials" },
      { label: "Certified AI Professional (CAIP)", href: "/certifications/certified-ai-professional", desc: "Our flagship credential" },
      { label: "AI Foundations (Free)", href: "/ai-foundations", desc: "Start here — free intro course" },
      { label: "Learning Path", href: "/learning-path", desc: "Structured progression" },
    ],
  },
  { label: "About", href: "/about", icon: BookOpen },
  { label: "Corporate Training", href: "/corporate", icon: Building2 },
  { label: "Verify Certificate", href: "/verify", icon: Search },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const headerBg = isHomePage
    ? scrolled
      ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100"
      : "bg-transparent"
    : "bg-white shadow-sm border-b border-slate-100";

  const navColor = isHomePage && !scrolled ? "text-white/90 hover:text-white" : "text-slate-700 hover:text-navy-800";

  return (
    <header className={cn("relative fixed top-0 left-0 right-0 z-50 transition-all duration-300", headerBg)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 py-0">

          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0 absolute left-6 top-1/2 -translate-y-1/2">
            <Image
              src="/logo.png"
              alt="Professional AI Institute"
              width={480}
              height={240}
              className="h-16 w-auto group-hover:scale-105 transition-transform"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.children && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {link.children ? (
                  <button
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                      navColor,
                      pathname.startsWith(link.href) && (isHomePage && !scrolled ? "text-gold-300" : "text-navy-800")
                    )}
                  >
                    {link.label}
                    <ChevronDown
                      size={14}
                      className={cn("transition-transform", openDropdown === link.label && "rotate-180")}
                    />
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                      navColor,
                      pathname === link.href && (isHomePage && !scrolled ? "text-gold-300" : "text-navy-800")
                    )}
                  >
                    {link.label}
                  </Link>
                )}

                {/* Dropdown */}
                {link.children && openDropdown === link.label && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-2xl shadow-card-hover border border-slate-100 p-2 animate-fade-in">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex flex-col gap-0.5 px-4 py-3 rounded-xl hover:bg-navy-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-navy-900">{child.label}</span>
                        <span className="text-xs text-slate-500">{child.desc}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop CTA — swaps based on auth state */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200",
                    isHomePage && !scrolled
                      ? "text-white/90 hover:text-white hover:bg-white/10"
                      : "text-navy-800 hover:bg-navy-50"
                  )}
                >
                  <LayoutDashboard size={15} />
                  My Dashboard
                </Link>
                <Link
                  href="/lms"
                  className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-gold hover:shadow-lg hover:-translate-y-0.5"
                >
                  <GraduationCap size={15} />
                  My Learning
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200",
                    isHomePage && !scrolled
                      ? "text-white/90 hover:text-white hover:bg-white/10"
                      : "text-navy-800 hover:bg-navy-50"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  href="/certifications/certified-ai-professional"
                  className="bg-gold-500 hover:bg-gold-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-gold hover:shadow-lg hover:-translate-y-0.5"
                >
                  Become Certified
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "lg:hidden p-2 rounded-lg transition-colors",
              isHomePage && !scrolled ? "text-white hover:bg-white/10" : "text-navy-800 hover:bg-navy-50"
            )}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <div key={link.label}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
                    pathname === link.href
                      ? "bg-navy-800 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <link.icon size={16} className="text-gold-500" />
                  {link.label}
                </Link>
                {link.children && (
                  <div className="ml-7 mt-1 space-y-1 border-l-2 border-slate-100 pl-4">
                    {link.children.slice(1).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block py-2 px-3 text-xs text-slate-600 hover:text-navy-800 font-medium rounded-lg hover:bg-slate-50"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-navy-800 text-navy-800 font-semibold text-sm hover:bg-navy-50 transition-colors"
                  >
                    <LayoutDashboard size={15} />
                    My Dashboard
                  </Link>
                  <Link
                    href="/lms"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-white font-bold text-sm hover:bg-gold-400 transition-colors"
                  >
                    <GraduationCap size={15} />
                    My Learning
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full text-center px-4 py-3 rounded-xl border-2 border-navy-800 text-navy-800 font-semibold text-sm hover:bg-navy-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/certifications/certified-ai-professional"
                    className="w-full text-center px-4 py-3 rounded-xl bg-gold-500 text-white font-bold text-sm hover:bg-gold-400 transition-colors"
                  >
                    Become Certified
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

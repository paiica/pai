"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronDown, Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";
import CertificationsMegaMenu, { groupCertificationsByCategory, type NavCertification } from "@/components/layout/CertificationsMegaMenu";
import GroupedMegaMenu, { groupChildren } from "@/components/layout/GroupedMegaMenu";

type NavChild = { id: string; label: string; href: string; open_new_tab: boolean; group_label: string };
type NavItem  = { id: string; label: string; href: string; open_new_tab: boolean; children: NavChild[] };

export default function NavbarClient({
  initialNavItems, certifications, logoUrl, logoHeight,
}: {
  initialNavItems: NavItem[];
  certifications: NavCertification[];
  logoUrl: string | null;
  logoHeight: number;
}) {
  const t = useTranslations("Common");
  const [navItems]   = useState<NavItem[]>(initialNavItems);
  const certCategories = groupCertificationsByCategory(certifications);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [openId,     setOpenId]     = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const pathname   = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      "fixed top-0 start-0 end-0 z-50 bg-white border-b border-sand-300 transition-shadow duration-200",
      scrolled && "shadow-sm"
    )}>
      <TopBar logoUrl={logoUrl} logoHeight={logoHeight} />
      <div className="h-14 flex items-center">

        {/* Desktop nav — flush against the viewport edge, mirroring the TopBar logo above it */}
        <nav className="hidden lg:flex items-center gap-0 flex-shrink-0 ps-4 sm:ps-6">
            {navItems.map((item) => {
              const isCertifications = item.href === "/certifications";
              const isGrouped = !isCertifications && item.children.some((c) => c.group_label);
              const hasDropdown = isCertifications ? certCategories.length > 0 : item.children.length > 0;
              return hasDropdown ? (
                <div key={item.id} className="relative" onMouseEnter={() => openDropdown(item.id)} onMouseLeave={closeDropdown}>
                  <button className={cn(
                    "flex items-center gap-1 px-4 py-2 text-[13.5px] font-bold transition-colors border-b-2 h-14 hover:bg-teal-100",
                    pathname.startsWith(item.href) ? "text-ink-900 border-ink-900" : "text-ink-900 border-transparent"
                  )}>
                    {item.label}
                    <ChevronDown size={13} className={cn("text-ink-900 transition-transform", openId === item.id && "rotate-180")} />
                  </button>
                  {openId === item.id && isGrouped && (
                    // position: fixed, not absolute — a grouped mega-menu's width
                    // (several hundred px) has no reliable relationship to where its
                    // trigger link happens to sit in the bar, so anchoring to the
                    // trigger (start-0 or end-0) runs it off one edge or the other
                    // depending on the item's position. Positioning it relative to
                    // the viewport instead, spanning the header's own width and
                    // centered like the rest of the nav content, always fits.
                    <div
                      className="fixed start-0 end-0 mt-0 flex justify-center px-4"
                      style={{ top: "var(--header-height, 88px)" }}
                      onMouseEnter={() => openDropdown(item.id)}
                      onMouseLeave={closeDropdown}
                    >
                      <div className="max-w-[1400px] w-full flex justify-start">
                        <div className="bg-white rounded-xl shadow-card-hover border border-sand-300 overflow-hidden">
                          <GroupedMegaMenu children={item.children} />
                        </div>
                      </div>
                    </div>
                  )}
                  {openId === item.id && !isGrouped && (
                    <div
                      className={cn(
                        "absolute top-full start-0 mt-0 bg-white rounded-xl shadow-card-hover border border-sand-300 overflow-hidden",
                        !isCertifications && "w-72 py-2"
                      )}
                      onMouseEnter={() => openDropdown(item.id)}
                      onMouseLeave={closeDropdown}
                    >
                      {isCertifications ? (
                        <>
                          <CertificationsMegaMenu categories={certCategories} resourceLinks={item.children} />
                          <div className="mx-5 mb-4 pt-3 border-t border-sand-200">
                            <Link href={item.href} className="inline-block text-xs font-semibold text-ink-900 hover:text-ink-900 transition-colors">
                              {t("viewAll")} →
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
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
                              {t("viewAll")} →
                            </Link>
                          </div>
                        </>
                      )}
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
                    "px-4 py-2 text-[13.5px] font-bold transition-colors border-b-2 h-14 flex items-center hover:bg-teal-100",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "text-ink-900 border-ink-900"
                      : "text-ink-900 border-transparent"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side — bounded to the centered column, mirroring the TopBar's right-aligned cart/account */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex items-center justify-end gap-1">
            <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
              {searchOpen ? (
                <div className="flex items-center border border-sand-300 rounded-lg overflow-hidden bg-white">
                  <input
                    autoFocus
                    type="text"
                    placeholder={t("search")}
                    className="w-44 ps-3 pe-2 py-1.5 text-sm text-ink-900 focus:outline-none"
                    onBlur={() => setSearchOpen(false)}
                  />
                  <button aria-label={t("closeSearch")} className="px-2 text-ink-900 hover:text-ink-900" onClick={() => setSearchOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button aria-label={t("openSearch")} onClick={() => setSearchOpen(true)}
                  className="p-2 text-ink-900 hover:text-ink-900 hover:bg-teal-100 rounded-lg transition-colors">
                  <Search size={17} />
                </button>
              )}
              <Link
                href="/certifications/caip"
                className="ms-1 px-5 py-2 bg-ink-900 hover:bg-ink-800 text-white text-[13px] font-semibold rounded-lg transition-colors"
              >
                {t("getCertified")}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button aria-label={mobileOpen ? t("closeMenu") : t("openMenu")} onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-ink-900 hover:text-ink-900 hover:bg-teal-100 rounded-lg">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-sand-200">
          <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-0.5">
            {navItems.map((item) => {
              const isCertifications = item.href === "/certifications";

              if (isCertifications && certCategories.length > 0) {
                return (
                  <div key={item.id}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-900 px-3 pt-2 pb-1">{item.label}</p>
                    {certCategories.map((group) => (
                      <div key={group.key} className="mb-1">
                        <p className="text-[10px] font-semibold text-slate-400 px-3 pt-1 pb-0.5">{t(group.labelKey)}</p>
                        {group.certs.map((cert) => (
                          <Link
                            key={cert.id}
                            href={`/certifications/${cert.slug}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-teal-100 transition-colors"
                          >
                            <span className="text-sm font-semibold text-ink-900">{cert.title}</span>
                            {cert.status === "coming_soon" && (
                              <span className="flex-shrink-0 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500 text-white">
                                {t("comingSoon")}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    ))}
                    {item.children.length > 0 && (
                      <>
                        <p className="text-[10px] font-semibold text-slate-400 px-3 pt-2 pb-0.5">{t("certResources")}</p>
                        {item.children.map((link) => (
                          <Link key={link.id} href={link.href} target={link.open_new_tab ? "_blank" : undefined}
                            className="block px-3 py-2 text-sm font-medium text-ink-900/80 hover:bg-teal-100 hover:text-ink-900 rounded-lg transition-colors">
                            {link.label}
                          </Link>
                        ))}
                      </>
                    )}
                    <Link href={item.href} className="block px-3 py-2 text-sm font-bold text-ink-900 hover:bg-teal-100 rounded-lg transition-colors">
                      {t("viewAll")} →
                    </Link>
                  </div>
                );
              }

              if (item.children.some((c) => c.group_label)) {
                return (
                  <div key={item.id}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-900 px-3 pt-2 pb-1">{item.label}</p>
                    {groupChildren(item.children).map((group) => (
                      <div key={group.label || "_"} className="mb-1">
                        {group.label && <p className="text-[10px] font-semibold text-slate-400 px-3 pt-1 pb-0.5">{group.label}</p>}
                        {group.children.map((child) => (
                          <Link key={child.id} href={child.href} target={child.open_new_tab ? "_blank" : undefined}
                            className="block px-3 py-2 text-sm font-medium text-ink-900 hover:bg-teal-100 rounded-lg transition-colors">
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
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
              );
            })}
            <div className="border-t border-sand-200 mt-2 pt-3">
              <Link href="/certifications/caip"
                className="block text-center py-3 bg-ink-900 text-white text-sm font-semibold rounded-lg hover:bg-ink-800 transition-colors">
                {t("getCertified")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

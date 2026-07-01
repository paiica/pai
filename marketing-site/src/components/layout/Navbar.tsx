import NavbarClient from "@/components/layout/NavbarClient";

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
  { id: "6", label: "About PAII",        href: "/about",     open_new_tab: false, children: [] },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getNavItems(): Promise<NavItem[]> {
  try {
    const res = await fetch(`${API}/navigation/public`, { next: { revalidate: 300 } });
    if (!res.ok) return FALLBACK_NAV;
    const json = await res.json();
    return json?.data?.length ? json.data : FALLBACK_NAV;
  } catch {
    return FALLBACK_NAV;
  }
}

async function getSiteSettings(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${API}/site-settings/public`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch {
    return null;
  }
}

// Fetched server-side so the logo/bar render at the right size on first
// paint — a client-only fetch would default to a placeholder size, then
// visibly jump once the request resolved after mount.
export default async function Navbar() {
  const [navItems, settings] = await Promise.all([getNavItems(), getSiteSettings()]);

  const logoUrl = settings?.site_logo_url ?? null;
  const logoHeight = Math.max(16, parseInt(settings?.logo_height) || 22);

  return <NavbarClient initialNavItems={navItems} logoUrl={logoUrl} logoHeight={logoHeight} />;
}

import { getLocale, getTranslations } from "next-intl/server";
import NavbarClient from "@/components/layout/NavbarClient";

type NavChild = { id: string; label: string; href: string; open_new_tab: boolean };
type NavItem  = { id: string; label: string; href: string; open_new_tab: boolean; children: NavChild[] };

// Only used if /navigation/public fails or hasn't been seeded — the DB-backed
// NavItem rows it normally returns are already translated via `translations`.
function getFallbackNav(t: (key: string) => string): NavItem[] {
  return [
    { id: "1", label: t("navCertifications"),    href: "/certifications", open_new_tab: false, children: [] },
    { id: "2", label: t("navPrograms"),          href: "/programs",  open_new_tab: false, children: [] },
    { id: "3", label: t("navLearning"),          href: "/blog",      open_new_tab: false, children: [] },
    { id: "4", label: t("navResources"),         href: "/faq",       open_new_tab: false, children: [] },
    { id: "5", label: t("navForOrganizations"), href: "/corporate", open_new_tab: false, children: [] },
    { id: "6", label: t("navAboutPaii"),        href: "/about",     open_new_tab: false, children: [] },
  ];
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getNavItems(locale: string, fallback: NavItem[]): Promise<NavItem[]> {
  try {
    const res = await fetch(`${API}/navigation/public?lang=${locale}`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    const json = await res.json();
    return json?.data?.length ? json.data : fallback;
  } catch {
    return fallback;
  }
}

async function getSiteSettings(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${API}/site-settings/public`, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error(`[site-settings] fetch returned ${res.status} from ${API}/site-settings/public`);
      return null;
    }
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch (err) {
    console.error("[site-settings] fetch failed", err);
    return null;
  }
}

// Fetched server-side so the logo/bar render at the right size on first
// paint — a client-only fetch would default to a placeholder size, then
// visibly jump once the request resolved after mount.
export default async function Navbar() {
  const locale = await getLocale();
  const t = await getTranslations("Navbar");
  const [navItems, settings] = await Promise.all([getNavItems(locale, getFallbackNav(t)), getSiteSettings()]);

  const logoUrl = settings?.site_logo_url ?? null;
  const logoHeight = Math.max(16, parseInt(settings?.logo_height) || 22);

  return <NavbarClient initialNavItems={navItems} logoUrl={logoUrl} logoHeight={logoHeight} />;
}

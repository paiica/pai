import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ChevronRight } from "lucide-react";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";
import { CertCardItem, type CertCard } from "@/components/sections/CertificationsSection";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/certifications?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const cms = await getCmsPage(locale);
  return {
    title: cms?.title || "AI Certification Programs | Professional Artificial Intelligence Institute",
    description: cms?.meta_description || "Globally recognized AI certifications for every career stage — from core professional to domain specialist.",
  };
}

function getLevelGroups(t: (key: string) => string) {
  return [
    { key: "pre_certificate", label: t("groupPreCertificateLabel"), description: t("groupPreCertificateDesc") },
    { key: "foundation",      label: t("groupFoundationLabel"),     description: t("groupFoundationDesc") },
    { key: "advanced",        label: t("groupAdvancedLabel"),       description: t("groupAdvancedDesc") },
    { key: "specialist",      label: t("groupSpecialistLabel"),     description: t("groupSpecialistDesc") },
    { key: "executive",       label: t("groupExecutiveLabel"),      description: t("groupExecutiveDesc") },
    { key: "other",           label: t("groupOtherLabel"),          description: t("groupOtherDesc") },
  ];
}

// A CertCard whose `level` (used for on-card display, matching the homepage
// exactly) may be a human label like "Executive Track" — grouping into
// LEVEL_GROUPS needs the raw enum key underneath that, so it's kept
// separately rather than overwritten.
type GroupableCertCard = CertCard & { _rawLevel: string };

// Distinguishes "the backend request failed" from "there are genuinely zero
// certifications" — collapsing both into an empty array (the previous
// behavior) made a transient fetch failure on this page indistinguishable
// from a real empty catalog, with no indication to the visitor that
// anything went wrong.
//
// Maps to the same CertCard shape the homepage's carousel builds from
// /courses/featured, so both pages render identical cards via CertCardItem.
async function getCertifications(locale: string): Promise<{ items: GroupableCertCard[]; failed: boolean }> {
  try {
    const res = await fetch(`${API}/courses?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return { items: [], failed: true };
    const json = await res.json();
    const raw: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
    const items: GroupableCertCard[] = raw
      .filter((c: any) => c.status !== "archived")
      .map((c: any) => {
        const meta = typeof c.marketing_meta === "object" && c.marketing_meta !== null ? c.marketing_meta : {};
        return {
          acronym: c.acronym ?? "",
          title: c.title ?? "",
          slug: c.slug ?? "",
          level: meta.audience_label || c.level || "",
          _rawLevel: c.level || "",
          description: c.description ?? "",
          popular: meta.is_most_popular ? "true" : "false",
          status: c.status ?? "active",
          flagship: !!c.is_flagship,
        };
      });
    return { items, failed: false };
  } catch {
    return { items: [], failed: true };
  }
}

export default async function CertificationsListPage() {
  const locale = await getLocale();
  const t = await getTranslations("CertificationsPage");
  const tc = await getTranslations("Common");
  const { items: certs, failed } = await getCertifications(locale);
  const cms = await getCmsPage(locale);

  // Assign a stable global theme index before grouping so colours vary across the whole page
  const certsWithIdx = certs.map((cert, i) => ({ ...cert, _themeIdx: i }));

  // "other" also catches any cert whose level doesn't match a known group (e.g. legacy/unrecognised values)
  const levelGroups = getLevelGroups(t);
  const knownKeys = new Set(levelGroups.map((g) => g.key));
  const groups = levelGroups
    .map((g) => ({
      ...g,
      certs: certsWithIdx.filter((c) => g.key === "other" ? (c._rawLevel === "other" || !knownKeys.has(c._rawLevel)) : c._rawLevel === g.key),
    }))
    .filter((g) => g.certs.length > 0);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled, otherwise the original hardcoded copy */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-20 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,145,58,0.9) 1px, transparent 0)",
                backgroundSize: "48px 48px",
              }}
            />
            <div className="container-lg relative">
              <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-5">
                <Link href="/" className="hover:text-white transition-colors">{tc("home")}</Link>
                <ChevronRight size={12} />
                <span className="text-white">{t("breadcrumb")}</span>
              </div>
              <span className="badge-dark mb-5">{t("heroBadge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
                {t("heroHeading")}
                <br />
                <span className="text-gradient">{t("heroHeadingHighlight")}</span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        {/* Grouped sections */}
        <section className="section-padding bg-white">
          <div className="container-lg space-y-16">
            {failed && (
              <div className="text-center py-20 text-ink-500 text-sm">
                <p className="font-semibold text-ink-700 mb-1">{t("loadErrorHeading")}</p>
                <p>{t("loadErrorBody")}</p>
              </div>
            )}
            {!failed && certs.length === 0 && (
              <div className="text-center py-20 text-ink-500 text-sm">{t("noCertsPublished")}</div>
            )}
            {groups.map((group) => (
              <div key={group.key}>
                {/* Section header */}
                <div className="mb-8 pb-4 border-b border-sand-200">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-2xl font-display font-black text-ink-900">{group.label}</h2>
                    <span className="text-sm text-ink-500">{group.description}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.certs.map((cert) => (
                    <CertCardItem key={cert.slug} cert={cert} idx={cert._themeIdx} widthClassName="w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

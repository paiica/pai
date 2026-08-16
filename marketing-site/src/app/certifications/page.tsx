import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ChevronRight } from "lucide-react";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";
import { CertCardItem, type CertCard } from "@/components/sections/CertificationsSection";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/certifications`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsPage();
  return {
    title: cms?.title || "AI Certification Programs | Professional Artificial Intelligence Institute",
    description: cms?.meta_description || "Globally recognized AI certifications for every career stage — from core professional to domain specialist.",
  };
}

const LEVEL_GROUPS = [
  { key: "pre_certificate", label: "Pre-Certification", description: "Start your AI journey — no prior experience required." },
  { key: "foundation",      label: "Foundation",        description: "Core credentials for professionals entering the AI field." },
  { key: "advanced",        label: "Advanced",          description: "Advanced specializations for experienced AI practitioners." },
  { key: "specialist",      label: "Specialist",        description: "Focused specialist tracks for niche AI domains." },
  { key: "executive",       label: "Executive",         description: "Executive and leadership-level AI credentials." },
  { key: "other",           label: "Other Certifications", description: "Specialized programs that don't fit our standard tracks." },
];

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
async function getCertifications(): Promise<{ items: GroupableCertCard[]; failed: boolean }> {
  try {
    const res = await fetch(`${API}/courses`, { cache: "no-store" });
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
  const { items: certs, failed } = await getCertifications();
  const cms = await getCmsPage();

  // Assign a stable global theme index before grouping so colours vary across the whole page
  const certsWithIdx = certs.map((cert, i) => ({ ...cert, _themeIdx: i }));

  // "other" also catches any cert whose level doesn't match a known group (e.g. legacy/unrecognised values)
  const knownKeys = new Set(LEVEL_GROUPS.map((g) => g.key));
  const groups = LEVEL_GROUPS
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
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight size={12} />
                <span className="text-white">Certifications</span>
              </div>
              <span className="badge-dark mb-5">Certification Programs</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
                Become a Certified
                <br />
                <span className="text-gradient">AI Professional.</span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl">
                Globally recognized credentials for every career stage. From core practitioner to domain expert — your AI career starts here.
              </p>
            </div>
          </section>
        )}

        {/* Grouped sections */}
        <section className="section-padding bg-white">
          <div className="container-lg space-y-16">
            {failed && (
              <div className="text-center py-20 text-ink-500 text-sm">
                <p className="font-semibold text-ink-700 mb-1">We're having trouble loading certifications right now.</p>
                <p>Please refresh the page — if this keeps happening, contact support.</p>
              </div>
            )}
            {!failed && certs.length === 0 && (
              <div className="text-center py-20 text-ink-500 text-sm">No certifications published yet — check back soon.</div>
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

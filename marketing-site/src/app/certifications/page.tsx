import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

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

const CERT_THEMES = [
  { dark: false, bg: "bg-[#f5f0eb]", shapeColor: "#134e4a", shapeType: "pentagon" },
  { dark: true,  bg: "bg-[#0f2a5c]", shapeColor: "#38bdf8", shapeType: "circle"   },
  { dark: true,  bg: "bg-[#2d1b69]", shapeColor: "#a78bfa", shapeType: "triangle" },
  { dark: false, bg: "bg-[#eaf5ef]", shapeColor: "#059669", shapeType: "pentagon" },
];

const LEVEL_GROUPS = [
  { key: "pre_certificate", label: "Pre-Certification", description: "Start your AI journey — no prior experience required." },
  { key: "foundation",      label: "Foundation",        description: "Core credentials for professionals entering the AI field." },
  { key: "advanced",        label: "Advanced",          description: "Advanced specializations for experienced AI practitioners." },
  { key: "specialist",      label: "Specialist",        description: "Focused specialist tracks for niche AI domains." },
  { key: "executive",       label: "Executive",         description: "Executive and leadership-level AI credentials." },
  { key: "other",           label: "Other Certifications", description: "Specialized programs that don't fit our standard tracks." },
];

const LEVEL_LABEL: Record<string, string> = {
  pre_certificate: "Pre-Certification",
  foundation: "Foundation",
  advanced: "Advanced",
  specialist: "Specialist",
  executive: "Executive",
  other: "Other",
};

// Distinguishes "the backend request failed" from "there are genuinely zero
// certifications" — collapsing both into an empty array (the previous
// behavior) made a transient fetch failure on this page indistinguishable
// from a real empty catalog, with no indication to the visitor that
// anything went wrong.
async function getCertifications(): Promise<{ items: any[]; failed: boolean }> {
  try {
    const res = await fetch(`${API}/courses`, { cache: "no-store" });
    if (!res.ok) return { items: [], failed: true };
    const json = await res.json();
    const items: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
    return { items: items.filter((c: any) => c.status !== "archived"), failed: false };
  } catch {
    return { items: [], failed: true };
  }
}

function Shape({ type, color }: { type: string; color: string }) {
  if (type === "circle") {
    return (
      <div className="absolute top-5 right-5 w-36 h-36 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />
    );
  }
  if (type === "triangle") {
    return (
      <svg className="absolute top-0 right-0 w-40 h-36 opacity-25" viewBox="0 0 130 110">
        <polygon points="130,0 130,110 0,110" fill={color} />
      </svg>
    );
  }
  return (
    <svg className="absolute top-3 right-3 w-36 h-36 opacity-20" viewBox="0 0 100 100">
      <polygon points="50,5 95,35 80,85 20,85 5,35" fill={color} />
    </svg>
  );
}

function CertCard({ cert, idx }: { cert: any; idx: number }) {
  const theme = CERT_THEMES[idx % CERT_THEMES.length];
  const meta = typeof cert.marketing_meta === "object" && cert.marketing_meta !== null ? cert.marketing_meta : {};
  const levelText = meta.audience_label || LEVEL_LABEL[cert.level] || cert.level || "";
  const isPopular = meta.is_most_popular === true || cert.popular === true;
  const isComingSoon = cert.status === "coming_soon";
  const price = Number(cert.price);

  return (
    <div className={cn(
      "relative h-[500px] rounded-2xl overflow-hidden flex flex-col border transition-shadow hover:shadow-lg",
      theme.bg,
      theme.dark ? "border-white/10" : "border-sand-300"
    )}>
      <div className="relative h-[165px] overflow-hidden">
        {cert.badge_image_url ? (
          <>
            <img src={cert.badge_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            {/* Legibility gradient behind the badges — a photo's brightness
                varies, unlike the fixed-contrast theme colors it replaces. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-transparent" />
          </>
        ) : (
          <Shape type={theme.shapeType} color={theme.shapeColor} />
        )}
        <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-[12px] font-semibold px-3 py-1.5 rounded-full border",
            cert.badge_image_url || theme.dark ? "bg-white/10 text-white border-white/20" : "bg-white/70 text-ink-900 border-sand-200/60"
          )}>
            Certification
          </span>
          {isComingSoon ? (
            <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
              Coming Soon
            </span>
          ) : isPopular && (
            <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
              Most Popular
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        {levelText && (
          <p className={cn("text-[12px] font-semibold mb-1.5", theme.dark ? "text-white" : "text-ink-900")}>
            {levelText}
          </p>
        )}
        <p className={cn("text-[12px] font-bold uppercase tracking-wider mb-1.5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.acronym}™
        </p>
        <h3 className={cn("font-display font-black text-[19px] leading-snug mb-3.5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.title}
        </h3>
        <p className={cn("text-[13.5px] leading-relaxed flex-1 mb-6 line-clamp-5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.description}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-sm font-bold flex-shrink-0", theme.dark ? "text-white" : "text-ink-900")}>
            {price === 0 ? "Free" : `$${price.toLocaleString()}`}
          </span>
          <Link
            href={`/certifications/${cert.slug}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-colors",
              theme.dark ? "bg-white text-ink-900 hover:bg-teal-50" : "bg-ink-900 text-white hover:bg-ink-700"
            )}
          >
            Learn More <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function CertificationsListPage() {
  const { items: certs, failed } = await getCertifications();
  const cms = await getCmsPage();

  // Assign a stable global theme index before grouping so colours vary across the whole page
  const certsWithIdx = certs.map((cert: any, i: number) => ({ ...cert, _themeIdx: i }));

  // "other" also catches any cert whose level doesn't match a known group (e.g. legacy/unrecognised values)
  const knownKeys = new Set(LEVEL_GROUPS.map((g) => g.key));
  const groups = LEVEL_GROUPS
    .map((g) => ({
      ...g,
      certs: certsWithIdx.filter((c: any) => g.key === "other" ? (c.level === "other" || !knownKeys.has(c.level)) : c.level === g.key),
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
                  {group.certs.map((cert: any) => (
                    <CertCard key={cert.id ?? cert.slug} cert={cert} idx={cert._themeIdx} />
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

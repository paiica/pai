import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight, Award, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Certification Programs | Professional AI Institute",
  description:
    "Globally recognized AI certifications for every career stage — from core professional to domain specialist.",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const THEMES = [
  { dark: false, bg: "#f5f0eb", shape: "#134e4a" },
  { dark: true,  bg: "#0f2a5c", shape: "#38bdf8" },
  { dark: true,  bg: "#2d1b69", shape: "#a78bfa" },
  { dark: false, bg: "#eaf5ef", shape: "#059669" },
  { dark: false, bg: "#fce7f3", shape: "#db2777" },
  { dark: true,  bg: "#1e3a5f", shape: "#60a5fa" },
];

const LEVEL_GROUPS = [
  { key: "pre_certificate", label: "Pre-Certification", description: "Start your AI journey — no prior experience required." },
  { key: "foundation",      label: "Level 1",           description: "Core credentials for professionals entering the AI field." },
  { key: "advanced",        label: "Level 2",           description: "Advanced specializations for experienced AI practitioners." },
  { key: "executive",       label: "Level 3",           description: "Executive and leadership-level AI credentials." },
];

const FALLBACK = [
  { id: "1", acronym: "CAIP",  title: "Certified AI Professional",  slug: "certified-ai-professional",  description: "Master AI fundamentals, tools, workflows, ethics, and practical applications across industries.", level: "foundation", price: 495, popular: true  },
  { id: "2", acronym: "CAIM",  title: "Certified AI Manager",       slug: "certified-ai-manager",       description: "Lead AI transformation initiatives, manage AI-powered teams, and build data-driven cultures.",   level: "advanced",    price: 595, popular: false },
  { id: "3", acronym: "CAIE",  title: "Certified AI Educator",      slug: "certified-ai-educator",      description: "Design and deliver AI-powered learning experiences for educators and L&D professionals.",        level: "advanced",    price: 595, popular: false },
  { id: "4", acronym: "CAIDA", title: "Certified AI Data Analyst",  slug: "certified-ai-data-analyst",  description: "Advanced AI-powered data analysis and machine learning interpretation for data professionals.",   level: "advanced",    price: 595, popular: false },
];

async function getCertifications(): Promise<any[]> {
  try {
    const res = await fetch(`${API}/courses`, { cache: "no-store" });
    if (!res.ok) return FALLBACK;
    const json = await res.json();
    const items: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
    const active = items.filter((c: any) => c.status !== "archived");
    return active.length > 0 ? active : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function Shape({ color, idx }: { color: string; idx: number }) {
  const type = idx % 3;
  if (type === 0)
    return (
      <div
        className="absolute top-4 right-4 w-28 h-28 rounded-full opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />
    );
  if (type === 1)
    return (
      <svg className="absolute top-0 right-0 w-32 h-28 opacity-20 pointer-events-none" viewBox="0 0 130 110">
        <polygon points="130,0 130,110 0,110" fill={color} />
      </svg>
    );
  return (
    <svg className="absolute top-2 right-2 w-28 h-28 opacity-20 pointer-events-none" viewBox="0 0 100 100">
      <polygon points="50,5 95,35 80,85 20,85 5,35" fill={color} />
    </svg>
  );
}

export default async function CertificationsListPage() {
  const certs = await getCertifications();

  // Assign a stable global theme index before grouping so colours vary across the whole page
  const certsWithIdx = certs.map((cert: any, i: number) => ({ ...cert, _themeIdx: i }));

  const groups = LEVEL_GROUPS
    .map((g) => ({ ...g, certs: certsWithIdx.filter((c: any) => c.level === g.key) }))
    .filter((g) => g.certs.length > 0);

  // Any cert whose level doesn't match the four known groups falls into "Other"
  const knownKeys = new Set(LEVEL_GROUPS.map((g) => g.key));
  const ungrouped = certsWithIdx.filter((c: any) => !knownKeys.has(c.level));

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-[148px] pb-20 bg-hero-dark relative overflow-hidden">
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

        {/* Grouped sections */}
        <section className="section-padding bg-white">
          <div className="container-lg space-y-16">
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
                  {group.certs.map((cert: any) => {
                    const theme = THEMES[cert._themeIdx % THEMES.length];
                    const meta = typeof cert.marketing_meta === "object" && cert.marketing_meta !== null
                      ? cert.marketing_meta : {};
                    const audienceLabel = meta.audience_label || "";
                    const isPopular = meta.is_most_popular === true || cert.popular === true;
                    const price = Number(cert.price);

                    return (
                      <div
                        key={cert.id ?? cert.slug}
                        className="relative rounded-2xl overflow-hidden flex flex-col border transition-shadow hover:shadow-lg"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.dark ? "rgba(255,255,255,0.1)" : "#e5d9c8",
                        }}
                      >
                        {/* Decorative shape + badges */}
                        <div className="relative h-[100px] overflow-hidden flex-shrink-0">
                          <Shape color={theme.shape} idx={cert._themeIdx} />
                          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                              style={theme.dark
                                ? { background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }
                                : { background: "rgba(255,255,255,0.7)", color: "#1a1a2e", borderColor: "rgba(229,217,200,0.6)" }}
                            >
                              Certification
                            </span>
                            {isPopular && (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500 text-white">
                                Most Popular
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 flex flex-col flex-1">
                          {audienceLabel && (
                            <p
                              className="text-[11px] font-semibold mb-1"
                              style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}
                            >
                              {audienceLabel}
                            </p>
                          )}
                          <p
                            className="text-[11px] font-bold uppercase tracking-wider mb-1"
                            style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}
                          >
                            {cert.acronym}®
                          </p>
                          <h3
                            className="font-display font-black text-[16px] leading-snug mb-3"
                            style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}
                          >
                            {cert.title}
                          </h3>
                          <p
                            className="text-[12.5px] leading-relaxed flex-1 mb-4 line-clamp-3"
                            style={{ color: theme.dark ? "rgba(255,255,255,0.85)" : "#1a1a2e" }}
                          >
                            {cert.description}
                          </p>

                          {cert.status === "coming_soon" ? (
                            <div className="mt-auto pt-3 flex items-center justify-between" style={{ borderTop: theme.dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(229,217,200,0.6)" }}>
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500 text-white">
                                Coming Soon
                              </span>
                              <Link
                                href={`/certifications/${cert.slug}`}
                                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-[12px] font-bold transition-colors"
                                style={theme.dark ? { background: "rgba(255,255,255,0.15)", color: "#fff" } : { background: "rgba(26,26,46,0.15)", color: "#1a1a2e" }}
                              >
                                Learn More <ArrowRight size={11} />
                              </Link>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: theme.dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(229,217,200,0.6)" }}>
                              <div className="flex items-center gap-1" style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}>
                                <Award size={12} />
                                <span className="text-[12px] font-bold">
                                  {price === 0 ? "Free" : `$${price.toLocaleString()}`}
                                </span>
                              </div>
                              <Link
                                href={`/certifications/${cert.slug}`}
                                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-[12px] font-bold transition-colors"
                                style={theme.dark
                                  ? { background: "#fff", color: "#1a1a2e" }
                                  : { background: "#1a1a2e", color: "#fff" }}
                              >
                                Learn More <ArrowRight size={11} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Catch-all for any cert with an unrecognised level */}
            {ungrouped.length > 0 && (
              <div>
                <div className="mb-8 pb-4 border-b border-sand-200">
                  <h2 className="text-2xl font-display font-black text-ink-900">Other Certifications</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {ungrouped.map((cert: any) => {
                    const theme = THEMES[cert._themeIdx % THEMES.length];
                    const meta = typeof cert.marketing_meta === "object" && cert.marketing_meta !== null
                      ? cert.marketing_meta : {};
                    const isPopular = meta.is_most_popular === true || cert.popular === true;
                    const price = Number(cert.price);

                    return (
                      <div
                        key={cert.id ?? cert.slug}
                        className="relative rounded-2xl overflow-hidden flex flex-col border transition-shadow hover:shadow-lg"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.dark ? "rgba(255,255,255,0.1)" : "#e5d9c8",
                        }}
                      >
                        <div className="relative h-[100px] overflow-hidden flex-shrink-0">
                          <Shape color={theme.shape} idx={cert._themeIdx} />
                          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                              style={theme.dark
                                ? { background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }
                                : { background: "rgba(255,255,255,0.7)", color: "#1a1a2e", borderColor: "rgba(229,217,200,0.6)" }}
                            >
                              Certification
                            </span>
                            {isPopular && (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500 text-white">
                                Most Popular
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <p
                            className="text-[11px] font-bold uppercase tracking-wider mb-1"
                            style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}
                          >
                            {cert.acronym}®
                          </p>
                          <h3
                            className="font-display font-black text-[16px] leading-snug mb-3"
                            style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}
                          >
                            {cert.title}
                          </h3>
                          <p
                            className="text-[12.5px] leading-relaxed flex-1 mb-4 line-clamp-3"
                            style={{ color: theme.dark ? "rgba(255,255,255,0.85)" : "#1a1a2e" }}
                          >
                            {cert.description}
                          </p>
                          {cert.status === "coming_soon" ? (
                            <div className="mt-auto pt-3 flex items-center justify-between" style={{ borderTop: theme.dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(229,217,200,0.6)" }}>
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500 text-white">
                                Coming Soon
                              </span>
                              <Link
                                href={`/certifications/${cert.slug}`}
                                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-[12px] font-bold transition-colors"
                                style={theme.dark ? { background: "rgba(255,255,255,0.15)", color: "#fff" } : { background: "rgba(26,26,46,0.15)", color: "#1a1a2e" }}
                              >
                                Learn More <ArrowRight size={11} />
                              </Link>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: theme.dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(229,217,200,0.6)" }}>
                              <div className="flex items-center gap-1" style={{ color: theme.dark ? "#fff" : "#1a1a2e" }}>
                                <Award size={12} />
                                <span className="text-[12px] font-bold">
                                  {price === 0 ? "Free" : `$${price.toLocaleString()}`}
                                </span>
                              </div>
                              <Link
                                href={`/certifications/${cert.slug}`}
                                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-[12px] font-bold transition-colors"
                                style={theme.dark
                                  ? { background: "#fff", color: "#1a1a2e" }
                                  : { background: "#1a1a2e", color: "#fff" }}
                              >
                                Learn More <ArrowRight size={11} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

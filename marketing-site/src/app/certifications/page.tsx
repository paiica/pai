import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Certification Programs | Professional Artificial Intelligence Institute",
  description:
    "Globally recognized AI certifications for every career stage — from core professional to domain specialist.",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const GRADIENTS = [
  { from: "#e6d5f7", to: "#c8a8ef" },
  { from: "#cfe8f5", to: "#b0d0ea" },
  { from: "#f0e2cc", to: "#dfc5a0" },
  { from: "#cdf0e2", to: "#a0d8c0" },
  { from: "#f5cfe0", to: "#e8a8c5" },
  { from: "#d0d8f5", to: "#a8b8ee" },
];

function getGradient(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) { h = ((h << 5) - h) + slug.charCodeAt(i); h |= 0; }
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

const LEVEL_GROUPS = [
  { key: "pre_certificate", label: "Pre-Certification", description: "Start your AI journey — no prior experience required." },
  { key: "foundation",      label: "Level 1",           description: "Core credentials for professionals entering the AI field." },
  { key: "advanced",        label: "Level 2",           description: "Advanced specializations for experienced AI practitioners." },
  { key: "executive",       label: "Level 3",           description: "Executive and leadership-level AI credentials." },
];

const LEVEL_LABEL: Record<string, string> = {
  pre_certificate: "Pre-Certification",
  foundation: "Level 1",
  advanced: "Level 2",
  executive: "Level 3",
};

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

function CertCard({ cert }: { cert: any }) {
  const grad = getGradient(cert.slug);
  const meta = typeof cert.marketing_meta === "object" && cert.marketing_meta !== null ? cert.marketing_meta : {};
  const audienceLabel = meta.audience_label || "";
  const isPopular = meta.is_most_popular === true || cert.popular === true;
  const isComingSoon = cert.status === "coming_soon";
  const price = Number(cert.price);

  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-card hover:shadow-card-hover transition-all flex flex-col overflow-hidden">
      <div className="h-40 w-full" style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }} />
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {cert.level && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
              {LEVEL_LABEL[cert.level] ?? cert.level}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 border border-teal-200 bg-teal-50 px-2 py-0.5 rounded-full">
            {cert.acronym}®
          </span>
          {isPopular && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-teal-500 px-2 py-0.5 rounded-full">
              Most Popular
            </span>
          )}
          {isComingSoon && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-ink-700 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="font-display font-black text-ink-900 text-lg leading-snug mb-2">
          {cert.title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1 line-clamp-3">
          {cert.description}
        </p>
        {audienceLabel && (
          <p className="text-xs text-slate-400 mb-5">{audienceLabel}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-sand-100">
          <span className="text-xl font-display font-black text-ink-900">
            {price === 0 ? "Free" : `$${price.toLocaleString()}`}
          </span>
          <Link
            href={`/certifications/${cert.slug}`}
            className="btn-dark !py-2 !px-4 !text-xs flex items-center gap-1"
          >
            Learn More <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function CertificationsListPage() {
  const certs = await getCertifications();

  const groups = LEVEL_GROUPS
    .map((g) => ({ ...g, certs: certs.filter((c: any) => c.level === g.key) }))
    .filter((g) => g.certs.length > 0);

  // Any cert whose level doesn't match the four known groups falls into "Other"
  const knownKeys = new Set(LEVEL_GROUPS.map((g) => g.key));
  const ungrouped = certs.filter((c: any) => !knownKeys.has(c.level));

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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.certs.map((cert: any) => (
                    <CertCard key={cert.id ?? cert.slug} cert={cert} />
                  ))}
                </div>
              </div>
            ))}

            {/* Catch-all for any cert with an unrecognised level */}
            {ungrouped.length > 0 && (
              <div>
                <div className="mb-8 pb-4 border-b border-sand-200">
                  <h2 className="text-2xl font-display font-black text-ink-900">Other Certifications</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ungrouped.map((cert: any) => (
                    <CertCard key={cert.id ?? cert.slug} cert={cert} />
                  ))}
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

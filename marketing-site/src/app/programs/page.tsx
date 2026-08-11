import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/programs`, { cache: "no-store" });
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
    title: cms?.title || "Programs | Professional Artificial Intelligence Institute",
    description: cms?.meta_description || "Multi-course training programs that bundle real-world AI curriculum with a capstone project and a completion credential.",
  };
}

const PROGRAM_THEMES = [
  { dark: true,  bg: "bg-[#0f2a5c]", shapeColor: "#38bdf8" },
  { dark: false, bg: "bg-[#f5f0eb]", shapeColor: "#134e4a" },
  { dark: true,  bg: "bg-[#2d1b69]", shapeColor: "#a78bfa" },
  { dark: false, bg: "bg-[#eaf5ef]", shapeColor: "#059669" },
];

const LEVEL_LABEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

async function getPrograms(): Promise<{ items: any[]; failed: boolean }> {
  try {
    const res = await fetch(`${API}/programs`, { cache: "no-store" });
    if (!res.ok) return { items: [], failed: true };
    const json = await res.json();
    const items: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
    return { items, failed: false };
  } catch {
    return { items: [], failed: true };
  }
}

function ProgramCard({ program, idx }: { program: any; idx: number }) {
  const theme = PROGRAM_THEMES[idx % PROGRAM_THEMES.length];
  const price = Number(program.price);

  return (
    <div className={cn(
      "relative h-[440px] rounded-2xl overflow-hidden flex flex-col border transition-shadow hover:shadow-lg",
      theme.bg, theme.dark ? "border-white/10" : "border-sand-300",
    )}>
      <div className="relative h-[120px] overflow-hidden">
        {program.thumbnail_url ? (
          <>
            <img src={program.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            {/* Legibility gradient behind the badges — a photo's brightness
                varies, unlike the fixed-contrast theme colors it replaces. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-transparent" />
          </>
        ) : (
          <svg className="absolute top-3 right-3 w-32 h-32 opacity-20" viewBox="0 0 100 100">
            <polygon points="50,5 95,35 80,85 20,85 5,35" fill={theme.shapeColor} />
          </svg>
        )}
        <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-[12px] font-semibold px-3 py-1.5 rounded-full border",
            program.thumbnail_url || theme.dark ? "bg-white/10 text-white border-white/20" : "bg-white/70 text-ink-900 border-sand-200/60",
          )}>
            Program
          </span>
          {program.is_featured && (
            <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
              Featured
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <p className={cn("text-[12px] font-semibold mb-1.5", theme.dark ? "text-white" : "text-ink-900")}>
          {LEVEL_LABEL[program.level] || program.level}
          {program.duration_weeks ? ` · ${program.duration_weeks} weeks` : ""}
          {program.course_count ? ` · ${program.course_count} course${program.course_count !== 1 ? "s" : ""}` : ""}
        </p>
        <h3 className={cn("font-display font-black text-[19px] leading-snug mb-3.5", theme.dark ? "text-white" : "text-ink-900")}>
          {program.title}
        </h3>
        <p className={cn("text-[13.5px] leading-relaxed flex-1 mb-6 line-clamp-4", theme.dark ? "text-white" : "text-ink-900")}>
          {program.short_description}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-sm font-bold flex-shrink-0", theme.dark ? "text-white" : "text-ink-900")}>
            {price === 0 ? "Free" : `$${price.toLocaleString()}`}
          </span>
          <Link
            href={`/programs/${program.slug}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-colors",
              theme.dark ? "bg-white text-ink-900 hover:bg-teal-50" : "bg-ink-900 text-white hover:bg-ink-700",
            )}
          >
            Learn More <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ProgramsListPage() {
  const { items: programs, failed } = await getPrograms();
  const cms = await getCmsPage();

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
              style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,145,58,0.9) 1px, transparent 0)", backgroundSize: "48px 48px" }}
            />
            <div className="container-lg relative">
              <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-5">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight size={12} />
                <span className="text-white">Programs</span>
              </div>
              <span className="badge-dark mb-5">Training Programs</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
                Structured Paths to
                <br />
                <span className="text-gradient">AI Mastery.</span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl">
                Multi-course programs that bundle real curriculum with a capstone project — built to take you from
                foundations to a portfolio-ready outcome.
              </p>
            </div>
          </section>
        )}

        <section className="section-padding bg-white">
          <div className="container-lg">
            {failed && (
              <div className="text-center py-20 text-ink-500 text-sm">
                <p className="font-semibold text-ink-700 mb-1">We're having trouble loading programs right now.</p>
                <p>Please refresh the page — if this keeps happening, contact support.</p>
              </div>
            )}
            {!failed && programs.length === 0 && (
              <div className="text-center py-20">
                <BookOpen size={32} className="text-sand-300 mx-auto mb-3" />
                <p className="text-ink-500 text-sm">No programs published yet — check back soon.</p>
              </div>
            )}
            {programs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {programs.map((program: any, idx: number) => (
                  <ProgramCard key={program.id ?? program.slug} program={program} idx={idx} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

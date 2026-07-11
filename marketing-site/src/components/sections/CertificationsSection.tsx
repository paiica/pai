"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const CERT_THEMES = [
  { dark: false, bg: "bg-[#f5f0eb]", shapeColor: "#134e4a", shapeType: "pentagon" },
  { dark: true,  bg: "bg-[#0f2a5c]", shapeColor: "#38bdf8", shapeType: "circle"   },
  { dark: true,  bg: "bg-[#2d1b69]", shapeColor: "#a78bfa", shapeType: "triangle" },
  { dark: false, bg: "bg-[#eaf5ef]", shapeColor: "#059669", shapeType: "pentagon" },
];

const LEVEL_LABEL: Record<string, string> = {
  pre_certificate: "Pre-Certification",
  foundation: "Foundation",
  advanced: "Advanced",
  specialist: "Specialist",
  executive: "Executive",
  other: "Other",
};

type CertCard = {
  acronym: string;
  title: string;
  slug: string;
  level: string;
  description: string;
  popular: string;
  status?: string;
};

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

function CertCardItem({ cert, idx }: { cert: CertCard; idx: number }) {
  const theme = CERT_THEMES[idx % CERT_THEMES.length];
  return (
    <div className={cn(
      "relative flex-shrink-0 w-[85vw] max-w-[330px] h-[500px] rounded-2xl overflow-hidden flex flex-col border",
      theme.bg,
      theme.dark ? "border-white/10" : "border-sand-300"
    )}>
      <div className="relative h-[165px] overflow-hidden">
        <Shape type={theme.shapeType} color={theme.shapeColor} />
        <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-[12px] font-semibold px-3 py-1.5 rounded-full border",
            theme.dark ? "bg-white/10 text-white border-white/20" : "bg-white/70 text-ink-900 border-sand-200/60"
          )}>
            Certification
          </span>
          {cert.status === "coming_soon" ? (
            <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
              Coming Soon
            </span>
          ) : cert.popular === "true" && (
            <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
              Most Popular
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <p className={cn("text-[12px] font-semibold mb-1.5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.level && (LEVEL_LABEL[cert.level] ?? cert.level)}
        </p>
        <p className={cn("text-[12px] font-bold uppercase tracking-wider mb-1.5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.acronym}™
        </p>
        <h3 className={cn("font-display font-black text-[19px] leading-snug mb-3.5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.title}
        </h3>
        <p className={cn("text-[13.5px] leading-relaxed flex-1 mb-6 line-clamp-5", theme.dark ? "text-white" : "text-ink-900")}>
          {cert.description}
        </p>
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
  );
}

export default function CertificationsSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [apiCerts, setApiCerts] = useState<CertCard[] | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/courses/featured`)
      .then((r) => r.json())
      .then((r) => {
        const items: any[] = Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : [];
        setApiCerts(items.map((c: any) => {
          const meta = typeof c.marketing_meta === "object" && c.marketing_meta !== null
            ? c.marketing_meta
            : {};
          return {
            acronym:     c.acronym ?? "",
            title:       c.title ?? "",
            slug:        c.slug ?? "",
            level:       meta.audience_label || c.level || "",
            description: c.description ?? "",
            popular:     meta.is_most_popular ? "true" : "false",
            status:      c.status ?? "active",
          };
        }));
      })
      .catch(() => {});
  }, []);

  const badge          = cmsContent.badge           || "Certification Programs";
  const title          = cmsContent.title           || "Become a";
  const titleHighlight = cmsContent.title_highlight || "certified success";
  const description    = cmsContent.description     || "No matter what your professional goals are, we have a certification to help you reach them. AI credentials are an excellent way to advance your career.";
  const ctaCardTitle   = cmsContent.cta_card_title  || "Not sure where to start?";
  const ctaCardDesc    = cmsContent.cta_card_desc   || "Compare every credential to find the right fit for your goals.";
  const ctaCardLabel   = cmsContent.cta_card_label  || "View All Certifications";
  const ctaCardHref    = cmsContent.cta_card_href   || "/certifications";
  // apiCerts is null before the fetch resolves, then an array (possibly empty).
  // Once the API has responded, use its result exclusively — no fallback to
  // hardcoded defaults, so archived/non-featured certs are never shown.
  const certs: CertCard[] = apiCerts ?? (cmsContent.certs as CertCard[] | undefined) ?? [];

  // Hide section entirely while loading or when no certifications exist
  if (apiCerts === null) return null;
  if (certs.length === 0) return null;

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  }

  return (
    <section className="section-padding bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <span className="badge-teal mb-4">{badge}</span>
            <h2 className="section-title">
              {title}<br />
              <span className="text-gradient">{titleHighlight}</span>
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-ink-900 leading-relaxed mb-5">{description}</p>
            <Link href="/certifications" className="inline-flex items-center gap-1.5 text-ink-900 font-bold text-sm hover:text-ink-900 transition-colors border-b border-ink-300 pb-0.5">
              View All Certifications <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {certs.map((cert, i) => (
            <div key={cert.slug || i} className="snap-start">
              <CertCardItem cert={cert} idx={i} />
            </div>
          ))}

          {/* CTA card */}
          <div className="flex-shrink-0 w-[85vw] max-w-[330px] snap-start">
            <div className="h-[500px] rounded-2xl bg-sand-100 border border-sand-300 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sand-200 flex items-center justify-center mb-5">
                <span className="text-3xl">🎓</span>
              </div>
              <p className="font-display font-black text-ink-900 text-lg mb-2.5">{ctaCardTitle}</p>
              <p className="text-[15px] text-ink-900 mb-6">{ctaCardDesc}</p>
              <Link href={ctaCardHref} className="btn-primary !py-3 !px-6 !text-sm">
                {ctaCardLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-1.5">
            {certs.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-5 bg-ink-700" : "w-1.5 bg-sand-300")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scroll("left")} className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center text-ink-900 hover:text-ink-900 hover:border-ink-300 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll("right")} className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center text-ink-900 hover:text-ink-900 hover:border-ink-300 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

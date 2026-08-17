"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// A deliberately dark, gradient-driven palette rather than flat pastel
// blocks — reads as a premium tech/AI brand instead of a generic course
// catalog, and every stop is far enough from the section's own beige
// background (bg-sand-100) that no card can wash into it. The four hues
// span the spectrum on purpose (blue / teal / violet / amber) so adjacent
// cards never read as "the same color."
export const CERT_THEMES = [
  { dark: true, bg: "bg-gradient-to-br from-[#0a1628] via-[#122242] to-[#1e3a6e]", shapeColor: "#38bdf8", shapeType: "circle"   },
  { dark: true, bg: "bg-gradient-to-br from-[#042f2a] via-[#0a4a41] to-[#0d9488]", shapeColor: "#5eead4", shapeType: "pentagon" },
  { dark: true, bg: "bg-gradient-to-br from-[#180f3d] via-[#2d1b69] to-[#4c1d95]", shapeColor: "#c4b5fd", shapeType: "triangle" },
  { dark: true, bg: "bg-gradient-to-br from-[#241207] via-[#5a2e0d] to-[#92400e]", shapeColor: "#fbbf24", shapeType: "pentagon" },
];

// Maps the certification-level enum to its Certifications-namespace
// translation key — cert.level is sometimes a free-text CMS override
// (marketing_meta.audience_label) instead of one of these enum values, in
// which case it's already the localized string the admin wrote and is
// rendered as-is (no key here will match it, which is intentional).
export const LEVEL_LABEL_KEYS: Record<string, string> = {
  pre_certificate: "levelPreCertificate",
  foundation: "levelFoundation",
  advanced: "levelAdvanced",
  specialist: "levelSpecialist",
  executive: "levelExecutive",
  other: "levelOther",
};

export type CertCard = {
  acronym: string;
  title: string;
  slug: string;
  level: string;
  description: string;
  popular: string;
  status?: string;
  flagship?: boolean;
};

// Each mark is a small layered composition (a solid base + a rotated/offset
// outline echo, at different opacities) rather than one flat shape — reads
// as a more deliberate, modern badge/seal instead of a plain geometric fill.
export function Shape({ type, color }: { type: string; color: string }) {
  const wrap = "absolute top-0 right-0 w-40 h-40 transition-transform duration-300 ease-out group-hover:scale-110";

  if (type === "circle") {
    return (
      <div className={wrap}>
        <div
          className="absolute top-6 right-4 w-28 h-28 rounded-full opacity-[0.28]"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 72%)` }}
        />
        <div
          className="absolute top-1 right-10 w-16 h-16 rounded-full border-2 opacity-40"
          style={{ borderColor: color }}
        />
        <div
          className="absolute top-16 right-1 w-3 h-3 rounded-full opacity-60"
          style={{ background: color }}
        />
      </div>
    );
  }

  if (type === "triangle") {
    return (
      <svg className={wrap} viewBox="0 0 160 160" fill="none">
        <polygon points="160,10 160,140 45,140" fill={color} opacity="0.22" />
        <polygon points="160,45 160,150 60,150" stroke={color} strokeWidth="2" opacity="0.5" />
        <circle cx="118" cy="42" r="4" fill={color} opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg className={wrap} viewBox="0 0 160 160" fill="none">
      <polygon points="95,14 148,52 128,114 62,114 42,52" fill={color} opacity="0.22" />
      <polygon points="98,34 138,63 122,112 74,112 58,63" stroke={color} strokeWidth="2" opacity="0.5" transform="rotate(14 98 73)" />
      <circle cx="112" cy="30" r="4" fill={color} opacity="0.6" />
    </svg>
  );
}

// widthClassName defaults to the homepage carousel's fixed card width — the
// /certifications grid page passes "w-full" instead so the same card fills
// its grid cell, without touching any of the internal visual treatment.
export function CertCardItem({ cert, idx, widthClassName = "flex-shrink-0 w-[85vw] max-w-[312px]" }: { cert: CertCard; idx: number; widthClassName?: string }) {
  const theme = CERT_THEMES[idx % CERT_THEMES.length];
  const t = useTranslations("Certifications");
  const levelKey = cert.level ? LEVEL_LABEL_KEYS[cert.level] : undefined;
  const levelLabel = levelKey ? t(levelKey) : cert.level;
  return (
    <div className={cn("group relative h-[480px] rounded-2xl cursor-pointer", widthClassName)}>
      <div className={cn(
        "relative w-full h-full rounded-2xl overflow-hidden flex flex-col border",
        theme.bg,
        theme.dark ? "border-white/10" : "border-sand-300"
      )}>
        <div className="relative h-[175px] overflow-hidden">
          {/* Background watermark — sits in the open space below the badge
              row, behind the Shape decoration since it's the first child
              and nothing after it uses a negative z-index. Clipped to this
              header zone by its own overflow-hidden. */}
          {cert.flagship && (
            <img
              src={theme.dark ? "/paii.logo.white.png" : "/paii.logo.png"}
              alt=""
              aria-hidden="true"
              className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] max-w-none opacity-[0.12] pointer-events-none select-none"
            />
          )}
          <Shape type={theme.shapeType} color={theme.shapeColor} />
          {cert.flagship && (
            <span className="flagship-pill absolute top-5 right-5 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-teal-700 text-white border-0 flex-shrink-0">
              <Star size={12} fill="currentColor" />
              {t("flagship")}
            </span>
          )}
          <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[12px] font-semibold px-3 py-1.5 rounded-full border bg-transparent",
              theme.dark ? "text-white border-white/40" : "text-ink-900 border-ink-900/30"
            )}>
              {t("badge")}
            </span>
            {cert.status === "coming_soon" ? (
              <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
                {t("comingSoon")}
              </span>
            ) : cert.popular === "true" && (
              <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-teal-500 text-white border-0">
                {t("mostPopular")}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <p className={cn("text-sm font-semibold mb-2", theme.dark ? "text-white" : "text-ink-900")}>
            {levelLabel}
          </p>
          <p className={cn("font-display font-black text-3xl uppercase tracking-wide mb-2 leading-none", theme.dark ? "text-white" : "text-ink-900")}>
            {cert.acronym}<span className="text-xs align-super font-semibold">™</span>
          </p>
          <h3 className={cn("font-display font-bold text-xl leading-snug mb-3.5", theme.dark ? "text-white" : "text-ink-900")}>
            {cert.title}
          </h3>
          <p className={cn("text-[15px] leading-relaxed flex-1 mb-6 line-clamp-5", theme.dark ? "text-white/70" : "text-ink-900/70")}>
            {cert.description}
          </p>
          <Link
            href={`/certifications/${cert.slug}`}
            className={cn(
              // after:inset-0 stretches an invisible hit-target over the whole
              // card. Deliberately NOT `relative` on this link itself — that
              // would make the pseudo-element anchor to the button's own tiny
              // box instead of escaping up to the card (the actual nearest
              // positioned ancestor), which is the whole point of the trick.
              "static inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-colors after:absolute after:inset-0",
              theme.dark ? "bg-white text-ink-900 hover:bg-teal-50" : "bg-ink-900 text-white hover:bg-ink-700"
            )}
          >
            <span className="inline-block origin-left transition-transform duration-200 group-hover:scale-105">{t("learnMore")}</span>
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CertificationsSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const t = useTranslations("Certifications");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [apiCerts, setApiCerts] = useState<CertCard[] | null>(null);
  const locale = useLocale();

  useEffect(() => {
    fetch(`${API_BASE}/courses/featured?lang=${locale}`)
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
            flagship:    !!c.is_flagship,
          };
        }));
      })
      .catch(() => {});
  }, [locale]);

  const badge          = cmsContent.badge           || t("defaultBadge");
  const title          = cmsContent.title           || t("defaultTitle");
  const titleHighlight = cmsContent.title_highlight || t("defaultTitleHighlight");
  const description    = cmsContent.description     || t("defaultDescription");
  const ctaCardTitle   = cmsContent.cta_card_title  || t("defaultCtaCardTitle");
  const ctaCardDesc    = cmsContent.cta_card_desc   || t("defaultCtaCardDesc");
  const ctaCardLabel   = cmsContent.cta_card_label  || t("defaultCtaCardLabel");
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
    // A beige background (rather than white) is what actually separates this
    // section from its white neighbors now, so standard section-padding no
    // longer needs the asymmetric trim it had — the color break does that job.
    <section className="section-padding bg-sand-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <span className="badge-teal mb-4">{badge}</span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-ink-900 tracking-tight">
              {title}
              {/* Stacking each word of the highlight on its own line gives
                  this heading enough height to visually balance against the
                  taller description + link column on the right. */}
              {titleHighlight.split(" ").map((word: string, i: number) => (
                <span key={i} className="text-gradient block">{word}</span>
              ))}
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-ink-900 text-[24px] leading-relaxed mb-5">{description}</p>
            <Link href="/certifications" className="inline-flex items-center gap-1.5 text-ink-900 font-bold text-sm hover:text-ink-900 transition-colors border-b border-ink-300 pb-0.5">
              {t("defaultCtaCardLabel")} <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto overflow-y-hidden pt-2 pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {certs.map((cert, i) => (
            <div key={cert.slug || i} className="snap-start">
              <CertCardItem cert={cert} idx={i} />
            </div>
          ))}

          {/* CTA card */}
          <div className="flex-shrink-0 w-[85vw] max-w-[370px] snap-start">
            <div className="h-[530px] rounded-2xl bg-sand-100 border border-sand-300 flex flex-col items-center justify-center p-8 text-center">
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
            <button onClick={() => scroll("left")} aria-label={t("scrollLeft")} className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center text-ink-900 hover:text-ink-900 hover:border-ink-300 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll("right")} aria-label={t("scrollRight")} className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center text-ink-900 hover:text-ink-900 hover:border-ink-300 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

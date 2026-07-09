"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Award, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDE_ACCENTS = [
  "from-[#0e1e3d] via-[#152e5e] to-[#1e4080]",
  "from-[#0a1628] via-[#0e1e3d] to-[#152e5e]",
  "from-[#12103a] via-[#1a1760] to-[#1e1e80]",
];

const SLIDE_ICONS = [Award, Users, Building2];

type SlideData = {
  image_url?: string;
  video_url?: string;
  badge: string;
  headline: string;
  highlight: string;
  sub: string;
  cta_label: string;
  cta_href: string;
  cta2_label: string;
  cta2_href: string;
  stat1_value: string; stat1_label: string;
  stat2_value: string; stat2_label: string;
  stat3_value: string; stat3_label: string;
  stat4_value: string; stat4_label: string;
};

export default function HeroSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const slides: SlideData[] = (cmsContent?.slides as SlideData[]) ?? [];

  const [current, setCurrent]     = useState(0);
  const [animating, setAnimating] = useState(false);

  const go = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 220);
  }, [animating]);

  const prev = () => go((current - 1 + slides.length) % slides.length);
  const next = useCallback(() => go((current + 1) % slides.length), [current, slides.length, go]);

  useEffect(() => {
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const Icon  = SLIDE_ICONS[current % SLIDE_ICONS.length];

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ paddingTop: "var(--header-height, 88px)" }}
    >

      {/* Backgrounds — one per slide, cross-fade. Video only mounts for the active slide so
          inactive slides don't download/decode video in the background. */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={cn("absolute inset-0 transition-opacity duration-700", i === current ? "opacity-100" : "opacity-0")}
        >
          {s.video_url && i === current ? (
            <>
              <video
                key={s.video_url}
                autoPlay muted loop playsInline
                poster={s.image_url || undefined}
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src={s.video_url} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/60" />
            </>
          ) : s.image_url ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${s.image_url})` }}
              />
              <div className="absolute inset-0 bg-black/60" />
            </>
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", SLIDE_ACCENTS[i % SLIDE_ACCENTS.length])} />
          )}
        </div>
      ))}

      {/* Credential signature — a verification card standing in for the abstract decoration */}
      <div className="absolute right-[6%] top-1/2 -translate-y-1/2 w-[340px] pointer-events-none hidden lg:block">
        <div
          className={cn(
            "relative rounded-2xl border border-teal-400/40 bg-white/[0.04] backdrop-blur-sm p-6 shadow-2xl",
            "transition-opacity duration-700",
          )}
          style={{ transform: "rotate(4deg)" }}
        >
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-mono font-semibold text-teal-300 uppercase tracking-[0.2em]">Verified Credential</span>
            <div className="w-7 h-7 rounded-full border border-teal-400/60 flex items-center justify-center">
              <Icon size={13} className="text-teal-300" />
            </div>
          </div>
          <div className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em] mb-1.5">Professional Artificial Intelligence Institute</div>
          <div className="font-display font-semibold text-2xl text-white mb-6 italic">{slide.badge}</div>
          <div className="flex items-end justify-between pt-4 border-t border-dashed border-white/15">
            <div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em] mb-1">Credential ID</div>
              <div className="text-xs font-mono text-white/70">PAII—2026—{String(current + 1).padStart(4, "0")}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-teal-300">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" /> LIVE
            </div>
          </div>
        </div>
        {/* Stacked card behind, hinting at a registry */}
        <div
          className="absolute inset-0 -z-10 rounded-2xl border border-white/10 bg-white/[0.02]"
          style={{ transform: "rotate(4deg) translate(14px, 14px)" }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex-1 flex flex-col justify-center py-16 lg:py-24">
        <div className={cn("transition-opacity duration-[220ms] max-w-3xl", animating ? "opacity-0" : "opacity-100")}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-teal-300 pl-3 border-l-2 border-teal-400 uppercase tracking-[0.15em] mb-7">
            {slide.badge}
          </div>

          {/* Headline */}
          <h1 className="
            text-4xl sm:text-5xl lg:text-6xl xl:text-7xl
            font-display font-black text-white leading-[1.08] mb-5
            min-h-[90px] sm:min-h-[120px] lg:min-h-[150px] xl:min-h-[190px]
          ">
            {slide.headline}{" "}
            <span className="text-gradient">{slide.highlight}</span>
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-white leading-relaxed max-w-2xl mb-10 min-h-[80px] sm:min-h-[88px]">
            {slide.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
            <Link href={slide.cta_href} className="btn-primary !py-4 !px-8 !text-base gap-2.5">
              {slide.cta_label} <ArrowRight size={16} />
            </Link>
            <Link href={slide.cta2_href} className="inline-flex items-center gap-1.5 text-white text-sm font-semibold transition-colors">
              {slide.cta2_label} →
            </Link>
          </div>

          {/* Stats — only render boxes that actually have content */}
          {(() => {
            const stats = [
              { value: slide.stat1_value, label: slide.stat1_label },
              { value: slide.stat2_value, label: slide.stat2_label },
              { value: slide.stat3_value, label: slide.stat3_label },
              { value: slide.stat4_value, label: slide.stat4_label },
            ].filter(({ value, label }) => value?.trim() && label?.trim());

            if (stats.length === 0) return null;

            return (
              <div className={cn(
                "grid divide-x divide-white/10 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden",
                stats.length === 1 && "grid-cols-1",
                stats.length === 2 && "grid-cols-2",
                stats.length === 3 && "grid-cols-3",
                stats.length === 4 && "grid-cols-2 sm:grid-cols-4",
              )}>
                {stats.map(({ value, label }) => (
                  <div key={label} className="flex flex-col items-center justify-center py-5 px-4">
                    <div className="text-2xl sm:text-3xl font-mono font-semibold text-white">{value}</div>
                    <div className="text-xs text-white mt-1 text-center">{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Slide controls */}
        <div className="flex items-center gap-4 mt-10 max-w-3xl">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === current ? "w-6 h-2 bg-teal-400" : "w-2 h-2 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button onClick={prev} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:border-white/40 transition-colors">
              <ChevronLeft size={17} />
            </button>
            <button onClick={next} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:border-white/40 transition-colors">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="flex-1 max-w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div key={current} className="h-full bg-teal-400 rounded-full animate-hero-progress" />
          </div>
        </div>
      </div>

    </section>
  );
}

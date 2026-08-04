"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDE_ACCENTS = [
  "from-[#0e1e3d] via-[#152e5e] to-[#1e4080]",
  "from-[#0a1628] via-[#0e1e3d] to-[#152e5e]",
  "from-[#12103a] via-[#1a1760] to-[#1e1e80]",
];

type SlideData = {
  image_url?: string;
  video_url?: string;
  image_url_mobile?: string;
  image_position?: string;
  image_position_mobile?: string;
  image_zoom?: number;
  image_zoom_mobile?: number;
  overlay?: boolean;
  align_right?: boolean;
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
    if (slides.length <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <section
      className="relative min-h-[70vh] flex flex-col overflow-hidden"
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
                style={{ objectPosition: s.image_position || "50% 50%" }}
              >
                <source src={s.video_url} type="video/mp4" />
              </video>
              {s.overlay !== false && <div className="absolute inset-0 bg-black/60" />}
            </>
          ) : s.image_url ? (
            <>
              {/* `cover` — full-bleed, never leaves gaps, which is what a hero
                  banner should look like. The trade-off is it crops by however
                  much a given viewer's own window width needs to fill the box
                  (varies per screen, occasionally more on very wide monitors) —
                  the position/zoom controls below (and the separate mobile
                  image/focal point/zoom) are what let an admin choose what stays
                  in frame, rather than leaving it to a `contain` fallback that
                  shows empty letterbox bars instead. Two layers (desktop/mobile)
                  so each breakpoint can use its own image, focal point, and zoom
                  rather than fighting over one `background-image`/
                  `background-position` — image_url_mobile falls back to the
                  desktop image_url when not set. */}
              <div
                className="absolute inset-0 bg-cover bg-no-repeat hidden sm:block"
                style={{
                  backgroundImage: `url("${s.image_url}")`,
                  backgroundPosition: s.image_position || "50% 50%",
                  transform: `scale(${(s.image_zoom ?? 100) / 100})`,
                  transformOrigin: s.image_position || "50% 50%",
                }}
              />
              <div
                className="absolute inset-0 bg-cover bg-no-repeat sm:hidden"
                style={{
                  backgroundImage: `url("${s.image_url_mobile || s.image_url}")`,
                  backgroundPosition: s.image_position_mobile || s.image_position || "50% 50%",
                  transform: `scale(${(s.image_zoom_mobile ?? s.image_zoom ?? 100) / 100})`,
                  transformOrigin: s.image_position_mobile || s.image_position || "50% 50%",
                }}
              />
              {s.overlay !== false && <div className="absolute inset-0 bg-black/60" />}
            </>
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", SLIDE_ACCENTS[i % SLIDE_ACCENTS.length])} />
          )}
        </div>
      ))}

      {/* Content */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex-1 flex flex-col justify-center py-10 lg:py-14">
        <div className={cn(
          "transition-opacity duration-[220ms] max-w-3xl",
          animating ? "opacity-0" : "opacity-100",
          slide.align_right && "ml-auto",
        )}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-teal-300 pl-3 border-l-2 border-teal-400 uppercase tracking-[0.15em] mb-5">
            {slide.badge}
          </div>

          {/* Headline */}
          <h1 className="
            text-4xl sm:text-5xl lg:text-6xl xl:text-7xl
            font-display font-black text-white leading-[1.08] mb-4
            min-h-[80px] sm:min-h-[108px] lg:min-h-[135px] xl:min-h-[165px]
          ">
            {slide.headline}{" "}
            <span className="text-gradient">{slide.highlight}</span>
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-white leading-relaxed max-w-2xl mb-6 min-h-[70px] sm:min-h-[76px]">
            {slide.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
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

        {/* Slide controls — nothing to navigate to with only one slide */}
        {slides.length > 1 && (
          <div className={cn("flex items-center gap-4 mt-6 max-w-3xl", slide.align_right && "ml-auto")}>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === current ? "w-6 h-2 bg-teal-400" : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button onClick={prev} aria-label="Previous slide" className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:border-white/40 transition-colors">
                <ChevronLeft size={17} />
              </button>
              <button onClick={next} aria-label="Next slide" className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:border-white/40 transition-colors">
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="flex-1 max-w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div key={current} className="h-full bg-teal-400 rounded-full animate-hero-progress" />
            </div>
          </div>
        )}
      </div>

    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Quote } from "lucide-react";

type TestimonialItem = { name: string; title: string; company: string; cert: string; avatar: string; rating: string; quote: string };

function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Stars({ rating }: { rating: string }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Number(rating) || 5 }).map((_, j) => (
        <Star key={j} size={14} className="fill-current" />
      ))}
    </div>
  );
}

// The one testimonial most worth reading, given the site's own full-bleed
// dark-card treatment (CertificationsSection's flagship cards, VideoSection's
// dark canvas) — a visual anchor so six identical white cards don't read as
// one undifferentiated block of text.
function FeaturedTestimonial({ item }: { item: TestimonialItem }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#122242] to-[#1e3a6e] p-8 sm:p-12 mb-6 transition-all duration-500 motion-reduce:transition-none"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}
    >
      <Quote size={32} className="text-white/30 mb-5" />
      <p className="font-display text-xl sm:text-2xl text-white leading-snug mb-8 max-w-3xl">
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          {item.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{item.name}</div>
          <div className="text-xs text-white/60">{item.title} · {item.company}</div>
        </div>
        <span className="ms-auto text-xs font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
          {item.cert}
        </span>
        <span className="text-white"><Stars rating={item.rating} /></span>
      </div>
    </div>
  );
}

function TestimonialCard({ item, delay }: { item: TestimonialItem; delay: number }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="break-inside-avoid card-base p-6 mb-5 transition-all duration-500 motion-reduce:transition-none"
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}
    >
      <div className="mb-4 text-ink-900"><Stars rating={item.rating} /></div>
      <Quote size={20} className="text-ink-900 mb-3" />
      <p className="text-sm text-ink-900 leading-relaxed mb-5 italic">&ldquo;{item.quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-ink-800 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          {item.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-900">{item.name}</div>
          <div className="text-xs text-ink-900">{item.title} · {item.company}</div>
        </div>
        <span className="ms-auto text-xs font-bold text-ink-900 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
          {item.cert}
        </span>
      </div>
    </div>
  );
}

export default function TestimonialsSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge    = cmsContent.badge    || "What Professionals Say";
  const title    = cmsContent.title    || "Trusted by Industry Leaders";
  const subtitle = cmsContent.subtitle || "";
  const items: TestimonialItem[] = (cmsContent.items as TestimonialItem[]) ?? [];

  if (items.length === 0) return null;

  const [featured, ...rest] = items;

  return (
    <section className="section-padding bg-sand-50">
      <div className="container-lg">
        <div className="text-center mb-14">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">{title}</h2>
          {subtitle && <p className="section-subtitle max-w-xl mx-auto">{subtitle}</p>}
        </div>

        <FeaturedTestimonial item={featured} />

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {rest.map((t, i) => (
            <TestimonialCard key={i} item={t} delay={(i % 3) * 90} />
          ))}
        </div>
      </div>
    </section>
  );
}

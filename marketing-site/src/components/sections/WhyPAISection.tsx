"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Globe2, BookOpen, Award, TrendingUp, Users2, RefreshCw, Zap, LucideIcon } from "lucide-react";

const PILLAR_ICONS: LucideIcon[] = [Shield, Globe2, BookOpen, Award, TrendingUp, RefreshCw, Users2, Zap];

type Pillar = { title: string; description: string };
type Stat = { value: string; label: string };

function useCountUp(target: string, trigger: boolean): string {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (!trigger) return;
    const match = target.match(/^(.*?)(\d[\d,]*)(.*)$/);
    if (!match) { setDisplay(target); return; }
    const [, prefix, numStr, suffix] = match;
    const num = parseInt(numStr.replace(/,/g, ""), 10);
    if (isNaN(num)) { setDisplay(target); return; }

    const duration = 1400;
    const startTime = performance.now();
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(eased * num);
      setDisplay(prefix + current.toLocaleString() + suffix);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [trigger, target]);

  return display;
}

// Shared by StatCard and PillarCard — both reveal on scroll rather than
// popping in at load, since this section sits mid-scroll (not the hero) and
// a page-load animation would already be long over by the time anyone sees it.
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

function StatCard({ value, label, delay }: Stat & { delay: number }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const display = useCountUp(value, visible);

  return (
    <div
      ref={ref}
      className="text-center transition-all duration-500 motion-reduce:transition-none"
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="font-mono text-3xl sm:text-4xl font-semibold text-teal-700 leading-none mb-2">
        {display}
      </div>
      <div className="text-[11px] font-semibold text-sand-500 uppercase tracking-wide leading-snug">
        {label}
      </div>
    </div>
  );
}

function PillarCard({
  icon: Icon, title, description, delay,
}: {
  icon: LucideIcon; title: string; description: string; delay: number;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="card-hover p-6 group transition-all duration-500 motion-reduce:transition-none"
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-sand-200 text-ink-900 group-hover:scale-110 transition-transform">
        <Icon size={22} />
      </div>
      <h3 className="font-display font-bold text-ink-900 text-base mb-2">{title}</h3>
      <p className="text-sm text-ink-900 leading-relaxed">{description}</p>
    </div>
  );
}

export default function WhyPAISection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge    = cmsContent.badge    || "Why PAII";
  const title    = cmsContent.title    || "The Credential That Opens Doors";
  const subtitle = cmsContent.subtitle || "";
  const pillars: Pillar[] = (cmsContent.pillars as Pillar[]) ?? [];

  const stats: Stat[] = [
    { value: cmsContent.stat1_value, label: cmsContent.stat1_label },
    { value: cmsContent.stat2_value, label: cmsContent.stat2_label },
    { value: cmsContent.stat3_value, label: cmsContent.stat3_label },
    { value: cmsContent.stat4_value, label: cmsContent.stat4_label },
  ].filter((s) => s.value && s.label);

  if (pillars.length === 0) return null;

  return (
    <section className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center mb-10">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">{title}</h2>
          {subtitle && <p className="section-subtitle max-w-2xl mx-auto">{subtitle}</p>}
        </div>

        {/* Proof strip — the credential's numbers, stated once and plainly,
            rather than folded into every pillar's prose below. */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto mb-14 pb-14 border-b border-sand-200">
            {stats.map((s, i) => (
              <StatCard key={i} value={s.value} label={s.label} delay={i * 90} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map(({ title: pTitle, description }, i) => (
            <PillarCard
              key={i}
              icon={PILLAR_ICONS[i % PILLAR_ICONS.length]}
              title={pTitle}
              description={description}
              delay={(i % 4) * 90}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

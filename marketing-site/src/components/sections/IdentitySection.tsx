"use client";

import { useEffect, useRef, useState } from "react";

const PILLAR_COLORS = [
  { border: "#0f766e", icon: "bg-teal-100", dot: "bg-teal-600" },
  { border: "#14b8a6", icon: "bg-teal-50",  dot: "bg-teal-400" },
  { border: "#171527", icon: "bg-ink-50",   dot: "bg-ink-400"  },
  { border: "#948e84", icon: "bg-sand-100", dot: "bg-sand-500" },
];

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

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const display = useCountUp(value, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl border border-sand-300 p-5 text-center shadow-sm hover:shadow-md transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="text-3xl sm:text-4xl font-mono font-semibold leading-none mb-1.5 transition-colors duration-300"
        style={{ color: "#0f766e" }}
      >
        {display}
      </div>
      <div className="text-[11px] font-semibold text-sand-500 uppercase tracking-wide leading-snug">
        {label}
      </div>
    </div>
  );
}

function PillarCard({
  icon, title, desc, idx,
}: {
  icon: string; title: string; desc: string; idx: number;
}) {
  const color = PILLAR_COLORS[idx % PILLAR_COLORS.length];
  return (
    <div
      className="bg-white rounded-2xl border border-sand-300 p-6 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{ borderTop: `4px solid ${color.border}` }}
    >
      <div className={`w-11 h-11 rounded-xl ${color.icon} flex items-center justify-center text-xl flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="font-display font-bold text-ink-900 text-[15px] mb-2">{title}</h3>
        <p className="text-[13px] text-ink-900 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function IdentitySection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  // No admin customization yet — nothing real to show, so don't invent it.
  if (Object.keys(cmsContent).length === 0) return null;

  const badge     = cmsContent.badge     ?? "The AI Credential Standard";
  const headline  = cmsContent.headline  ?? "";
  const highlight = cmsContent.highlight ?? "";
  const body      = cmsContent.body      ?? "";

  const stats = [
    { value: cmsContent.stat_1_value, label: cmsContent.stat_1_label },
    { value: cmsContent.stat_2_value, label: cmsContent.stat_2_label },
    { value: cmsContent.stat_3_value, label: cmsContent.stat_3_label },
    { value: cmsContent.stat_4_value, label: cmsContent.stat_4_label },
  ].filter((s) => s.value && s.label);

  const pillars = [
    { icon: cmsContent.pillar_1_icon, title: cmsContent.pillar_1_title, desc: cmsContent.pillar_1_desc },
    { icon: cmsContent.pillar_2_icon, title: cmsContent.pillar_2_title, desc: cmsContent.pillar_2_desc },
    { icon: cmsContent.pillar_3_icon, title: cmsContent.pillar_3_title, desc: cmsContent.pillar_3_desc },
    { icon: cmsContent.pillar_4_icon, title: cmsContent.pillar_4_title, desc: cmsContent.pillar_4_desc },
  ].filter((p) => p.title && p.desc);

  return (
    <section className="section-padding bg-white border-b border-sand-300">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        {/* Zone 1 — Manifesto + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-20 items-center mb-16">

          {/* Left: Text */}
          <div>
            <span className="badge-teal mb-4">{badge}</span>
            {(headline || highlight) && (
              <h2 className="section-title mb-5">
                {headline}
                <br />
                <span className="text-gradient">{highlight}</span>
              </h2>
            )}
            {body && <p className="text-ink-900 leading-relaxed text-base max-w-lg">{body}</p>}
          </div>

          {/* Right: Stat cards 2×2 */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s, i) => (
                <StatCard key={i} value={s.value} label={s.label} delay={i * 80} />
              ))}
            </div>
          )}
        </div>

        {/* Zone 2 — Pillars */}
        {pillars.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, i) => (
              <PillarCard key={i} icon={p.icon} title={p.title} desc={p.desc} idx={i} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

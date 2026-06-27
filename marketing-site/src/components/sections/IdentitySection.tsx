"use client";

import { useEffect, useRef, useState } from "react";

const PILLAR_COLORS = [
  { border: "#3b82f6", icon: "bg-blue-50",   dot: "bg-blue-400"   },
  { border: "#f59e0b", icon: "bg-amber-50",  dot: "bg-amber-400"  },
  { border: "#a855f7", icon: "bg-purple-50", dot: "bg-purple-400" },
  { border: "#14b8a6", icon: "bg-teal-50",   dot: "bg-teal-400"   },
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
      className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-sm hover:shadow-md transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="text-3xl sm:text-4xl font-black leading-none mb-1.5 transition-colors duration-300"
        style={{ color: "#c9913a" }}
      >
        {display}
      </div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-snug">
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
      className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{ borderTop: `4px solid ${color.border}` }}
    >
      <div className={`w-11 h-11 rounded-xl ${color.icon} flex items-center justify-center text-xl flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="font-display font-black text-slate-900 text-[15px] mb-2">{title}</h3>
        <p className="text-[13px] text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function IdentitySection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge     = cmsContent.badge     ?? "The AI Credential Standard";
  const headline  = cmsContent.headline  ?? "We don’t teach AI.";
  const highlight = cmsContent.highlight ?? "We certify the people trusted to lead it.";
  const body      = cmsContent.body      ?? "Professional AI Institute was founded on a single belief: the world needs a rigorous, globally recognized credential for AI professionals — one built by practitioners, validated by employers, and designed to evolve as fast as the field itself.";

  const stats = [
    { value: cmsContent.stat_1_value ?? "12,400+", label: cmsContent.stat_1_label ?? "Professionals Certified" },
    { value: cmsContent.stat_2_value ?? "48",       label: cmsContent.stat_2_label ?? "Countries Represented" },
    { value: cmsContent.stat_3_value ?? "94%",      label: cmsContent.stat_3_label ?? "Employer Recognition Rate" },
    { value: cmsContent.stat_4_value ?? "#1",       label: cmsContent.stat_4_label ?? "AI Certification Body in Canada" },
  ];

  const pillars = [
    {
      icon:  cmsContent.pillar_1_icon  ?? "🌐",
      title: cmsContent.pillar_1_title ?? "Global Authority",
      desc:  cmsContent.pillar_1_desc  ?? "Recognized by AI-forward employers across 48+ countries. Our credential carries the same weight in Toronto, London, and Singapore.",
    },
    {
      icon:  cmsContent.pillar_2_icon  ?? "🎯",
      title: cmsContent.pillar_2_title ?? "Practitioner-Built",
      desc:  cmsContent.pillar_2_desc  ?? "Every module is created by working AI professionals. No theory for theory’s sake — only what you need to deploy, lead, and decide.",
    },
    {
      icon:  cmsContent.pillar_3_icon  ?? "🔐",
      title: cmsContent.pillar_3_title ?? "Career-Defining",
      desc:  cmsContent.pillar_3_desc  ?? "CAIP holders report accessing roles 35–50% above their previous compensation within 12 months of certification.",
    },
    {
      icon:  cmsContent.pillar_4_icon  ?? "🧠",
      title: cmsContent.pillar_4_title ?? "Perpetually Current",
      desc:  cmsContent.pillar_4_desc  ?? "AI moves fast. Our curriculum team reviews and updates every module quarterly so your credential stays at the frontier.",
    },
  ];

  return (
    <section className="section-padding bg-white border-b border-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        {/* Zone 1 — Manifesto + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-20 items-center mb-16">

          {/* Left: Text */}
          <div>
            <span className="badge-gold mb-4">{badge}</span>
            <h2 className="section-title mb-5">
              {headline}
              <br />
              <span className="text-gradient">{highlight}</span>
            </h2>
            <p className="text-slate-600 leading-relaxed text-base max-w-lg">{body}</p>

            {/* Decorative rule */}
            <div className="flex items-center gap-3 mt-8">
              <div className="h-px w-12 bg-gradient-to-r from-[#c9913a] to-transparent" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Trusted since 2023
              </span>
            </div>
          </div>

          {/* Right: Stat cards 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <StatCard key={i} value={s.value} label={s.label} delay={i * 80} />
            ))}
          </div>
        </div>

        {/* Zone 2 — 4 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p, i) => (
            <PillarCard key={i} icon={p.icon} title={p.title} desc={p.desc} idx={i} />
          ))}
        </div>

      </div>
    </section>
  );
}

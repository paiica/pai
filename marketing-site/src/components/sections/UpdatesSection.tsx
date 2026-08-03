"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type UpdateCard = {
  badge1?: string;
  badge2?: string;
  title: string;
  description: string;
  cta_label?: string;
  cta_href?: string;
  image_url?: string;
};

type UpdateTab = {
  label: string;
  card1: UpdateCard;
  card2: UpdateCard;
};

// Reuses the same gradient family as the certification cards, so a tab
// without a custom image still looks intentional rather than blank.
const CARD_GRADIENTS = [
  "bg-gradient-to-br from-[#0a1628] via-[#122242] to-[#1e3a6e]",
  "bg-gradient-to-br from-[#042f2a] via-[#0a4a41] to-[#0d9488]",
  "bg-gradient-to-br from-[#180f3d] via-[#2d1b69] to-[#4c1d95]",
  "bg-gradient-to-br from-[#241207] via-[#5a2e0d] to-[#92400e]",
];

function BadgePill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors duration-300",
      accent
        ? "border-teal-300 text-teal-700 bg-teal-50 group-hover:border-teal-400 group-hover:bg-teal-100"
        : "border-ink-300 text-ink-900 bg-white/80 group-hover:border-teal-300 group-hover:text-teal-700 group-hover:bg-teal-50"
    )}>
      {children}
    </span>
  );
}

function FeaturedCard({ card, idx }: { card: UpdateCard; idx: number }) {
  const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
  return (
    // The outer box is the actual hover target and never moves — if it moved
    // (e.g. via a translate-y on :hover), lifting it could shift its top edge
    // out from under the cursor and cause a hover/un-hover flicker loop. Only
    // the inner box (badges, copy, background) lifts, driven by group-hover.
    <div className="group relative rounded-2xl cursor-pointer hover:shadow-card-hover transition-shadow duration-300">
      <div
        className={cn("relative rounded-2xl overflow-hidden flex flex-col justify-end min-h-[420px] p-8 transition-transform duration-300 group-hover:-translate-y-1", !card.image_url && gradient)}
        style={card.image_url ? { backgroundImage: `url("${card.image_url}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {card.image_url && <div className="absolute inset-0 bg-black/40" />}
        <div className="relative z-10 flex items-center gap-2 mb-auto flex-wrap">
          {card.badge1 && <BadgePill>{card.badge1}</BadgePill>}
          {card.badge2 && <BadgePill accent>{card.badge2}</BadgePill>}
        </div>
        <div className="relative z-10">
          <h3 className="font-display font-black text-2xl text-white mb-3 leading-snug">{card.title}</h3>
          <p className="text-white/80 text-[15px] leading-relaxed mb-6">{card.description}</p>
          {card.cta_label && (
            <Link
              href={card.cta_href || "#"}
              className="static inline-flex items-center gap-2 w-fit bg-ink-900 text-white font-bold rounded-lg py-3 px-6 text-sm no-underline transition-colors duration-200 after:absolute after:inset-0 group-hover:bg-teal-600"
            >
              <span className="inline-block origin-left transition-transform duration-200 group-hover:scale-105">{card.cta_label}</span>
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SecondaryCard({ card }: { card: UpdateCard }) {
  return (
    <div className="group relative rounded-2xl cursor-pointer hover:shadow-card-hover transition-shadow duration-300">
      <div className="relative rounded-2xl border border-sand-300 bg-white p-8 flex flex-col min-h-[420px] transition-transform duration-300 group-hover:-translate-y-1">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {card.badge1 && <BadgePill>{card.badge1}</BadgePill>}
          {card.badge2 && <BadgePill accent>{card.badge2}</BadgePill>}
        </div>
        <h3 className="font-display font-black text-2xl text-ink-900 mb-3 leading-snug">{card.title}</h3>
        <p className="text-ink-900/70 text-[15px] leading-relaxed mb-6 flex-1">{card.description}</p>
        {card.cta_label && (
          <Link
            href={card.cta_href || "#"}
            className="static inline-flex items-center gap-2 w-fit bg-ink-900 text-white font-bold rounded-lg py-3 px-6 text-sm no-underline transition-colors duration-200 after:absolute after:inset-0 group-hover:bg-teal-600"
          >
            <span className="inline-block origin-left transition-transform duration-200 group-hover:scale-105">{card.cta_label}</span>
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function UpdatesSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge          = cmsContent.badge          || "Resources";
  const title           = cmsContent.title          || "Stay in the Know and";
  const titleHighlight  = cmsContent.title_highlight || "Ahead of the Curve";
  const description     = cmsContent.description     || "AI is moving fast. Use the resources below to keep building your skills and stay ahead of the curve.";
  const tabs: UpdateTab[] = (cmsContent.tabs as UpdateTab[]) ?? [];

  const [active, setActive] = useState(0);
  const [cardHover, setCardHover] = useState(false);

  if (tabs.length === 0) return null;
  const tab = tabs[Math.min(active, tabs.length - 1)];

  return (
    <section className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">
            {title}<br />
            <span className="text-gradient">{titleHighlight}</span>
          </h2>
          <p className="section-subtitle">{description}</p>
        </div>

        {/* Sticks just below the fixed navbar while scrolling through this
            section's cards, matching the reference's sticky tab behavior.
            overflow-y-hidden is deliberate: pairing overflow-x-auto with no
            explicit overflow-y computes the y-axis to auto too (per the CSS
            overflow spec), which was showing a spurious vertical scrollbar
            next to the tabs even though nothing actually overflows vertically. */}
        <div
          className="sticky z-30 bg-white border-b border-sand-300 flex items-center gap-1 mb-10 overflow-x-auto overflow-y-hidden"
          style={{ top: "var(--header-height, 88px)" }}
        >
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors",
                i === active
                  ? cardHover ? "border-teal-500 text-teal-600" : "border-ink-900 text-ink-900"
                  : "border-transparent text-ink-900/50 hover:text-ink-900/80"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          onMouseEnter={() => setCardHover(true)}
          onMouseLeave={() => setCardHover(false)}
        >
          <FeaturedCard card={tab.card1} idx={active} />
          <SecondaryCard card={tab.card2} />
        </div>
      </div>
    </section>
  );
}

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import HeroSection from "@/components/sections/HeroSection";
import IdentitySection from "@/components/sections/IdentitySection";
import WhyPAISection from "@/components/sections/WhyPAISection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import CTASection from "@/components/sections/CTASection";
import LogoStripSection from "@/components/sections/LogoStripSection";
import VideoSection from "@/components/sections/VideoSection";
import PromoBannerSection from "@/components/sections/PromoBannerSection";
import UpdatesSection from "@/components/sections/UpdatesSection";
import CertificationsSection from "@/components/sections/CertificationsSection";
import CoursesSection from "@/components/sections/CoursesSection";
import BlogSection from "@/components/sections/BlogSection";

type StatItem = { value: string; label: string };
type CardItem = { id: string; icon: string; title: string; description: string; href: string };
type UpdateCardSpec = { badge1: string; badge2: string; title: string; description: string; cta_label: string; cta_href: string; image_url: string };

type Block =
  | { id: string; type: "stat_highlights"; stats: StatItem[] }
  | { id: string; type: "cards_grid"; heading: string; cards: CardItem[] }
  | { id: string; type: "cta_banner"; heading: string; subtext: string; button: { label: string; href: string } }
  | { id: string; type: "rich_text"; html: string }
  // ── Reused from the homepage's Page Blocks system — same visual
  // components, but each page gets its own independent instance instead of
  // sharing one global row per type. Simplified admin editing vs. the
  // homepage editor where a type supports something elaborate (e.g. Hero is
  // single-slide here, not a managed multi-slide carousel).
  | { id: string; type: "hero"; image_url: string; video_url: string; overlay: boolean; badge: string; headline: string; highlight: string; sub: string; cta_label: string; cta_href: string; cta2_label: string; cta2_href: string; stats: StatItem[] }
  | { id: string; type: "identity"; badge: string; headline: string; highlight: string; body: string; stats: StatItem[]; pillars: { icon: string; title: string; desc: string }[] }
  | { id: string; type: "why_pai"; badge: string; title: string; subtitle: string; stats: StatItem[]; pillars: { title: string; description: string }[] }
  | { id: string; type: "testimonials"; badge: string; title: string; subtitle: string; items: { name: string; title: string; company: string; cert: string; avatar: string; rating: string; quote: string }[] }
  | { id: string; type: "cta_rich"; badge: string; title: string; highlight: string; subtitle: string; cta_label: string; cta_href: string; cta2_label: string; cta2_href: string; trust_1: string; trust_2: string; trust_3: string }
  | { id: string; type: "logos"; badge: string; title: string; items: { image_url: string; alt: string; href: string; highlighted: boolean }[] }
  | { id: string; type: "video"; title: string; subtitle: string; videos: { url: string; label: string; description: string }[] }
  | { id: string; type: "promo_banner"; image_url: string; title: string; description: string; cta_label: string; cta_href: string; overlay: boolean }
  | { id: string; type: "updates"; badge: string; title: string; title_highlight: string; description: string; tabs: { label: string; card1: UpdateCardSpec; card2: UpdateCardSpec }[] }
  | { id: string; type: "certifications_live"; badge: string; title: string; title_highlight: string; description: string; cta_card_title: string; cta_card_desc: string; cta_card_label: string; cta_card_href: string }
  | { id: string; type: "courses_live"; badge: string; title: string; title_highlight: string; description: string; cta_card_title: string; cta_card_desc: string; cta_card_label: string; cta_card_href: string }
  | { id: string; type: "blog_live"; badge: string; title: string };

// Server-rendered — this whole module only ever runs on the server (no
// interactivity, just Links), so importing every lucide-react icon by name
// here never inflates the client bundle; only the resolved SVG markup ships.
function resolveIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Sparkles;
}

function statsToFlat(stats: StatItem[], prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  stats.slice(0, 4).forEach((s, i) => {
    out[`${prefix}${i + 1}_value`] = s.value;
    out[`${prefix}${i + 1}_label`] = s.label;
  });
  return out;
}

function StatHighlights({ stats }: { stats: StatItem[] }) {
  if (!stats?.length) return null;
  return (
    <div className="container-md py-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 text-center">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-3xl sm:text-4xl font-display font-black text-ink-900">{s.value}</div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardsGrid({ heading, cards }: { heading: string; cards: CardItem[] }) {
  if (!cards?.length) return null;
  return (
    <div className="container-md py-10">
      {heading && <h2 className="text-2xl font-display font-black text-ink-900 mb-6">{heading}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => {
          const Icon = resolveIcon(c.icon);
          const content = (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-card hover:shadow-card-hover transition-all p-5 h-full">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                <Icon size={18} />
              </div>
              <h3 className="font-display font-bold text-ink-900 text-base mb-1.5 leading-snug">{c.title}</h3>
              {c.description && <p className="text-sm text-slate-500 leading-relaxed">{c.description}</p>}
            </div>
          );
          return c.href ? (
            <Link key={c.id} href={c.href} className="block hover:-translate-y-0.5 transition-transform">{content}</Link>
          ) : (
            <div key={c.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

function CtaBanner({ heading, subtext, button }: { heading: string; subtext: string; button: { label: string; href: string } }) {
  if (!heading) return null;
  return (
    <div className="container-md py-6">
      <div className="bg-ink-900 rounded-3xl px-6 sm:px-12 py-10 sm:py-14 text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-2">{heading}</h2>
        {subtext && <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto mb-6">{subtext}</p>}
        {button?.label && button?.href && (
          <Link href={button.href} className="btn-primary !py-3 !px-7 !text-sm inline-flex">{button.label}</Link>
        )}
      </div>
    </div>
  );
}

function RichTextBlock({ html }: { html: string }) {
  if (!html) return null;
  return (
    <div className="container-md py-6">
      <div className="prose prose-slate max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default function PageBlocks({ blocks }: { blocks: Block[] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <div>
      {blocks.map((block) => {
        switch (block.type) {
          case "stat_highlights": return <StatHighlights key={block.id} stats={block.stats} />;
          case "cards_grid": return <CardsGrid key={block.id} heading={block.heading} cards={block.cards} />;
          case "cta_banner": return <CtaBanner key={block.id} heading={block.heading} subtext={block.subtext} button={block.button} />;
          case "rich_text": return <RichTextBlock key={block.id} html={block.html} />;

          case "hero": {
            const slide = { ...block, ...statsToFlat(block.stats ?? [], "stat") };
            return <HeroSection key={block.id} cmsContent={{ slides: [slide] }} />;
          }
          case "identity": {
            const pillarFlat: Record<string, string> = {};
            (block.pillars ?? []).slice(0, 4).forEach((p, i) => {
              pillarFlat[`pillar_${i + 1}_icon`] = p.icon;
              pillarFlat[`pillar_${i + 1}_title`] = p.title;
              pillarFlat[`pillar_${i + 1}_desc`] = p.desc;
            });
            return <IdentitySection key={block.id} cmsContent={{ badge: block.badge, headline: block.headline, highlight: block.highlight, body: block.body, ...statsToFlat(block.stats ?? [], "stat_"), ...pillarFlat }} />;
          }
          case "why_pai":
            return <WhyPAISection key={block.id} cmsContent={{ badge: block.badge, title: block.title, subtitle: block.subtitle, pillars: block.pillars, ...statsToFlat(block.stats ?? [], "stat") }} />;
          case "testimonials":
            return <TestimonialsSection key={block.id} cmsContent={{ badge: block.badge, title: block.title, subtitle: block.subtitle, items: block.items }} />;
          case "cta_rich":
            return <CTASection key={block.id} cmsContent={{ ...block }} />;
          case "logos":
            return <LogoStripSection key={block.id} cmsContent={{ badge: block.badge, title: block.title, items: block.items }} />;
          case "video":
            return <VideoSection key={block.id} cmsContent={{ title: block.title, subtitle: block.subtitle, videos: block.videos }} />;
          case "promo_banner":
            return <PromoBannerSection key={block.id} cmsContent={{ ...block }} />;
          case "updates":
            return <UpdatesSection key={block.id} cmsContent={{ badge: block.badge, title: block.title, title_highlight: block.title_highlight, description: block.description, tabs: block.tabs }} />;
          case "certifications_live":
            return <CertificationsSection key={block.id} cmsContent={{ ...block }} />;
          case "courses_live":
            return <CoursesSection key={block.id} cmsContent={{ ...block }} />;
          case "blog_live":
            return <BlogSection key={block.id} cmsContent={{ badge: block.badge, title: block.title }} />;

          default: return null;
        }
      })}
    </div>
  );
}

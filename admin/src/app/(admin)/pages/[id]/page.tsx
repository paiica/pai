"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronRight, Save, Loader2, Globe, EyeOff, Code2, Eye, ExternalLink, Type, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Sparkles, Plus, Trash2, ChevronUp, ChevronDown, LayoutGrid, BarChart3, Megaphone, FileText, PanelTop, Fingerprint, ShieldCheck, Quote, Video, Award, GraduationCap, Newspaper, Images, LayoutList } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { HeroImageFrame, deleteOldUpload, uploadHeroImage } from "@/components/HeroImageFrame";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  { ssr: false, loading: () => <div className="bg-slate-900 rounded-xl animate-pulse" style={{ height: 560 }} /> },
) as any;

const SITE_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

type Page = {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_published: boolean;
  updated_at: string;
  hero_enabled: boolean;
  hero_badge: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_align: string;
  hero_image_url: string;
  hero_image_position: string;
  hero_image_zoom: number;
  hero_overlay: boolean;
  hero_cta_label: string;
  hero_cta_href: string;
  blocks: Block[];
  translations: Record<string, Record<string, any>>;
};

type Language = { code: string; name: string; native_name: string; is_rtl: boolean };

function previewDoc(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 2rem; font-weight: 900; margin: 0 0 8px; }
    h2 { font-size: 1.25rem; font-weight: 700; margin: 32px 0 12px; }
    h3 { font-size: 1rem; font-weight: 700; margin: 0 0 8px; }
    p  { line-height: 1.7; margin: 0 0 16px; }
    a  { color: #0f172a; }
    ul, ol { padding-left: 20px; }
    li { margin-bottom: 6px; font-size: 14px; line-height: 1.6; }
    section { overflow: hidden; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

// ── Composable content blocks — an ordered list of typed sections rendered
// below the hero, distinct from the single free-form `content` HTML field.
// icon/href/id/type keys are already in the shared stripNonTranslatable()
// regex, so these translate automatically without backend changes per type.
type StatItem = { value: string; label: string };
type CardItem = { id: string; icon: string; title: string; description: string; href: string };
type PillarItem = { icon: string; title: string; desc: string };
type WhyPillarItem = { title: string; description: string };
type TestimonialItem = { name: string; title: string; company: string; cert: string; avatar: string; rating: string; quote: string };
type LogoItem = { image_url: string; alt: string; href: string; highlighted: boolean };
type VideoItem = { url: string; label: string; description: string };
type UpdateCardSpec = { badge1: string; badge2: string; title: string; description: string; cta_label: string; cta_href: string; image_url: string };
type UpdateTabSpec = { label: string; card1: UpdateCardSpec; card2: UpdateCardSpec };

type Block =
  | { id: string; type: "stat_highlights"; stats: StatItem[] }
  | { id: string; type: "cards_grid"; heading: string; cards: CardItem[] }
  | { id: string; type: "cta_banner"; heading: string; subtext: string; button: { label: string; href: string } }
  | { id: string; type: "rich_text"; html: string }
  // ── Mirrors the homepage's global Page Blocks system's 12 rich section
  // types, but scoped per-page instead of one shared global row per type.
  // Forms here are intentionally leaner than the homepage's dedicated
  // editors (e.g. Hero is single-slide, not a managed carousel).
  | { id: string; type: "hero"; image_url: string; video_url: string; overlay: boolean; badge: string; headline: string; highlight: string; sub: string; cta_label: string; cta_href: string; cta2_label: string; cta2_href: string; stats: StatItem[] }
  | { id: string; type: "identity"; badge: string; headline: string; highlight: string; body: string; stats: StatItem[]; pillars: PillarItem[] }
  | { id: string; type: "why_pai"; badge: string; title: string; subtitle: string; stats: StatItem[]; pillars: WhyPillarItem[] }
  | { id: string; type: "testimonials"; badge: string; title: string; subtitle: string; items: TestimonialItem[] }
  | { id: string; type: "cta_rich"; badge: string; title: string; highlight: string; subtitle: string; cta_label: string; cta_href: string; cta2_label: string; cta2_href: string; trust_1: string; trust_2: string; trust_3: string }
  | { id: string; type: "logos"; badge: string; title: string; items: LogoItem[] }
  | { id: string; type: "video"; title: string; subtitle: string; videos: VideoItem[] }
  | { id: string; type: "promo_banner"; image_url: string; title: string; description: string; cta_label: string; cta_href: string; overlay: boolean }
  | { id: string; type: "updates"; badge: string; title: string; title_highlight: string; description: string; tabs: UpdateTabSpec[] }
  | { id: string; type: "certifications_live"; badge: string; title: string; title_highlight: string; description: string; cta_card_title: string; cta_card_desc: string; cta_card_label: string; cta_card_href: string }
  | { id: string; type: "courses_live"; badge: string; title: string; title_highlight: string; description: string; cta_card_title: string; cta_card_desc: string; cta_card_label: string; cta_card_href: string }
  | { id: string; type: "blog_live"; badge: string; title: string };

const BLOCK_TYPE_META: Record<Block["type"], { label: string; icon: any }> = {
  stat_highlights: { label: "Stat Highlights", icon: BarChart3 },
  cards_grid: { label: "Cards Grid", icon: LayoutGrid },
  cta_banner: { label: "CTA Banner", icon: Megaphone },
  rich_text: { label: "Rich Text", icon: FileText },
  hero: { label: "Hero / Banner", icon: PanelTop },
  identity: { label: "Identity", icon: Fingerprint },
  why_pai: { label: "Why PAII", icon: ShieldCheck },
  testimonials: { label: "Testimonials", icon: Quote },
  cta_rich: { label: "Call to Action (Rich)", icon: Megaphone },
  logos: { label: "Logo Strip / Partners", icon: Images },
  video: { label: "Featured Video", icon: Video },
  promo_banner: { label: "Promo Banner (Image)", icon: ImageIcon },
  updates: { label: "Resource Updates (Tabs)", icon: LayoutList },
  certifications_live: { label: "Certifications (Live)", icon: Award },
  courses_live: { label: "Prep Courses (Live)", icon: GraduationCap },
  blog_live: { label: "Latest Articles (Live)", icon: Newspaper },
};

function newBlockId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `b${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlock(type: Block["type"]): Block {
  switch (type) {
    case "stat_highlights":
      return { id: newBlockId(), type, stats: [{ value: "", label: "" }] };
    case "cards_grid":
      return { id: newBlockId(), type, heading: "", cards: [{ id: newBlockId(), icon: "Sparkles", title: "", description: "", href: "" }] };
    case "cta_banner":
      return { id: newBlockId(), type, heading: "", subtext: "", button: { label: "", href: "" } };
    case "rich_text":
      return { id: newBlockId(), type, html: "" };
    case "hero":
      return { id: newBlockId(), type, image_url: "", video_url: "", overlay: true, badge: "", headline: "", highlight: "", sub: "", cta_label: "", cta_href: "", cta2_label: "", cta2_href: "", stats: [] };
    case "identity":
      return { id: newBlockId(), type, badge: "", headline: "", highlight: "", body: "", stats: [], pillars: [] };
    case "why_pai":
      return { id: newBlockId(), type, badge: "", title: "", subtitle: "", stats: [], pillars: [{ title: "", description: "" }] };
    case "testimonials":
      return { id: newBlockId(), type, badge: "", title: "", subtitle: "", items: [{ name: "", title: "", company: "", cert: "", avatar: "", rating: "5", quote: "" }] };
    case "cta_rich":
      return { id: newBlockId(), type, badge: "", title: "", highlight: "", subtitle: "", cta_label: "", cta_href: "", cta2_label: "", cta2_href: "", trust_1: "", trust_2: "", trust_3: "" };
    case "logos":
      return { id: newBlockId(), type, badge: "", title: "", items: [{ image_url: "", alt: "", href: "", highlighted: false }] };
    case "video":
      return { id: newBlockId(), type, title: "", subtitle: "", videos: [{ url: "", label: "", description: "" }] };
    case "promo_banner":
      return { id: newBlockId(), type, image_url: "", title: "", description: "", cta_label: "", cta_href: "", overlay: true };
    case "updates":
      return { id: newBlockId(), type, badge: "", title: "", title_highlight: "", description: "", tabs: [{ label: "Tab 1", card1: { badge1: "", badge2: "", title: "", description: "", cta_label: "", cta_href: "", image_url: "" }, card2: { badge1: "", badge2: "", title: "", description: "", cta_label: "", cta_href: "", image_url: "" } }] };
    case "certifications_live":
      return { id: newBlockId(), type, badge: "", title: "", title_highlight: "", description: "", cta_card_title: "", cta_card_desc: "", cta_card_label: "", cta_card_href: "" };
    case "courses_live":
      return { id: newBlockId(), type, badge: "", title: "", title_highlight: "", description: "", cta_card_title: "", cta_card_desc: "", cta_card_label: "", cta_card_href: "" };
    case "blog_live":
      return { id: newBlockId(), type, badge: "", title: "" };
  }
}

function StatsFields({ stats, onChange, max = 4 }: { stats: StatItem[]; onChange: (stats: StatItem[]) => void; max?: number }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Stats <span className="font-normal normal-case">(up to {max}, optional)</span></p>
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className="input-base !py-1.5 text-sm w-28" placeholder="3,200+" value={s.value}
            onChange={(e) => onChange(stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
          <input className="input-base !py-1.5 text-sm flex-1" placeholder="Certified professionals" value={s.label}
            onChange={(e) => onChange(stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
          <button onClick={() => onChange(stats.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      {stats.length < max && (
        <button onClick={() => onChange([...stats, { value: "", label: "" }])} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
          <Plus size={11} /> Add stat
        </button>
      )}
    </div>
  );
}

function UpdateCardFields({ card, label, onChange }: { card: UpdateCardSpec; label: string; onChange: (patch: Partial<UpdateCardSpec>) => void }) {
  return (
    <div className="space-y-1.5 bg-white rounded-lg border border-slate-200 p-2.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        <input className="input-base !py-1 text-[11px]" placeholder="Badge 1" value={card.badge1} onChange={(e) => onChange({ badge1: e.target.value })} />
        <input className="input-base !py-1 text-[11px]" placeholder="Badge 2" value={card.badge2} onChange={(e) => onChange({ badge2: e.target.value })} />
      </div>
      <input className="input-base !py-1 text-[11px]" placeholder="Title" value={card.title} onChange={(e) => onChange({ title: e.target.value })} />
      <textarea className="input-base !py-1 text-[11px] resize-none h-10" placeholder="Description" value={card.description} onChange={(e) => onChange({ description: e.target.value })} />
      <div className="grid grid-cols-2 gap-1.5">
        <input className="input-base !py-1 text-[11px]" placeholder="CTA label" value={card.cta_label} onChange={(e) => onChange({ cta_label: e.target.value })} />
        <input className="input-base !py-1 text-[11px]" placeholder="CTA link" value={card.cta_href} onChange={(e) => onChange({ cta_href: e.target.value })} />
      </div>
      <input className="input-base !py-1 text-[11px]" placeholder="Image URL (optional — gradient if blank)" value={card.image_url} onChange={(e) => onChange({ image_url: e.target.value })} />
    </div>
  );
}

function BlockEditorCard({
  block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  block: Block; onChange: (patch: Partial<Block>) => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const meta = BLOCK_TYPE_META[block.type];
  const Icon = meta.icon;

  return (
    <div className="card p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-navy-900 uppercase tracking-widest">
          <Icon size={13} className="text-slate-400" /> {meta.label}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={isFirst} title="Move up" className="p-1 text-slate-400 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed rounded"><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={isLast} title="Move down" className="p-1 text-slate-400 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed rounded"><ChevronDown size={14} /></button>
          <button onClick={onRemove} title="Remove block" className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
        </div>
      </div>

      {block.type === "stat_highlights" && (
        <div className="space-y-2">
          {block.stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input-base !py-1.5 text-sm w-28" placeholder="92%" value={s.value}
                onChange={(e) => onChange({ stats: block.stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x) } as Partial<Block>)} />
              <input className="input-base !py-1.5 text-sm flex-1" placeholder="Pass rate" value={s.label}
                onChange={(e) => onChange({ stats: block.stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } as Partial<Block>)} />
              <button onClick={() => onChange({ stats: block.stats.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => onChange({ stats: [...block.stats, { value: "", label: "" }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
            <Plus size={11} /> Add stat
          </button>
        </div>
      )}

      {block.type === "cards_grid" && (
        <div className="space-y-3">
          <input className="input-base !py-1.5 text-sm" placeholder="Section heading (optional)" value={block.heading}
            onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)} />
          {block.cards.map((c, i) => (
            <div key={c.id} className="card p-3 space-y-2 bg-slate-50/60 border-slate-200">
              <div className="flex gap-2">
                <input className="input-base !py-1.5 text-xs w-32 flex-shrink-0" placeholder="Icon (lucide name)" value={c.icon}
                  onChange={(e) => onChange({ cards: block.cards.map((x, j) => j === i ? { ...x, icon: e.target.value } : x) } as Partial<Block>)} />
                <input className="input-base !py-1.5 text-sm flex-1" placeholder="Title" value={c.title}
                  onChange={(e) => onChange({ cards: block.cards.map((x, j) => j === i ? { ...x, title: e.target.value } : x) } as Partial<Block>)} />
                <button onClick={() => onChange({ cards: block.cards.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
              </div>
              <textarea className="input-base !py-1.5 text-xs resize-none h-14" placeholder="Description" value={c.description}
                onChange={(e) => onChange({ cards: block.cards.map((x, j) => j === i ? { ...x, description: e.target.value } : x) } as Partial<Block>)} />
              <input className="input-base !py-1.5 text-xs" placeholder="/link (optional)" value={c.href}
                onChange={(e) => onChange({ cards: block.cards.map((x, j) => j === i ? { ...x, href: e.target.value } : x) } as Partial<Block>)} />
            </div>
          ))}
          <button onClick={() => onChange({ cards: [...block.cards, { id: newBlockId(), icon: "Sparkles", title: "", description: "", href: "" }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
            <Plus size={11} /> Add card
          </button>
        </div>
      )}

      {block.type === "cta_banner" && (
        <div className="space-y-2">
          <input className="input-base !py-1.5 text-sm" placeholder="Heading" value={block.heading} onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)} />
          <textarea className="input-base !py-1.5 text-xs resize-none h-14" placeholder="Subtext (optional)" value={block.subtext} onChange={(e) => onChange({ subtext: e.target.value } as Partial<Block>)} />
          <div className="flex gap-2">
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="Button label" value={block.button.label}
              onChange={(e) => onChange({ button: { ...block.button, label: e.target.value } } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="Button link" value={block.button.href}
              onChange={(e) => onChange({ button: { ...block.button, href: e.target.value } } as Partial<Block>)} />
          </div>
        </div>
      )}

      {block.type === "rich_text" && (
        <textarea className="input-base font-mono text-xs h-40 resize-y" placeholder="<p>Arbitrary HTML for this section…</p>" value={block.html}
          onChange={(e) => onChange({ html: e.target.value } as Partial<Block>)} />
      )}

      {block.type === "hero" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-xs" placeholder="Background image URL" value={block.image_url}
              onChange={(e) => onChange({ image_url: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-xs" placeholder="Background video URL (optional)" value={block.video_url}
              onChange={(e) => onChange({ video_url: e.target.value } as Partial<Block>)} />
          </div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer w-fit">
            <input type="checkbox" checked={block.overlay} onChange={(e) => onChange({ overlay: e.target.checked } as Partial<Block>)} className="rounded border-slate-300" />
            Dark overlay
          </label>
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Headline" value={block.headline} onChange={(e) => onChange({ headline: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Highlight (gradient part)" value={block.highlight} onChange={(e) => onChange({ highlight: e.target.value } as Partial<Block>)} />
          </div>
          <textarea className="input-base !py-1.5 text-xs resize-none h-14" placeholder="Subtext" value={block.sub} onChange={(e) => onChange({ sub: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Primary button label" value={block.cta_label} onChange={(e) => onChange({ cta_label: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Primary button link" value={block.cta_href} onChange={(e) => onChange({ cta_href: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Secondary button label (optional)" value={block.cta2_label} onChange={(e) => onChange({ cta2_label: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Secondary button link (optional)" value={block.cta2_href} onChange={(e) => onChange({ cta2_href: e.target.value } as Partial<Block>)} />
          </div>
          <StatsFields stats={block.stats} onChange={(stats) => onChange({ stats } as Partial<Block>)} />
        </div>
      )}

      {block.type === "identity" && (
        <div className="space-y-3">
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Headline" value={block.headline} onChange={(e) => onChange({ headline: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Highlight (gradient part)" value={block.highlight} onChange={(e) => onChange({ highlight: e.target.value } as Partial<Block>)} />
          </div>
          <textarea className="input-base !py-1.5 text-xs resize-none h-16" placeholder="Body" value={block.body} onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)} />
          <StatsFields stats={block.stats} onChange={(stats) => onChange({ stats } as Partial<Block>)} />
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Pillars <span className="font-normal normal-case">(up to 4)</span></p>
            {block.pillars.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input className="input-base !py-1.5 text-sm w-14 text-center flex-shrink-0" placeholder="🌐" value={p.icon}
                  onChange={(e) => onChange({ pillars: block.pillars.map((x, j) => j === i ? { ...x, icon: e.target.value } : x) } as Partial<Block>)} />
                <div className="flex-1 space-y-1.5">
                  <input className="input-base !py-1.5 text-sm" placeholder="Title" value={p.title}
                    onChange={(e) => onChange({ pillars: block.pillars.map((x, j) => j === i ? { ...x, title: e.target.value } : x) } as Partial<Block>)} />
                  <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="Description" value={p.desc}
                    onChange={(e) => onChange({ pillars: block.pillars.map((x, j) => j === i ? { ...x, desc: e.target.value } : x) } as Partial<Block>)} />
                </div>
                <button onClick={() => onChange({ pillars: block.pillars.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
            {block.pillars.length < 4 && (
              <button onClick={() => onChange({ pillars: [...block.pillars, { icon: "", title: "", desc: "" }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
                <Plus size={11} /> Add pillar
              </button>
            )}
          </div>
        </div>
      )}

      {block.type === "why_pai" && (
        <div className="space-y-3">
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <input className="input-base !py-1.5 text-sm" placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
          <textarea className="input-base !py-1.5 text-xs resize-none h-14" placeholder="Subtitle" value={block.subtitle} onChange={(e) => onChange({ subtitle: e.target.value } as Partial<Block>)} />
          <StatsFields stats={block.stats} onChange={(stats) => onChange({ stats } as Partial<Block>)} />
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Pillars <span className="font-normal normal-case">(icon auto-assigned)</span></p>
            {block.pillars.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <input className="input-base !py-1.5 text-sm" placeholder="Title" value={p.title}
                    onChange={(e) => onChange({ pillars: block.pillars.map((x, j) => j === i ? { ...x, title: e.target.value } : x) } as Partial<Block>)} />
                  <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="Description" value={p.description}
                    onChange={(e) => onChange({ pillars: block.pillars.map((x, j) => j === i ? { ...x, description: e.target.value } : x) } as Partial<Block>)} />
                </div>
                <button onClick={() => onChange({ pillars: block.pillars.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => onChange({ pillars: [...block.pillars, { title: "", description: "" }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
              <Plus size={11} /> Add pillar
            </button>
          </div>
        </div>
      )}

      {block.type === "testimonials" && (
        <div className="space-y-3">
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <input className="input-base !py-1.5 text-sm" placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
          <input className="input-base !py-1.5 text-sm" placeholder="Subtitle" value={block.subtitle} onChange={(e) => onChange({ subtitle: e.target.value } as Partial<Block>)} />
          <div className="space-y-2">
            {block.items.map((t, i) => (
              <div key={i} className="card p-3 space-y-2 bg-slate-50/60 border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-base !py-1.5 text-xs" placeholder="Name" value={t.name}
                    onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } as Partial<Block>)} />
                  <input className="input-base !py-1.5 text-xs" placeholder="Initials (avatar)" value={t.avatar}
                    onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, avatar: e.target.value } : x) } as Partial<Block>)} />
                  <input className="input-base !py-1.5 text-xs" placeholder="Job title" value={t.title}
                    onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, title: e.target.value } : x) } as Partial<Block>)} />
                  <input className="input-base !py-1.5 text-xs" placeholder="Company" value={t.company}
                    onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, company: e.target.value } : x) } as Partial<Block>)} />
                  <input className="input-base !py-1.5 text-xs" placeholder="Certification (e.g. CAIP)" value={t.cert}
                    onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, cert: e.target.value } : x) } as Partial<Block>)} />
                  <input className="input-base !py-1.5 text-xs" placeholder="Rating (1-5)" value={t.rating}
                    onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, rating: e.target.value } : x) } as Partial<Block>)} />
                </div>
                <textarea className="input-base !py-1.5 text-xs resize-none h-16" placeholder="Quote" value={t.quote}
                  onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, quote: e.target.value } : x) } as Partial<Block>)} />
                <button onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) } as Partial<Block>)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
              </div>
            ))}
            <button onClick={() => onChange({ items: [...block.items, { name: "", title: "", company: "", cert: "", avatar: "", rating: "5", quote: "" }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
              <Plus size={11} /> Add testimonial
            </button>
          </div>
        </div>
      )}

      {block.type === "cta_rich" && (
        <div className="space-y-2">
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Highlight (gradient part)" value={block.highlight} onChange={(e) => onChange({ highlight: e.target.value } as Partial<Block>)} />
          </div>
          <textarea className="input-base !py-1.5 text-xs resize-none h-14" placeholder="Subtitle" value={block.subtitle} onChange={(e) => onChange({ subtitle: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Primary button label" value={block.cta_label} onChange={(e) => onChange({ cta_label: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Primary button link" value={block.cta_href} onChange={(e) => onChange({ cta_href: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Secondary button label" value={block.cta2_label} onChange={(e) => onChange({ cta2_label: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Secondary button link" value={block.cta2_href} onChange={(e) => onChange({ cta2_href: e.target.value } as Partial<Block>)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="input-base !py-1.5 text-xs" placeholder="Trust badge 1" value={block.trust_1} onChange={(e) => onChange({ trust_1: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-xs" placeholder="Trust badge 2" value={block.trust_2} onChange={(e) => onChange({ trust_2: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-xs" placeholder="Trust badge 3" value={block.trust_3} onChange={(e) => onChange({ trust_3: e.target.value } as Partial<Block>)} />
          </div>
        </div>
      )}

      {block.type === "logos" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Badge (optional)" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Title (optional)" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
          </div>
          <div className="space-y-2">
            {block.items.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input-base !py-1.5 text-xs flex-1" placeholder="Logo image URL" value={l.image_url}
                  onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x) } as Partial<Block>)} />
                <input className="input-base !py-1.5 text-xs w-28" placeholder="Alt text" value={l.alt}
                  onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, alt: e.target.value } : x) } as Partial<Block>)} />
                <input className="input-base !py-1.5 text-xs w-28" placeholder="Link (optional)" value={l.href}
                  onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, href: e.target.value } : x) } as Partial<Block>)} />
                <label className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0" title="Highlight with accent border">
                  <input type="checkbox" checked={l.highlighted} onChange={(e) => onChange({ items: block.items.map((x, j) => j === i ? { ...x, highlighted: e.target.checked } : x) } as Partial<Block>)} className="rounded border-slate-300" />
                </label>
                <button onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => onChange({ items: [...block.items, { image_url: "", alt: "", href: "", highlighted: false }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
              <Plus size={11} /> Add logo
            </button>
          </div>
        </div>
      )}

      {block.type === "video" && (
        <div className="space-y-3">
          <input className="input-base !py-1.5 text-sm" placeholder="Section title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
          <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="Subtitle" value={block.subtitle} onChange={(e) => onChange({ subtitle: e.target.value } as Partial<Block>)} />
          <div className="space-y-2">
            {block.videos.map((v, i) => (
              <div key={i} className="card p-3 space-y-2 bg-slate-50/60 border-slate-200">
                <input className="input-base !py-1.5 text-xs" placeholder="YouTube / Vimeo / video file URL" value={v.url}
                  onChange={(e) => onChange({ videos: block.videos.map((x, j) => j === i ? { ...x, url: e.target.value } : x) } as Partial<Block>)} />
                <div className="flex gap-2">
                  <input className="input-base !py-1.5 text-xs flex-1" placeholder="Label" value={v.label}
                    onChange={(e) => onChange({ videos: block.videos.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } as Partial<Block>)} />
                  <button onClick={() => onChange({ videos: block.videos.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
                </div>
                <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="Description" value={v.description}
                  onChange={(e) => onChange({ videos: block.videos.map((x, j) => j === i ? { ...x, description: e.target.value } : x) } as Partial<Block>)} />
              </div>
            ))}
            <button onClick={() => onChange({ videos: [...block.videos, { url: "", label: "", description: "" }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
              <Plus size={11} /> Add video
            </button>
          </div>
        </div>
      )}

      {block.type === "promo_banner" && (
        <div className="space-y-2">
          <input className="input-base !py-1.5 text-xs" placeholder="Background image URL" value={block.image_url} onChange={(e) => onChange({ image_url: e.target.value } as Partial<Block>)} />
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer w-fit">
            <input type="checkbox" checked={block.overlay} onChange={(e) => onChange({ overlay: e.target.checked } as Partial<Block>)} className="rounded border-slate-300" />
            Dark overlay
          </label>
          <input className="input-base !py-1.5 text-sm" placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
          <textarea className="input-base !py-1.5 text-xs resize-none h-14" placeholder="Description" value={block.description} onChange={(e) => onChange({ description: e.target.value } as Partial<Block>)} />
          <div className="flex gap-2">
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="Button label" value={block.cta_label} onChange={(e) => onChange({ cta_label: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="Button link" value={block.cta_href} onChange={(e) => onChange({ cta_href: e.target.value } as Partial<Block>)} />
          </div>
        </div>
      )}

      {block.type === "updates" && (
        <div className="space-y-3">
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Title highlight" value={block.title_highlight} onChange={(e) => onChange({ title_highlight: e.target.value } as Partial<Block>)} />
          </div>
          <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="Description" value={block.description} onChange={(e) => onChange({ description: e.target.value } as Partial<Block>)} />
          <div className="space-y-3">
            {block.tabs.map((tab, i) => (
              <div key={i} className="card p-3 space-y-2 bg-slate-50/60 border-slate-200">
                <div className="flex items-center gap-2">
                  <input className="input-base !py-1.5 text-xs flex-1" placeholder="Tab label" value={tab.label}
                    onChange={(e) => onChange({ tabs: block.tabs.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } as Partial<Block>)} />
                  <button onClick={() => onChange({ tabs: block.tabs.filter((_, j) => j !== i) } as Partial<Block>)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <UpdateCardFields card={tab.card1} label="Featured card"
                    onChange={(patch) => onChange({ tabs: block.tabs.map((x, j) => j === i ? { ...x, card1: { ...x.card1, ...patch } } : x) } as Partial<Block>)} />
                  <UpdateCardFields card={tab.card2} label="Secondary card"
                    onChange={(patch) => onChange({ tabs: block.tabs.map((x, j) => j === i ? { ...x, card2: { ...x.card2, ...patch } } : x) } as Partial<Block>)} />
                </div>
              </div>
            ))}
            <button onClick={() => onChange({ tabs: [...block.tabs, { label: `Tab ${block.tabs.length + 1}`, card1: { badge1: "", badge2: "", title: "", description: "", cta_label: "", cta_href: "", image_url: "" }, card2: { badge1: "", badge2: "", title: "", description: "", cta_label: "", cta_href: "", image_url: "" } }] } as Partial<Block>)} className="text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1">
              <Plus size={11} /> Add tab
            </button>
          </div>
        </div>
      )}

      {(block.type === "certifications_live" || block.type === "courses_live") && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 -mt-1">
            {block.type === "certifications_live"
              ? "Certification cards are pulled live from the Certifications catalog — only the section text below is editable here."
              : "Course cards are pulled live from the Prep Courses catalog — only the section text below is editable here."}
          </p>
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-base !py-1.5 text-sm" placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm" placeholder="Title highlight" value={block.title_highlight} onChange={(e) => onChange({ title_highlight: e.target.value } as Partial<Block>)} />
          </div>
          <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="Description" value={block.description} onChange={(e) => onChange({ description: e.target.value } as Partial<Block>)} />
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1">Trailing CTA card</p>
          <input className="input-base !py-1.5 text-sm" placeholder="CTA card title" value={block.cta_card_title} onChange={(e) => onChange({ cta_card_title: e.target.value } as Partial<Block>)} />
          <textarea className="input-base !py-1.5 text-xs resize-none h-12" placeholder="CTA card description" value={block.cta_card_desc} onChange={(e) => onChange({ cta_card_desc: e.target.value } as Partial<Block>)} />
          <div className="flex gap-2">
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="CTA card button label" value={block.cta_card_label} onChange={(e) => onChange({ cta_card_label: e.target.value } as Partial<Block>)} />
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="CTA card button link" value={block.cta_card_href} onChange={(e) => onChange({ cta_card_href: e.target.value } as Partial<Block>)} />
          </div>
        </div>
      )}

      {block.type === "blog_live" && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 -mt-1">Article cards are pulled live from the Blog — only the section text below is editable here.</p>
          <input className="input-base !py-1.5 text-sm" placeholder="Badge" value={block.badge} onChange={(e) => onChange({ badge: e.target.value } as Partial<Block>)} />
          <input className="input-base !py-1.5 text-sm" placeholder="Section title" value={block.title} onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)} />
        </div>
      )}
    </div>
  );
}

function BlocksEditor({ blocks, setBlocks }: { blocks: Block[]; setBlocks: (b: Block[]) => void }) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }
  function removeBlock(id: string) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }
  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  }
  function addBlock(type: Block["type"]) {
    setBlocks([...blocks, makeBlock(type)]);
    setShowAddMenu(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content Blocks</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Composed sections rendered below the hero, above the free-form content below.</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowAddMenu((v) => !v)} className="btn-outline !py-1.5 !px-3 !text-xs">
            <Plus size={12} /> Add Block
          </button>
          {showAddMenu && (
            <div className="absolute end-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden py-1">
              {(Object.keys(BLOCK_TYPE_META) as Block["type"][]).map((type) => {
                const meta = BLOCK_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <button key={type} onClick={() => addBlock(type)} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <Icon size={13} className="text-slate-400" /> {meta.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No blocks yet — add one above to compose this page's sections.</p>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <BlockEditorCard
              key={block.id}
              block={block}
              onChange={(patch) => updateBlock(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
              onMoveUp={() => moveBlock(i, -1)}
              onMoveDown={() => moveBlock(i, 1)}
              isFirst={i === 0}
              isLast={i === blocks.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, refreshTokens } = useAuthStore();

  const { data, error, isLoading } = useSWR(
    accessToken ? ["/pages", accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    }
  );

  const allPages: Page[] = data?.data ?? data ?? [];
  const page = allPages.find((p) => p.id === id);

  const { data: languagesData } = useSWR<Language[]>(
    accessToken ? ["/languages", accessToken] : null,
    ([url, token]: [string, string]) => api.get<any>(url, token).then((r: any) => r.data ?? r)
  );
  const languages = languagesData ?? [];

  const [activeLocale, setActiveLocale] = useState("en");
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, Record<string, any>>>({});
  const [translationsInitialized, setTranslationsInitialized] = useState(false);
  const [savingTranslation, setSavingTranslation] = useState<string | null>(null);
  const [retranslating, setRetranslating] = useState<string | null>(null);

  useEffect(() => {
    if (page && !translationsInitialized) {
      setTranslationDrafts(page.translations ?? {});
      setTranslationsInitialized(true);
    }
  }, [page, translationsInitialized]);

  function getTranslatedField(locale: string, field: string): string {
    return translationDrafts[locale]?.[field] ?? "";
  }

  function setTranslatedField(locale: string, field: string, value: string) {
    setTranslationDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  }

  async function saveTranslation(locale: string) {
    setSavingTranslation(locale);
    try {
      let token = accessToken!;
      const fields = translationDrafts[locale] ?? {};
      try {
        await api.patch(`/translations/page/${id}?locale=${locale}`, { fields }, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/translations/page/${id}?locale=${locale}`, { fields }, token);
        } else throw err;
      }
      toast.success("Translation saved");
    } catch {
      toast.error("Failed to save translation");
    } finally {
      setSavingTranslation(null);
    }
  }

  async function retranslate(locale: string) {
    setRetranslating(locale);
    try {
      let token = accessToken!;
      let res: any;
      try {
        res = await api.post<any>(`/translations/page/${id}?locale=${locale}`, {}, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          res = await api.post<any>(`/translations/page/${id}?locale=${locale}`, {}, token);
        } else throw err;
      }
      const updated = res?.data ?? res;
      setTranslationDrafts((prev) => ({ ...prev, [locale]: updated?.translations?.[locale] ?? {} }));
      toast.success("Translated with AI — review and save");
    } catch {
      toast.error("Translation failed");
    } finally {
      setRetranslating(null);
    }
  }

  const [title,           setTitle]           = useState("");
  const [slug,            setSlug]            = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [content,         setContent]         = useState("");
  const [blocks,          setBlocks]          = useState<Block[]>([]);
  const [isPublished,     setIsPublished]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [initialized,     setInitialized]     = useState(false);
  const [activeTab,       setActiveTab]       = useState<"editor" | "edit" | "preview">("editor");
  const editableRef = useRef<HTMLDivElement>(null);

  // ── Hero ──────────────────────────────────────────────
  const [heroEnabled,     setHeroEnabled]     = useState(false);
  const [heroBadge,       setHeroBadge]       = useState("");
  const [heroHeadline,    setHeroHeadline]    = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [heroAlign,       setHeroAlign]       = useState<"left" | "center" | "right">("center");
  const [heroImageUrl,    setHeroImageUrl]    = useState("");
  const [heroImagePos,    setHeroImagePos]    = useState("50% 50%");
  const [heroImageZoom,   setHeroImageZoom]   = useState(100);
  const [heroOverlay,     setHeroOverlay]     = useState(true);
  const [heroCtaLabel,    setHeroCtaLabel]    = useState("");
  const [heroCtaHref,     setHeroCtaHref]     = useState("");
  const [heroUploading,   setHeroUploading]   = useState(false);
  const [savingHero,      setSavingHero]      = useState(false);
  // Tracks the last *persisted* hero image URL (not the in-progress edit) —
  // cleanup only fires once a save actually replaces it, mirroring the
  // homepage hero editor's save-time diff. A ref, not state, since it must
  // survive multiple uploads between saves without triggering re-renders.
  const lastSavedImageUrlRef = useRef<string>("");

  // Sync the live `content` string into the editable surface only when switching
  // into this tab — never while it's mounted and being typed in, or every
  // keystroke's setContent() would re-render dangerouslySetInnerHTML underneath
  // the user's cursor and reset their selection.
  useEffect(() => {
    if (activeTab === "edit" && editableRef.current) {
      editableRef.current.innerHTML = content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function syncEditableContent() {
    if (editableRef.current) setContent(editableRef.current.innerHTML);
  }

  useEffect(() => {
    if (page && !initialized) {
      setTitle(page.title);
      setSlug(page.slug);
      setMetaDescription(page.meta_description ?? "");
      setContent(page.content ?? "");
      setBlocks(Array.isArray(page.blocks) ? page.blocks : []);
      setIsPublished(page.is_published);
      setHeroEnabled(page.hero_enabled ?? false);
      setHeroBadge(page.hero_badge ?? "");
      setHeroHeadline(page.hero_headline ?? "");
      setHeroSubheadline(page.hero_subheadline ?? "");
      setHeroAlign((page.hero_align as "left" | "center" | "right") ?? "center");
      setHeroImageUrl(page.hero_image_url ?? "");
      setHeroImagePos(page.hero_image_position ?? "50% 50%");
      setHeroImageZoom(page.hero_image_zoom ?? 100);
      setHeroOverlay(page.hero_overlay ?? true);
      setHeroCtaLabel(page.hero_cta_label ?? "");
      setHeroCtaHref(page.hero_cta_href ?? "");
      lastSavedImageUrlRef.current = page.hero_image_url ?? "";
      setInitialized(true);
    }
  }, [page, initialized]);

  function heroPayload() {
    return {
      hero_enabled: heroEnabled,
      hero_badge: heroBadge,
      hero_headline: heroHeadline,
      hero_subheadline: heroSubheadline,
      hero_align: heroAlign,
      hero_image_url: heroImageUrl,
      hero_image_position: heroImagePos,
      hero_image_zoom: heroImageZoom,
      hero_overlay: heroOverlay,
      hero_cta_label: heroCtaLabel,
      hero_cta_href: heroCtaHref,
    };
  }

  async function uploadHero(file: File) {
    setHeroUploading(true);
    try {
      const url = await uploadHeroImage(file, accessToken!, "page_hero");
      if (!url) { toast.error("Upload failed"); return; }
      // Deliberately does NOT delete the previous image here — this is just an
      // in-progress edit that might never be saved. Cleanup of the actually-
      // replaced file happens in saveHero()/save() once the new state is
      // confirmed persisted (see lastSavedImageUrlRef).
      setHeroImageUrl(url);
      setHeroImagePos("50% 50%");
      setHeroImageZoom(100);
    } finally {
      setHeroUploading(false);
    }
  }

  function cleanUpReplacedHeroImage(token: string) {
    if (lastSavedImageUrlRef.current && lastSavedImageUrlRef.current !== heroImageUrl) {
      deleteOldUpload(lastSavedImageUrlRef.current, token);
    }
    lastSavedImageUrlRef.current = heroImageUrl;
  }

  async function saveHero() {
    setSavingHero(true);
    try {
      let token = accessToken!;
      const payload = heroPayload();
      try {
        await api.patch(`/pages/${id}`, payload, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/pages/${id}`, payload, token);
        } else throw err;
      }
      cleanUpReplacedHeroImage(token);
      toast.success("Hero saved");
    } catch {
      toast.error("Failed to save hero");
    } finally {
      setSavingHero(false);
    }
  }

  async function save() {
    if (!title.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      let token = accessToken!;
      const payload = { title, slug, meta_description: metaDescription, content, blocks, is_published: isPublished, ...heroPayload() };
      try {
        await api.patch(`/pages/${id}`, payload, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/pages/${id}`, payload, token);
        } else throw err;
      }
      cleanUpReplacedHeroImage(token);
      toast.success("Page saved");
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || (!isLoading && !page)) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Page not found.</p>
          <Link href="/pages" className="btn-outline !py-1.5 !px-4 !text-xs mt-4 inline-flex">Back to Pages</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
        <Link href="/pages" className="hover:text-slate-600">Pages</Link>
        <ChevronRight size={12} />
        <span className="text-slate-700 font-semibold truncate max-w-xs">{title || "Untitled Page"}</span>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/pages" className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-black text-navy-900 truncate">{title || "Untitled Page"}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-slate-400 text-xs font-mono">/{slug}</p>
            <a
              href={`${SITE_URL}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-navy-700 transition-colors"
            >
              <ExternalLink size={10} /> View on site
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsPublished((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              isPublished
                ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
            }`}
          >
            {isPublished ? <Globe size={11} /> : <EyeOff size={11} />}
            {isPublished ? "Published" : "Draft"}
          </button>
          <button onClick={save} disabled={saving || !title.trim() || !slug.trim()} className="btn-primary !py-2 !px-4 !text-xs">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
        </div>
      </div>

      {/* Language tabs */}
      {languages.length > 1 && (
        <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setActiveLocale(lang.code)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeLocale === lang.code ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {lang.code === "en" ? "English" : lang.native_name}
            </button>
          ))}
        </div>
      )}

      {activeLocale !== "en" && (() => {
        const lang = languages.find((l) => l.code === activeLocale);
        return (
          <div className="card p-5 space-y-4" dir={lang?.is_rtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">{lang?.name} Translation</p>
              <button
                onClick={() => retranslate(activeLocale)}
                disabled={retranslating === activeLocale}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-50"
              >
                {retranslating === activeLocale ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Re-translate from English
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Auto-translated by AI when this page is saved or when {lang?.name} is enabled. Edit directly here, or re-translate to overwrite with a fresh AI pass — English stays the source of truth.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input className="input-base" value={getTranslatedField(activeLocale, "title")} onChange={(e) => setTranslatedField(activeLocale, "title", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Meta Description</label>
              <input className="input-base" value={getTranslatedField(activeLocale, "meta_description")} onChange={(e) => setTranslatedField(activeLocale, "meta_description", e.target.value)} />
            </div>
            {heroEnabled && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Badge</label>
                  <input className="input-base" value={getTranslatedField(activeLocale, "hero_badge")} onChange={(e) => setTranslatedField(activeLocale, "hero_badge", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Headline</label>
                  <input className="input-base" value={getTranslatedField(activeLocale, "hero_headline")} onChange={(e) => setTranslatedField(activeLocale, "hero_headline", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Subheadline</label>
                  <textarea className="input-base h-20 resize-none" value={getTranslatedField(activeLocale, "hero_subheadline")} onChange={(e) => setTranslatedField(activeLocale, "hero_subheadline", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hero Button Label</label>
                  <input className="input-base" value={getTranslatedField(activeLocale, "hero_cta_label")} onChange={(e) => setTranslatedField(activeLocale, "hero_cta_label", e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content (HTML)</label>
              <textarea
                className="input-base h-64 resize-y font-mono text-xs"
                value={getTranslatedField(activeLocale, "content")}
                onChange={(e) => setTranslatedField(activeLocale, "content", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="flex justify-end">
              <button onClick={() => saveTranslation(activeLocale)} disabled={savingTranslation === activeLocale} className="btn-primary !py-2 !px-4 !text-xs">
                {savingTranslation === activeLocale ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Translation
              </button>
            </div>
          </div>
        );
      })()}

      {activeLocale === "en" && (
      <div className="space-y-4">
        {/* Page Details */}
        <div className="card p-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">Page Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input
                className="input-base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Slug <span className="text-slate-400 font-normal">(URL path)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 flex-shrink-0">/</span>
                <input
                  className="input-base"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="page-slug"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Meta Description <span className="text-slate-400 font-normal">(SEO — 150–160 chars)</span>
              </label>
              <input
                className="input-base"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Short description for search engines"
                maxLength={200}
              />
              <p className="text-[10px] text-slate-400 mt-1">{metaDescription.length}/200</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Hero Banner</p>
            <button
              onClick={() => setHeroEnabled((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                heroEnabled
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                  : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
              }`}
            >
              {heroEnabled ? <Eye size={11} /> : <EyeOff size={11} />}
              {heroEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          {!heroEnabled ? (
            <p className="text-xs text-slate-400">
              No hero banner shows above this page's content. Enable it to add a headline, background image, and alignment.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Badge <span className="text-slate-400 font-normal">(small eyebrow label, optional)</span>
                  </label>
                  <input className="input-base" value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} placeholder="e.g. About PAII" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Text Alignment</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
                    {([
                      ["left", AlignLeft],
                      ["center", AlignCenter],
                      ["right", AlignRight],
                    ] as const).map(([val, Icon]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setHeroAlign(val)}
                        title={`Align ${val}`}
                        className={cn(
                          "px-3 py-1.5 rounded-md transition-colors",
                          heroAlign === val ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Headline</label>
                  <input className="input-base" value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="Big headline shown in the hero" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subheadline</label>
                  <textarea
                    className="input-base h-20 resize-none"
                    value={heroSubheadline}
                    onChange={(e) => setHeroSubheadline(e.target.value)}
                    placeholder="A sentence or two under the headline"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Button Label <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input className="input-base" value={heroCtaLabel} onChange={(e) => setHeroCtaLabel(e.target.value)} placeholder="e.g. Explore Certifications" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Button Link <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input className="input-base" value={heroCtaHref} onChange={(e) => setHeroCtaHref(e.target.value)} placeholder="/certifications" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon size={12} /> Background Image <span className="text-slate-400 font-normal">(optional — leave blank for the default dark gradient)</span>
                  </label>
                  {heroImageUrl && (
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={heroOverlay} onChange={(e) => setHeroOverlay(e.target.checked)} className="rounded border-slate-300" />
                      Dark overlay
                    </label>
                  )}
                </div>
                <HeroImageFrame
                  imageUrl={heroImageUrl}
                  position={heroImagePos}
                  zoom={heroImageZoom}
                  uploading={heroUploading}
                  onUpload={uploadHero}
                  onPositionChange={setHeroImagePos}
                  onZoomChange={setHeroImageZoom}
                  aspectClassName="aspect-[1920/620]"
                />
                {heroImageUrl && (
                  <button type="button" onClick={() => setHeroImageUrl("")} className="text-[11px] font-semibold text-red-500 hover:text-red-700 mt-1.5">
                    Remove image (use gradient instead)
                  </button>
                )}
              </div>

              {/* Live preview */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Preview</p>
                <div
                  className={cn("relative overflow-hidden rounded-xl py-14 px-6", !heroImageUrl && "bg-gradient-to-br from-[#171527] via-[#1f1d38] to-[#2d1b69]")}
                >
                  {heroImageUrl && (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-no-repeat"
                        style={{
                          backgroundImage: `url("${heroImageUrl}")`,
                          backgroundPosition: heroImagePos,
                          transform: `scale(${heroImageZoom / 100})`,
                          transformOrigin: heroImagePos,
                        }}
                      />
                      {heroOverlay && <div className="absolute inset-0 bg-black/60" />}
                    </>
                  )}
                  <div className={cn("relative max-w-lg", heroAlign === "left" ? "text-left mr-auto" : heroAlign === "right" ? "text-right ml-auto" : "text-center mx-auto")}>
                    {heroBadge.trim() && (
                      <span className="inline-flex items-center gap-2 text-[10px] font-mono font-semibold text-white uppercase tracking-[0.15em] pl-2.5 border-l-2 border-teal-400 mb-3">
                        {heroBadge}
                      </span>
                    )}
                    <h2 className="text-2xl font-display font-black text-white mb-2">{heroHeadline || "Headline"}</h2>
                    {heroSubheadline.trim() && <p className="text-sm text-white/90">{heroSubheadline}</p>}
                    {heroCtaLabel.trim() && (
                      <span className="inline-flex mt-4 bg-teal-500 text-white text-xs font-semibold px-4 py-2 rounded-lg">{heroCtaLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={saveHero} disabled={savingHero} className="btn-primary !py-2 !px-4 !text-xs">
                  {savingHero ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Hero
                </button>
              </div>
            </div>
          )}
        </div>

        <BlocksEditor blocks={blocks} setBlocks={setBlocks} />

        {/* Content Editor */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content</p>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab("editor")}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "editor" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Code2 size={11} /> HTML
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "edit" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Type size={11} /> Edit Text
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "preview" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Eye size={11} /> Preview
              </button>
            </div>
          </div>

          {activeTab === "editor" ? (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <MonacoEditor
                height="560px"
                language="html"
                theme="vs-dark"
                value={content}
                onChange={(v: string | undefined) => setContent(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  tabSize: 2,
                  folding: true,
                  formatOnPaste: true,
                }}
              />
            </div>
          ) : activeTab === "edit" ? (
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditableContent}
              onBlur={syncEditableContent}
              className="cms-editable w-full rounded-xl border border-slate-200 bg-white overflow-y-auto p-6 focus:outline-none focus:ring-2 focus:ring-teal-400"
              style={{ height: 560, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 15, color: "#171527" }}
            />
          ) : (
            <iframe
              srcDoc={previewDoc(content)}
              className="w-full rounded-xl border border-slate-200 bg-white"
              style={{ height: 560 }}
              title="Page preview"
            />
          )}

          <style jsx global>{`
            .cms-editable h1 { font-size: 2rem; font-weight: 900; margin: 0 0 8px; }
            .cms-editable h2 { font-size: 1.25rem; font-weight: 700; margin: 32px 0 12px; }
            .cms-editable h3 { font-size: 1rem; font-weight: 700; margin: 0 0 8px; }
            .cms-editable p { line-height: 1.7; margin: 0 0 16px; }
            .cms-editable a { color: #171527; }
            .cms-editable ul, .cms-editable ol { padding-left: 20px; }
            .cms-editable li { margin-bottom: 6px; font-size: 14px; line-height: 1.6; }
            .cms-editable section { overflow: hidden; }
          `}</style>

          <p className="text-[10px] text-slate-400 mt-2">
            {activeTab === "edit"
              ? "Click directly into the text to edit it — layout, colors, and structure stay exactly as designed. Switch to HTML for structural changes."
              : "HTML editor — use inline styles or Tailwind classes (rendered on the marketing site). Preview shows an approximation."}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving || !title.trim() || !slug.trim()} className="btn-primary !py-2 !px-6 !text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Page
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

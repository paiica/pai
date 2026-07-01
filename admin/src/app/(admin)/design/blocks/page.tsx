"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import toast from "react-hot-toast";
import { GripVertical, Loader2, Edit2, X, Plus, Copy, Trash2, Image as ImageIcon, Save, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Block = {
  key: string;
  label: string;
  is_visible: boolean;
  sort_order: number;
  content: Record<string, any>;
};

// ─── Shared field components ────────────────────────────────────────────────

function Field({ label, value, onChange, textarea = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {textarea ? (
        <textarea
          className="input-base resize-none h-20 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input-base text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function SaveBtn({ saving, onClick, label }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-100 mt-6 z-10">
      <button onClick={onClick} disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60 w-full sm:w-auto">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {label ?? "Save Changes"}
      </button>
    </div>
  );
}

// ─── Simple editor (Video, Blog) ─────────────────────────────────────────────

function SimpleEditor({ block, fields, token, onSave }: {
  block: Block;
  fields: Array<{ key: string; label: string; textarea?: boolean; placeholder?: string }>;
  token: string;
  onSave: () => void;
}) {
  const [vals, setVals]   = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = block.content[f.key] ?? ""; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, { content: { ...block.content, ...vals } }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <Field key={f.key} label={f.label} value={vals[f.key]} onChange={(v) => setVals({ ...vals, [f.key]: v })} textarea={f.textarea} placeholder={f.placeholder} />
      ))}
      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Hero editor ─────────────────────────────────────────────────────────────

type HeroSlide = {
  image_url: string; badge: string; headline: string; highlight: string; sub: string;
  cta_label: string; cta_href: string; cta2_label: string; cta2_href: string;
  stat1_value: string; stat1_label: string; stat2_value: string; stat2_label: string;
  stat3_value: string; stat3_label: string; stat4_value: string; stat4_label: string;
};

const HERO_DEFAULT_SLIDE: HeroSlide = {
  image_url: "", badge: "", headline: "", highlight: "", sub: "",
  cta_label: "", cta_href: "", cta2_label: "", cta2_href: "",
  stat1_value: "", stat1_label: "", stat2_value: "", stat2_label: "",
  stat3_value: "", stat3_label: "", stat4_value: "", stat4_label: "",
};

const HERO_PREFILLED_SLIDES: HeroSlide[] = [
  {
    image_url: "",
    badge: "The AI Credential Standard",
    headline: "Prove Your AI Expertise.",
    highlight: "Advance Your Career.",
    sub: "PAI offers the most rigorous AI certification programs for professionals, managers, and executives. Join 3,200+ credential holders recognized by leading organizations worldwide.",
    cta_label: "Start with CAIP", cta_href: "/certifications/certified-ai-professional",
    cta2_label: "View All Programs", cta2_href: "/certifications",
    stat1_value: "3,200+", stat1_label: "Certified Professionals",
    stat2_value: "48",     stat2_label: "Countries",
    stat3_value: "4",      stat3_label: "Programs",
    stat4_value: "94%",    stat4_label: "Employer Recognition",
  },
  {
    image_url: "",
    badge: "Trusted by Professionals Worldwide",
    headline: "Your Industry Needs AI-Verified",
    highlight: "Talent.",
    sub: "From healthcare to finance, technology to education — employers across every sector are requiring verifiable AI credentials.",
    cta_label: "Explore Certifications", cta_href: "/certifications",
    cta2_label: "Why PAI?", cta2_href: "/about",
    stat1_value: "92%",    stat1_label: "Got Promoted or Hired",
    stat2_value: "38%",    stat2_label: "Average Salary Increase",
    stat3_value: "1,400+", stat3_label: "Hiring Partners",
    stat4_value: "4.9/5",  stat4_label: "Student Rating",
  },
  {
    image_url: "",
    badge: "Enterprise AI Certification",
    headline: "Upskill Your Entire Team.",
    highlight: "All at Once.",
    sub: "PAI Corporate provides tailored certification pathways for organizations. Train your workforce with flexible licensing, cohort learning, and dedicated enterprise support.",
    cta_label: "Get a Corporate Quote", cta_href: "/corporate",
    cta2_label: "See Enterprise Plans", cta2_href: "/corporate",
    stat1_value: "200+",  stat1_label: "Enterprise Clients",
    stat2_value: "15k+",  stat2_label: "Employees Trained",
    stat3_value: "6 wks", stat3_label: "Avg. Cohort Duration",
    stat4_value: "100%",  stat4_label: "Custom Pathways",
  },
];

function HeroEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const [slides, setSlides] = useState<HeroSlide[]>(() => {
    const cms = block.content?.slides as HeroSlide[] | undefined;
    return cms?.length ? cms : HERO_PREFILLED_SLIDES.map((s) => ({ ...s }));
  });
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving]           = useState(false);

  function upd(key: keyof HeroSlide, val: string) {
    setSlides((prev) => prev.map((s, i) => i === activeSlide ? { ...s, [key]: val } : s));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, { content: { slides } }, token);
      toast.success("Hero slides saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  function addSlide() {
    setSlides((prev) => [...prev, { ...HERO_DEFAULT_SLIDE }]);
    setActiveSlide(slides.length);
  }

  function removeSlide(idx: number) {
    if (slides.length <= 1) { toast.error("Need at least 1 slide"); return; }
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    setActiveSlide(Math.max(0, idx - 1));
  }

  const s = slides[activeSlide];

  return (
    <div className="space-y-4">
      {/* Slide tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeSlide === i ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Slide {i + 1}
          </button>
        ))}
        <button onClick={addSlide} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg">
          <Plus size={13} />
        </button>
        {slides.length > 1 && (
          <button onClick={() => removeSlide(activeSlide)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg ml-auto">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Slide fields */}
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
          <ImageIcon size={12} /> Background image URL (leave blank to use gradient)
        </div>
        <Field label="Image URL" value={s.image_url} onChange={(v) => upd("image_url", v)} placeholder="https://... or leave blank for gradient" />
        <Field label="Badge text" value={s.badge} onChange={(v) => upd("badge", v)} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Headline" value={s.headline} onChange={(v) => upd("headline", v)} />
          <Field label="Highlight (teal)" value={s.highlight} onChange={(v) => upd("highlight", v)} />
        </div>
        <Field label="Subtitle / Body text" value={s.sub} onChange={(v) => upd("sub", v)} textarea />

        <div className="border-t border-slate-100 pt-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Primary CTA</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label" value={s.cta_label} onChange={(v) => upd("cta_label", v)} />
            <Field label="Button href" value={s.cta_href} onChange={(v) => upd("cta_href", v)} placeholder="/certifications/..." />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Secondary CTA</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Link label" value={s.cta2_label} onChange={(v) => upd("cta2_label", v)} />
            <Field label="Link href" value={s.cta2_href} onChange={(v) => upd("cta2_href", v)} placeholder="/about" />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Stat boxes (4)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stat 1 value" value={s.stat1_value} onChange={(v) => upd("stat1_value", v)} />
            <Field label="Stat 1 label" value={s.stat1_label} onChange={(v) => upd("stat1_label", v)} />
            <Field label="Stat 2 value" value={s.stat2_value} onChange={(v) => upd("stat2_value", v)} />
            <Field label="Stat 2 label" value={s.stat2_label} onChange={(v) => upd("stat2_label", v)} />
            <Field label="Stat 3 value" value={s.stat3_value} onChange={(v) => upd("stat3_value", v)} />
            <Field label="Stat 3 label" value={s.stat3_label} onChange={(v) => upd("stat3_label", v)} />
            <Field label="Stat 4 value" value={s.stat4_value} onChange={(v) => upd("stat4_value", v)} />
            <Field label="Stat 4 label" value={s.stat4_label} onChange={(v) => upd("stat4_label", v)} />
          </div>
        </div>
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Why PAI editor ──────────────────────────────────────────────────────────

type Pillar = { title: string; description: string };

function WhyPAIEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const [badge,    setBadge]    = useState(block.content?.badge    ?? "Why PAI");
  const [title,    setTitle]    = useState(block.content?.title    ?? "The Credential That Opens Doors");
  const [subtitle, setSubtitle] = useState(block.content?.subtitle ?? "");
  const [pillars,  setPillars]  = useState<Pillar[]>(
    (block.content?.pillars as Pillar[]) ?? [
      { title: "Rigorous & Credible",          description: "Our exams are developed by AI practitioners and reviewed by independent subject-matter experts. ISO 17024-aligned standards ensure your credential means something." },
      { title: "Globally Recognized",           description: "PAI credentials are recognized by employers across 48 countries. Verified via QR code, blockchain-anchored, and LinkedIn-ready in minutes." },
      { title: "Practitioner-Built Curriculum", description: "Every module is authored by active AI professionals — not theorists. Real tools, real workflows, real outcomes. Updated every quarter." },
      { title: "Digital Badges & Certificates", description: "Earn a digital certificate, Open Badge 3.0, and LinkedIn credential. Share and verify instantly with your network and employers." },
      { title: "Career-Defining Impact",        description: "87% of certified professionals report a measurable career advancement within 12 months. Average salary uplift: 18-24% in benchmark studies." },
      { title: "Continuing Education",          description: "AI moves fast. Every certification includes 2-year renewal pathways so your credential stays current with the field." },
      { title: "Global Peer Network",           description: "Join a vetted community of 3,200+ certified AI professionals. Access forums, mentorship, and exclusive events." },
      { title: "Self-Paced Learning",           description: "Complete the program at your own pace on any device. Average completion: 6-10 weeks. No deadlines, no pressure." },
    ]
  );
  const [saving, setSaving] = useState(false);

  function updPillar(idx: number, key: keyof Pillar, val: string) {
    setPillars((prev) => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, { content: { badge, title, subtitle, pillars } }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <Field label="Badge" value={badge} onChange={setBadge} />
        <Field label="Section title" value={title} onChange={setTitle} />
        <Field label="Subtitle" value={subtitle} onChange={setSubtitle} textarea />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pillars ({pillars.length})</p>
        {pillars.map((p, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-slate-500">Pillar {i + 1}</p>
            <Field label="Title" value={p.title} onChange={(v) => updPillar(i, "title", v)} />
            <Field label="Description" value={p.description} onChange={(v) => updPillar(i, "description", v)} textarea />
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={() => setPillars([...pillars, { title: "", description: "" }])}
            className="text-xs text-slate-500 hover:text-navy-700 flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg"
          >
            <Plus size={11} /> Add pillar
          </button>
          {pillars.length > 1 && (
            <button
              onClick={() => setPillars(pillars.slice(0, -1))}
              className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-3 py-1.5 border border-dashed border-red-100 rounded-lg"
            >
              <Trash2 size={11} /> Remove last
            </button>
          )}
        </div>
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Testimonials editor ─────────────────────────────────────────────────────

type TestimonialItem = { name: string; title: string; company: string; cert: string; avatar: string; rating: string; quote: string };

const DEFAULT_TESTIMONIAL: TestimonialItem = { name: "", title: "", company: "", cert: "", avatar: "", rating: "5", quote: "" };

function TestimonialsEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const [badge,    setBadge]    = useState(block.content?.badge    ?? "What Professionals Say");
  const [title,    setTitle]    = useState(block.content?.title    ?? "Trusted by Industry Leaders");
  const [subtitle, setSubtitle] = useState(block.content?.subtitle ?? "");
  const [items,    setItems]    = useState<TestimonialItem[]>(
    (block.content?.items as TestimonialItem[]) ?? [
      { name: "Sarah Chen",      title: "Senior Product Manager", company: "Shopify",             cert: "CAIP",  avatar: "SC", rating: "5", quote: "CAIP gave me the credibility to lead our AI integration projects. Within 3 months of certifying, I was promoted to lead our AI task force." },
      { name: "Marcus Williams", title: "Director of Operations",  company: "KPMG",               cert: "CAIM",  avatar: "MW", rating: "5", quote: "CAIM is the only certification I've found that addresses the real management challenges of AI adoption. Worth every penny." },
      { name: "Priya Patel",     title: "Chief Digital Officer",   company: "Intact Financial",   cert: "CAIE",  avatar: "PP", rating: "5", quote: "As a CDO, I needed a credential that spoke the language of the boardroom. CAIE is exactly that — strategic, governance-focused, and immediately applicable." },
      { name: "James Okonkwo",   title: "Data Analytics Lead",     company: "Deloitte",           cert: "CAIDA", avatar: "JO", rating: "5", quote: "CAIDA bridges the gap between traditional data analytics and modern AI methods. The curriculum is hands-on, practical, and built by people who actually work with these tools." },
      { name: "Ana Rodrigues",   title: "HR Director",             company: "Nestlé",             cert: "CAIP",  avatar: "AR", rating: "5", quote: "I came in knowing nothing about AI. CAIP walked me through everything from fundamentals to practical applications for HR." },
      { name: "David Kim",       title: "VP Technology",           company: "Royal Bank of Canada",cert: "CAIM",  avatar: "DK", rating: "5", quote: "The PAI community alone is worth the certification fee. I've connected with AI leaders from 20+ countries." },
    ]
  );
  const [saving, setSaving] = useState(false);

  function updItem(idx: number, key: keyof TestimonialItem, val: string) {
    setItems((prev) => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, { content: { badge, title, subtitle, items } }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <Field label="Badge" value={badge} onChange={setBadge} />
        <Field label="Section title" value={title} onChange={setTitle} />
        <Field label="Subtitle" value={subtitle} onChange={setSubtitle} />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Testimonials ({items.length})</p>
        {items.map((t, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">Testimonial {i + 1}</p>
              {items.length > 1 && (
                <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:bg-red-50 rounded">
                  <Trash2 size={11} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name" value={t.name} onChange={(v) => updItem(i, "name", v)} />
              <Field label="Avatar initials" value={t.avatar} onChange={(v) => updItem(i, "avatar", v)} placeholder="SC" />
              <Field label="Job title" value={t.title} onChange={(v) => updItem(i, "title", v)} />
              <Field label="Company" value={t.company} onChange={(v) => updItem(i, "company", v)} />
              <Field label="Certification" value={t.cert} onChange={(v) => updItem(i, "cert", v)} placeholder="CAIP" />
              <Field label="Rating (1-5)" value={t.rating} onChange={(v) => updItem(i, "rating", v)} placeholder="5" />
            </div>
            <Field label="Quote" value={t.quote} onChange={(v) => updItem(i, "quote", v)} textarea />
          </div>
        ))}
        <button
          onClick={() => setItems([...items, { ...DEFAULT_TESTIMONIAL }])}
          className="text-xs text-slate-500 hover:text-navy-700 flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg"
        >
          <Plus size={11} /> Add testimonial
        </button>
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Identity editor ─────────────────────────────────────────────────────────

function IdentityEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const c = block.content;
  const [badge,     setBadge]    = useState(c?.badge     ?? "");
  const [headline,  setHeadline] = useState(c?.headline  ?? "");
  const [highlight, setHighlight]= useState(c?.highlight ?? "");
  const [body,      setBody]     = useState(c?.body      ?? "");

  const [stat1Value,  setStat1Value]  = useState(c?.stat_1_value  ?? "");
  const [stat1Label,  setStat1Label]  = useState(c?.stat_1_label  ?? "");
  const [stat2Value,  setStat2Value]  = useState(c?.stat_2_value  ?? "");
  const [stat2Label,  setStat2Label]  = useState(c?.stat_2_label  ?? "");
  const [stat3Value,  setStat3Value]  = useState(c?.stat_3_value  ?? "");
  const [stat3Label,  setStat3Label]  = useState(c?.stat_3_label  ?? "");
  const [stat4Value,  setStat4Value]  = useState(c?.stat_4_value  ?? "");
  const [stat4Label,  setStat4Label]  = useState(c?.stat_4_label  ?? "");

  const [p1Icon,  setP1Icon]  = useState(c?.pillar_1_icon  ?? "");
  const [p1Title, setP1Title] = useState(c?.pillar_1_title ?? "");
  const [p1Desc,  setP1Desc]  = useState(c?.pillar_1_desc  ?? "");
  const [p2Icon,  setP2Icon]  = useState(c?.pillar_2_icon  ?? "");
  const [p2Title, setP2Title] = useState(c?.pillar_2_title ?? "");
  const [p2Desc,  setP2Desc]  = useState(c?.pillar_2_desc  ?? "");
  const [p3Icon,  setP3Icon]  = useState(c?.pillar_3_icon  ?? "");
  const [p3Title, setP3Title] = useState(c?.pillar_3_title ?? "");
  const [p3Desc,  setP3Desc]  = useState(c?.pillar_3_desc  ?? "");
  const [p4Icon,  setP4Icon]  = useState(c?.pillar_4_icon  ?? "");
  const [p4Title, setP4Title] = useState(c?.pillar_4_title ?? "");
  const [p4Desc,  setP4Desc]  = useState(c?.pillar_4_desc  ?? "");

  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, {
        content: {
          badge, headline, highlight, body,
          stat_1_value: stat1Value, stat_1_label: stat1Label,
          stat_2_value: stat2Value, stat_2_label: stat2Label,
          stat_3_value: stat3Value, stat_3_label: stat3Label,
          stat_4_value: stat4Value, stat_4_label: stat4Label,
          pillar_1_icon: p1Icon, pillar_1_title: p1Title, pillar_1_desc: p1Desc,
          pillar_2_icon: p2Icon, pillar_2_title: p2Title, pillar_2_desc: p2Desc,
          pillar_3_icon: p3Icon, pillar_3_title: p3Title, pillar_3_desc: p3Desc,
          pillar_4_icon: p4Icon, pillar_4_title: p4Title, pillar_4_desc: p4Desc,
        },
      }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="space-y-3">
        <Field label="Badge text" value={badge} onChange={setBadge} placeholder="The AI Credential Standard" />
        <Field label="Headline (first line)" value={headline} onChange={setHeadline} placeholder="We don't teach AI." />
        <Field label="Headline highlight (gradient, second line)" value={highlight} onChange={setHighlight} placeholder="We certify the people trusted to lead it." />
        <Field label="Body paragraph" value={body} onChange={setBody} textarea />
      </div>

      {/* Stats */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Stat cards (2 × 2 grid)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stat 1 — value" value={stat1Value} onChange={setStat1Value} placeholder="12,400+" />
          <Field label="Stat 1 — label" value={stat1Label} onChange={setStat1Label} placeholder="Professionals Certified" />
          <Field label="Stat 2 — value" value={stat2Value} onChange={setStat2Value} placeholder="48" />
          <Field label="Stat 2 — label" value={stat2Label} onChange={setStat2Label} placeholder="Countries Represented" />
          <Field label="Stat 3 — value" value={stat3Value} onChange={setStat3Value} placeholder="94%" />
          <Field label="Stat 3 — label" value={stat3Label} onChange={setStat3Label} placeholder="Employer Recognition Rate" />
          <Field label="Stat 4 — value" value={stat4Value} onChange={setStat4Value} placeholder="#1" />
          <Field label="Stat 4 — label" value={stat4Label} onChange={setStat4Label} placeholder="AI Certification Body in Canada" />
        </div>
      </div>

      {/* Pillars */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pillars (4-column row)</p>
        {[
          { icon: p1Icon, setIcon: setP1Icon, title: p1Title, setTitle: setP1Title, desc: p1Desc, setDesc: setP1Desc, n: 1, color: "blue" },
          { icon: p2Icon, setIcon: setP2Icon, title: p2Title, setTitle: setP2Title, desc: p2Desc, setDesc: setP2Desc, n: 2, color: "amber" },
          { icon: p3Icon, setIcon: setP3Icon, title: p3Title, setTitle: setP3Title, desc: p3Desc, setDesc: setP3Desc, n: 3, color: "purple" },
          { icon: p4Icon, setIcon: setP4Icon, title: p4Title, setTitle: setP4Title, desc: p4Desc, setDesc: setP4Desc, n: 4, color: "teal" },
        ].map(({ icon, setIcon, title, setTitle, desc, setDesc, n, color }) => (
          <div key={n} className="rounded-xl border border-slate-100 p-3 space-y-2 bg-slate-50/50">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pillar {n} <span className={`text-${color}-500`}>●</span></p>
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <Field label="Icon (emoji)" value={icon} onChange={setIcon} placeholder="🌐" />
              <Field label="Title" value={title} onChange={setTitle} placeholder="Global Authority" />
            </div>
            <Field label="Description" value={desc} onChange={setDesc} textarea />
          </div>
        ))}
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── CTA editor ──────────────────────────────────────────────────────────────

function CTAEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const c = block.content;
  const [badge,     setBadge]    = useState(c?.badge     ?? "");
  const [title,     setTitle]    = useState(c?.title     ?? "");
  const [highlight, setHighlight]= useState(c?.highlight ?? "");
  const [subtitle,  setSubtitle] = useState(c?.subtitle  ?? "");
  const [ctaLabel,  setCtaLabel] = useState(c?.cta_label ?? "");
  const [ctaHref,   setCtaHref]  = useState(c?.cta_href  ?? "");
  const [cta2Label, setCta2Label]= useState(c?.cta2_label ?? "");
  const [cta2Href,  setCta2Href] = useState(c?.cta2_href  ?? "");
  const [trust1,    setTrust1]   = useState(c?.trust_1   ?? "");
  const [trust2,    setTrust2]   = useState(c?.trust_2   ?? "");
  const [trust3,    setTrust3]   = useState(c?.trust_3   ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, {
        content: { badge, title, highlight, subtitle, cta_label: ctaLabel, cta_href: ctaHref, cta2_label: cta2Label, cta2_href: cta2Href, trust_1: trust1, trust_2: trust2, trust_3: trust3 },
      }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <Field label="Badge" value={badge} onChange={setBadge} />
      <Field label="Title (first line)" value={title} onChange={setTitle} />
      <Field label="Highlight (second line, gradient)" value={highlight} onChange={setHighlight} />
      <Field label="Body text" value={subtitle} onChange={setSubtitle} textarea />
      <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
        <Field label="Primary button label" value={ctaLabel} onChange={setCtaLabel} />
        <Field label="Primary button href" value={ctaHref} onChange={setCtaHref} />
        <Field label="Secondary link label" value={cta2Label} onChange={setCta2Label} />
        <Field label="Secondary link href" value={cta2Href} onChange={setCta2Href} />
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Trust badges</p>
        <div className="space-y-2">
          <Field label="Trust 1" value={trust1} onChange={setTrust1} />
          <Field label="Trust 2" value={trust2} onChange={setTrust2} />
          <Field label="Trust 3" value={trust3} onChange={setTrust3} />
        </div>
      </div>
      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Certifications editor ───────────────────────────────────────────────────

const CERT_THEME_COLORS = ["#134e4a", "#38bdf8", "#a78bfa", "#059669"];

function CertificationsEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const c = block.content;
  const [badge,          setBadge]          = useState(c?.badge           ?? "Certification Programs");
  const [title,          setTitle]          = useState(c?.title           ?? "Become a");
  const [titleHighlight, setTitleHighlight] = useState(c?.title_highlight ?? "certified success");
  const [description,    setDescription]    = useState(c?.description     ?? "");
  const [ctaCardTitle,   setCtaCardTitle]   = useState(c?.cta_card_title  ?? "Not sure where to start?");
  const [ctaCardDesc,    setCtaCardDesc]    = useState(c?.cta_card_desc   ?? "");
  const [ctaCardLabel,   setCtaCardLabel]   = useState(c?.cta_card_label  ?? "Start with CAIP");
  const [ctaCardHref,    setCtaCardHref]    = useState(c?.cta_card_href   ?? "/certifications/certified-ai-professional");
  const [saving,         setSaving]         = useState(false);

  const [featuredCerts, setFeaturedCerts] = useState<any[] | null>(null);
  const [loadingCerts,  setLoadingCerts]  = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    fetch(`${API}/courses/featured`)
      .then((r) => r.json())
      .then((json) => {
        const items: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setFeaturedCerts(items);
      })
      .catch(() => setFeaturedCerts([]))
      .finally(() => setLoadingCerts(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, {
        content: { badge, title, title_highlight: titleHighlight, description, cta_card_title: ctaCardTitle, cta_card_desc: ctaCardDesc, cta_card_label: ctaCardLabel, cta_card_href: ctaCardHref },
      }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="space-y-3">
        <Field label="Badge" value={badge} onChange={setBadge} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title (first line)" value={title} onChange={setTitle} />
          <Field label="Title highlight (gradient)" value={titleHighlight} onChange={setTitleHighlight} />
        </div>
        <Field label="Description paragraph" value={description} onChange={setDescription} textarea />
      </div>

      {/* CTA card */}
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">CTA card (end of carousel)</p>
        <Field label="Card title" value={ctaCardTitle} onChange={setCtaCardTitle} />
        <Field label="Card description" value={ctaCardDesc} onChange={setCtaCardDesc} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Button label" value={ctaCardLabel} onChange={setCtaCardLabel} />
          <Field label="Button href" value={ctaCardHref} onChange={setCtaCardHref} />
        </div>
      </div>

      {/* Live featured certs — read-only preview */}
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Featured certifications
          </p>
          <Link href="/certifications" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1 transition-colors">
            Manage <ExternalLink size={10} />
          </Link>
        </div>

        {loadingCerts ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : featuredCerts && featuredCerts.length > 0 ? (
          <div className="space-y-2">
            {featuredCerts.map((cert: any, i: number) => {
              const meta = typeof cert.marketing_meta === "object" && cert.marketing_meta !== null ? cert.marketing_meta : {};
              return (
                <div key={cert.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CERT_THEME_COLORS[i % 4] }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-navy-900">{cert.acronym}</span>
                    <span className="text-xs text-slate-500 ml-2 truncate">{cert.title}</span>
                    {meta.is_most_popular && (
                      <span className="ml-2 text-[10px] font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Most Popular</span>
                    )}
                  </div>
                  <Link href={`/certifications/${cert.id}`} className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-white rounded-lg transition-colors flex-shrink-0" title="Edit this certification">
                    <Edit2 size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
            <p className="text-xs font-semibold text-amber-800">No featured certifications</p>
            <p className="text-xs text-amber-700">Enable the "Featured on homepage" toggle on one or more active certifications to have them appear here.</p>
            <Link href="/certifications" className="text-xs font-bold text-amber-800 underline mt-1 inline-block">Go to Manage Certifications →</Link>
          </div>
        )}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Card content (title, description, level) is pulled live from each certification. Archive a cert or turn off "Featured" to remove it from this block.
        </p>
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Courses editor ──────────────────────────────────────────────────────────

const COURSE_LEVEL_COLORS: Record<string, string> = {
  beginner:     "bg-blue-500",
  intermediate: "bg-amber-500",
  advanced:     "bg-purple-500",
};

function CoursesEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const c = block.content;
  const [badge,          setBadge]          = useState(c?.badge           ?? "Prep Courses");
  const [title,          setTitle]          = useState(c?.title           ?? "Learn at Your Own Pace.");
  const [titleHighlight, setTitleHighlight] = useState(c?.title_highlight ?? "Pass with Confidence.");
  const [description,    setDescription]    = useState(c?.description     ?? "");
  const [ctaCardTitle,   setCtaCardTitle]   = useState(c?.cta_card_title  ?? "Not sure where to start?");
  const [ctaCardDesc,    setCtaCardDesc]    = useState(c?.cta_card_desc   ?? "");
  const [ctaCardLabel,   setCtaCardLabel]   = useState(c?.cta_card_label  ?? "Browse All Courses");
  const [ctaCardHref,    setCtaCardHref]    = useState(c?.cta_card_href   ?? "/courses");
  const [saving,         setSaving]         = useState(false);

  const [featuredCourses, setFeaturedCourses] = useState<any[] | null>(null);
  const [loadingCourses,  setLoadingCourses]  = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    fetch(`${API}/prep-courses/featured`)
      .then((r) => r.json())
      .then((json) => {
        const items: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setFeaturedCourses(items);
      })
      .catch(() => setFeaturedCourses([]))
      .finally(() => setLoadingCourses(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, {
        content: { badge, title, title_highlight: titleHighlight, description, cta_card_title: ctaCardTitle, cta_card_desc: ctaCardDesc, cta_card_label: ctaCardLabel, cta_card_href: ctaCardHref },
      }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="space-y-3">
        <Field label="Badge" value={badge} onChange={setBadge} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title (first line)" value={title} onChange={setTitle} />
          <Field label="Title highlight (gradient)" value={titleHighlight} onChange={setTitleHighlight} />
        </div>
        <Field label="Description paragraph" value={description} onChange={setDescription} textarea />
      </div>

      {/* CTA card */}
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">CTA card (end of grid)</p>
        <Field label="Card title" value={ctaCardTitle} onChange={setCtaCardTitle} />
        <Field label="Card description" value={ctaCardDesc} onChange={setCtaCardDesc} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Button label" value={ctaCardLabel} onChange={setCtaCardLabel} />
          <Field label="Button href" value={ctaCardHref} onChange={setCtaCardHref} />
        </div>
      </div>

      {/* Live featured courses — read-only preview */}
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Featured courses
          </p>
          <Link href="/courses?tab=manage" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1 transition-colors">
            Manage <ExternalLink size={10} />
          </Link>
        </div>

        {loadingCourses ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : featuredCourses && featuredCourses.length > 0 ? (
          <div className="space-y-2">
            {featuredCourses.map((course: any) => (
              <div key={course.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COURSE_LEVEL_COLORS[course.level] ?? "bg-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-navy-900 truncate">{course.title}</span>
                  <span className="text-xs text-slate-400 ml-2">{course.level}</span>
                  {course.price != null && (
                    <span className="text-xs text-slate-400 ml-2">${Number(course.price).toFixed(0)}</span>
                  )}
                </div>
                <Link href={`/courses/${course.id}`} className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-white rounded-lg transition-colors flex-shrink-0" title="Edit this course">
                  <Edit2 size={12} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
            <p className="text-xs font-semibold text-amber-800">No featured courses</p>
            <p className="text-xs text-amber-700">Click "Feature" on one or more active courses to have them appear in this section.</p>
            <Link href="/courses?tab=manage" className="text-xs font-bold text-amber-800 underline mt-1 inline-block">Go to Manage Courses →</Link>
          </div>
        )}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Card content (title, description, price) is pulled live from each course. Toggle "Feature" on a course to add it here, archive it to remove it.
        </p>
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Video editor ────────────────────────────────────────────────────────────

type VideoItem = { url: string; label: string; description: string };

const EMPTY_VIDEO: VideoItem = { url: "", label: "", description: "" };

function VideoEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const raw = block.content;

  const initVideos: VideoItem[] = Array.isArray(raw.videos) && raw.videos.length
    ? raw.videos.map((v: any) => ({ ...EMPTY_VIDEO, ...v }))
    : raw.video_url
      ? [{ url: raw.video_url as string, label: "", description: "" }]
      : [{ ...EMPTY_VIDEO }];

  const [title,    setTitle]    = useState<string>(raw.title    as string ?? "");
  const [subtitle, setSubtitle] = useState<string>(raw.subtitle as string ?? "");
  const [videos,   setVideos]   = useState<VideoItem[]>(initVideos);
  const [active,   setActive]   = useState(0);
  const [saving,   setSaving]   = useState(false);

  function updateVideo(idx: number, key: keyof VideoItem, val: string) {
    setVideos((prev) => prev.map((v, i) => i === idx ? { ...v, [key]: val } : v));
  }

  function addVideo() {
    setVideos((prev) => [...prev, { ...EMPTY_VIDEO }]);
    setActive(videos.length);
  }

  function removeVideo(idx: number) {
    if (videos.length <= 1) return;
    const next = videos.filter((_, i) => i !== idx);
    setVideos(next);
    setActive(Math.min(active, next.length - 1));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, { content: { title, subtitle, videos } }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">

      {/* Section defaults */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Section defaults</p>
        <p className="text-xs text-slate-400">Used as fallback when a video has no title/description set.</p>
        <Field label="Section Title" value={title} onChange={setTitle} placeholder="See PAI in Action" />
        <Field label="Section Subtitle" value={subtitle} onChange={setSubtitle} textarea placeholder="Discover how PAI certifications are transforming careers..." />
      </div>

      {/* Per-video editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Videos ({videos.length})</p>
          <button onClick={addVideo} className="text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors">
            + Add Video
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {videos.map((v, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors truncate max-w-[120px]",
                active === i ? "bg-navy-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {v.label?.trim() || `Video ${i + 1}`}
            </button>
          ))}
        </div>

        {videos[active] && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Field
              label="Video URL"
              value={videos[active].url}
              onChange={(v) => updateVideo(active, "url", v)}
              placeholder="https://www.youtube.com/watch?v=... or Vimeo / .mp4"
            />
            <Field
              label="Title (displayed on the left panel while this video plays)"
              value={videos[active].label}
              onChange={(v) => updateVideo(active, "label", v)}
              placeholder="e.g. CAIP Certification Overview"
            />
            <Field
              label="Description (shown below the title on the left panel)"
              value={videos[active].description}
              onChange={(v) => updateVideo(active, "description", v)}
              placeholder="e.g. A walkthrough of the CAIP certification process and what to expect."
              textarea
            />
            {videos.length > 1 && (
              <button
                onClick={() => removeVideo(active)}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                Remove this video
              </button>
            )}
          </div>
        )}
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Logo strip editor ────────────────────────────────────────────────────────

type LogoItem = { image_url: string; alt: string; href: string; highlighted: boolean };

const EMPTY_LOGO: LogoItem = { image_url: "", alt: "", href: "", highlighted: false };

function LogosEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  const c = block.content;
  const [badge, setBadge] = useState(c?.badge ?? "");
  const [title, setTitle] = useState(c?.title ?? "");
  const [items, setItems] = useState<LogoItem[]>(
    Array.isArray(c?.items) && c.items.length
      ? c.items.map((i: any) => ({ ...EMPTY_LOGO, ...i }))
      : [{ ...EMPTY_LOGO }]
  );
  const [saving,       setSaving]       = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function updItem(idx: number, key: keyof LogoItem, val: string | boolean) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_LOGO }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadLogo(idx: number, file: File) {
    setUploadingIdx(idx);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/uploads/local?purpose=logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const url: string = data?.url ?? data?.data?.url;
      if (!url) throw new Error();
      updItem(idx, "image_url", url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingIdx(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/page-blocks/${block.key}`, { content: { badge, title, items } }, token);
      toast.success("Saved");
      onSave();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <Field label="Badge (optional)" value={badge} onChange={setBadge} placeholder="Recognized By" />
        <Field label="Title (optional)" value={title} onChange={setTitle} placeholder="Aligned With Industry-Leading Standards" />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Logos ({items.length})</p>
        {items.map((it, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">Logo {i + 1}</p>
              <button onClick={() => removeItem(i)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                <Trash2 size={11} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className={cn(
                "flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed cursor-pointer transition-colors flex-shrink-0 overflow-hidden bg-white",
                uploadingIdx === i ? "border-blue-200 bg-blue-50" : "border-slate-200 hover:border-navy-300"
              )}>
                {uploadingIdx === i ? (
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                ) : it.image_url ? (
                  <img src={it.image_url} alt="" className="max-w-full max-h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={18} className="text-slate-300" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingIdx !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadLogo(i, file);
                  }}
                />
              </label>
              <div className="flex-1 space-y-2">
                <Field label="Name / alt text" value={it.alt} onChange={(v) => updItem(i, "alt", v)} placeholder="PMI, ISO 17024…" />
                <Field label="Link (optional)" value={it.href} onChange={(v) => updItem(i, "href", v)} placeholder="https://…" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" checked={it.highlighted} onChange={(e) => updItem(i, "highlighted", e.target.checked)} />
              Highlight this badge (accent border)
            </label>
          </div>
        ))}
        <button
          onClick={addItem}
          className="text-xs text-slate-500 hover:text-navy-700 flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg"
        >
          <Plus size={11} /> Add logo
        </button>
      </div>

      <SaveBtn saving={saving} onClick={save} />
    </div>
  );
}

// ─── Block editor router ─────────────────────────────────────────────────────

function BlockEditor({ block, token, onSave }: { block: Block; token: string; onSave: () => void }) {
  if (block.key === "hero")           return <HeroEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "identity")       return <IdentityEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "why_pai")        return <WhyPAIEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "testimonials")   return <TestimonialsEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "cta")            return <CTAEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "certifications") return <CertificationsEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "courses")        return <CoursesEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "video")          return <VideoEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "logos")          return <LogosEditor block={block} token={token} onSave={onSave} />;
  if (block.key === "footer") return (
    <div className="py-2">
      <p className="text-sm text-slate-500 mb-4">The footer has a dedicated editor with full column, social link, and trust bar management.</p>
      <Link href="/design/footer" className="btn-primary !py-2 !px-5 !text-xs inline-flex">
        <ExternalLink size={12} /> Open Footer Editor
      </Link>
    </div>
  );
  if (block.key === "blog") return (
    <SimpleEditor block={block} token={token} onSave={onSave} fields={[
      { key: "badge", label: "Badge" },
      { key: "title", label: "Section title" },
    ]} />
  );
  return (
    <SimpleEditor block={block} token={token} onSave={onSave}
      fields={Object.keys(block.content).map((k) => ({ key: k, label: k.replace(/_/g, " "), textarea: String(block.content[k]).length > 80 }))} />
  );
}

// ─── Available block templates ────────────────────────────────────────────────

const BLOCK_TEMPLATES = [
  { key: "hero",          label: "Hero / Banner" },
  { key: "identity",      label: "Identity / Who We Are" },
  { key: "certifications",label: "Certifications" },
  { key: "courses",       label: "Prep Courses" },
  { key: "video",         label: "Featured Video" },
  { key: "why_pai",       label: "Why PAI" },
  { key: "testimonials",  label: "Testimonials" },
  { key: "blog",          label: "Latest Articles" },
  { key: "cta",           label: "Call to Action" },
  { key: "logos",         label: "Logo Strip / Partners" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PageBlocksPage() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/page-blocks", accessToken] : null,
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

  const blocks: Block[] = data?.data ?? [];
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [draggedKey,  setDraggedKey]  = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [addOpen,     setAddOpen]     = useState(false);
  const [newType,     setNewType]     = useState("video");
  const [newKey,      setNewKey]      = useState("");
  const [newLabel,    setNewLabel]    = useState("");
  const [adding,      setAdding]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  async function toggleVisibility(block: Block) {
    try {
      await api.patch(`/page-blocks/${block.key}`, { is_visible: !block.is_visible }, accessToken!);
      mutate();
    } catch {
      toast.error("Failed to update");
    }
  }

  // ── Drag to reorder ────────────────────────────────────────────────────────

  function onDragStart(key: string) {
    setDraggedKey(key);
  }

  function onDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    if (key !== draggedKey) setDragOverKey(key);
  }

  function onDragLeave() {
    setDragOverKey(null);
  }

  async function onDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    setDragOverKey(null);
    if (!draggedKey || draggedKey === targetKey) { setDraggedKey(null); return; }

    const reordered = [...sorted];
    const fromIdx   = reordered.findIndex((b) => b.key === draggedKey);
    const toIdx     = reordered.findIndex((b) => b.key === targetKey);
    const [moved]   = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const updates = reordered.map((b, i) => ({ key: b.key, sort_order: i + 1, is_visible: b.is_visible }));
    setSaving(true);
    try {
      await api.patch(`/page-blocks/order`, updates, accessToken!);
      mutate();
    } catch {
      toast.error("Failed to reorder");
    } finally {
      setSaving(false);
      setDraggedKey(null);
    }
  }

  function onDragEnd() {
    setDraggedKey(null);
    setDragOverKey(null);
  }

  // ── Add block ──────────────────────────────────────────────────────────────

  function handleTypeChange(type: string) {
    setNewType(type);
    if (type === "custom") {
      setNewKey("");
      setNewLabel("");
    } else {
      const tpl = BLOCK_TEMPLATES.find((t) => t.key === type);
      setNewKey(type);
      setNewLabel(tpl?.label ?? "");
    }
  }

  async function addBlock() {
    const key = (newType === "custom" ? newKey : newType).trim();
    if (!key) return;
    if (blocks.find((b) => b.key === key)) { toast.error(`A block with key "${key}" already exists`); return; }
    setAdding(true);
    try {
      await api.post(`/page-blocks`, {
        key,
        label: newLabel.trim() || undefined,
        sort_order: sorted.length + 1,
      }, accessToken!);
      toast.success("Block added");
      mutate();
      setAddOpen(false);
      setNewType("video");
      setNewKey("");
      setNewLabel("");
    } catch {
      toast.error("Failed to add block");
    } finally {
      setAdding(false);
    }
  }

  async function deleteBlock(key: string) {
    setDeleting(true);
    try {
      await api.delete(`/page-blocks/${key}`, accessToken!);
      toast.success("Block deleted");
      mutate();
      setConfirmDelete(null);
      if (expanded === key) setExpanded(null);
    } catch {
      toast.error("Failed to delete block");
    } finally {
      setDeleting(false);
    }
  }

  async function duplicateBlock(block: Block) {
    const baseKey = block.key.replace(/_\d+$/, "");
    let suffix = 2;
    while (blocks.find((b) => b.key === `${baseKey}_${suffix}`)) suffix++;
    const newKey = `${baseKey}_${suffix}`;
    setDuplicating(block.key);
    try {
      await api.post(`/page-blocks`, {
        key:        newKey,
        label:      `${block.label} (Copy)`,
        sort_order: sorted.length + 1,
        content:    block.content,
      }, accessToken!);
      toast.success("Block duplicated");
      mutate();
    } catch {
      toast.error("Failed to duplicate block");
    } finally {
      setDuplicating(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Page Blocks</h1>
          <p className="text-slate-500 text-sm mt-1">
            Drag to reorder · toggle to show/hide · click edit to change content.
          </p>
        </div>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0"
        >
          <Plus size={13} /> Add Block
        </button>
      </div>

      {/* Add block panel */}
      {addOpen && (
        <div className="card p-5 mb-4 border-navy-200 bg-navy-50/30">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">New Block</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Block Type</label>
              <select
                value={newType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="input-base"
              >
                {BLOCK_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
                <option value="custom">Custom…</option>
              </select>
            </div>

            {newType === "custom" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Block Key <span className="text-slate-400 font-normal">(unique, no spaces)</span></label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  placeholder="e.g. partners"
                  className="input-base"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Label <span className="text-slate-400 font-normal">(shown in this panel)</span></label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Partner Logos"
                className="input-base"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={addBlock} disabled={adding} className="btn-primary !py-2 !px-5 !text-xs">
                {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add Block
              </button>
              <button onClick={() => setAddOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        </div>
      ) : error ? (
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load page blocks.</p>
          <p className="text-slate-400 text-xs mt-1 font-mono">{error?.message}</p>
          <p className="text-slate-400 text-xs mt-1">If this says "Unauthorized", sign out and sign back in.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">No blocks found.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((block, idx) => (
            <div
              key={block.key}
              draggable
              onDragStart={() => onDragStart(block.key)}
              onDragOver={(e) => onDragOver(e, block.key)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, block.key)}
              onDragEnd={onDragEnd}
              className={cn(
                "card transition-all duration-150",
                !block.is_visible && "opacity-60",
                draggedKey === block.key && "opacity-40 scale-[0.99]",
                dragOverKey === block.key && "ring-2 ring-navy-400 ring-offset-1"
              )}
            >
              <div className="p-4 flex items-center gap-3">
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
                  <GripVertical size={16} />
                </div>

                {/* Order badge */}
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy-900 text-sm">{block.label}</div>
                  <div className="text-xs text-slate-400 font-mono">{block.key}</div>
                </div>

                {/* Enable / disable toggle */}
                <button
                  onClick={() => toggleVisibility(block)}
                  className="flex items-center gap-2"
                  title={block.is_visible ? "Click to disable" : "Click to enable"}
                >
                  <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${block.is_visible ? "bg-emerald-500" : "bg-slate-200"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${block.is_visible ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className={`text-xs font-semibold w-14 text-left ${block.is_visible ? "text-emerald-700" : "text-slate-400"}`}>
                    {block.is_visible ? "Enabled" : "Disabled"}
                  </span>
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => duplicateBlock(block)}
                  disabled={!!duplicating}
                  title="Duplicate block"
                  className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  {duplicating === block.key ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
                </button>

                {/* Delete */}
                {confirmDelete === block.key ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-600 font-semibold">Delete?</span>
                    <button
                      onClick={() => deleteBlock(block.key)}
                      disabled={deleting}
                      className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      {deleting ? <Loader2 size={11} className="animate-spin" /> : "Yes"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(block.key)}
                    title="Delete block"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                {/* Edit */}
                <button
                  onClick={() => setExpanded(expanded === block.key ? null : block.key)}
                  className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {expanded === block.key ? <X size={15} /> : <Edit2 size={15} />}
                </button>
              </div>

              {expanded === block.key && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                  <BlockEditor block={block} token={accessToken!} onSave={() => mutate()} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6">
        Changes take effect on the marketing site after the next page load (60-second cache).
      </p>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Loader2, Save, Plus, Trash2,
  Award, BookOpen, Users, HelpCircle, Settings, ChevronRight,
  Globe, EyeOff, Megaphone, Star, Quote, Tag, AlertCircle, RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type CurriculumItem  = { title: string; description: string; lessons: number };
type FaqItem         = { question: string; answer: string };
type Testimonial     = { name: string; role: string; company: string; quote: string; avatar_initials: string };
type MarketingMeta   = {
  reviews_rating:      string;
  reviews_count:       string;
  social_proof:        string;
  hero_badge_label:    string;
  prerequisites:       string;
  enrollment_includes: string[];
};

const DEFAULT_MARKETING: MarketingMeta = {
  reviews_rating:      "4.9",
  reviews_count:       "1,200+",
  social_proof:        "Join 3,200+ certified professionals",
  hero_badge_label:    "Professional Certification",
  prerequisites:       "",
  enrollment_includes: [
    "Practice exam & study guides",
    "Digital certificate + Open Badge",
    "LinkedIn credential integration",
    "30-day money-back guarantee",
  ],
};

const DEFAULT_TESTIMONIAL: Testimonial = { name: "", role: "", company: "", quote: "", avatar_initials: "" };

type Cert = {
  id: string; slug: string; acronym: string; title: string;
  level: string; status: string; badge_icon: string;
  price: number; description: string; long_description: string;
  learning_outcomes: string[]; target_audience: string[];
  curriculum_overview: CurriculumItem[];
  faqs_json: FaqItem[];
  marketing_meta: MarketingMeta;
  testimonials: Testimonial[];
  skills: string[];
  related_slugs: string[];
  certificate_preview_url: string;
  duration_weeks: number; total_lessons: number; total_hours: number;
  passing_score: number; exam_duration_minutes: number;
  exam_questions_count: number; validity_years: number;
  max_retakes_included: number; retake_fee: number;
  _count?: { enrollments: number; applications: number };
};

const LEVELS   = ["pre_certificate", "foundation", "advanced", "specialist", "executive", "other"] as const;
const STATUSES = ["coming_soon", "active", "archived"] as const;

const LEVEL_LABEL: Record<string, string> = {
  pre_certificate: "Pre-Certificate",
  foundation: "Foundation",
  advanced:   "Advanced",
  specialist: "Specialist",
  executive:  "Executive",
  other:      "Other",
};

const TABS = [
  { id: "overview",     label: "Overview",       icon: Award },
  { id: "content",      label: "Content",        icon: BookOpen },
  { id: "audience",     label: "Audience",       icon: Users },
  { id: "exam",         label: "Exam & Pricing", icon: Settings },
  { id: "faqs",         label: "FAQs",           icon: HelpCircle },
  { id: "marketing",    label: "Marketing",      icon: Megaphone },
  { id: "testimonials", label: "Testimonials",   icon: Quote },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Helpers ────────────────────────────────────────────────────────────────

function safeArray<T>(val: unknown, fallback: T[] = []): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

function safeMeta(val: unknown): MarketingMeta {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const m = val as Partial<MarketingMeta>;
    return {
      reviews_rating:      m.reviews_rating      ?? DEFAULT_MARKETING.reviews_rating,
      reviews_count:       m.reviews_count        ?? DEFAULT_MARKETING.reviews_count,
      social_proof:        m.social_proof          ?? DEFAULT_MARKETING.social_proof,
      hero_badge_label:    m.hero_badge_label      ?? DEFAULT_MARKETING.hero_badge_label,
      prerequisites:       m.prerequisites          ?? "",
      enrollment_includes: safeArray<string>(m.enrollment_includes, DEFAULT_MARKETING.enrollment_includes),
    };
  }
  return { ...DEFAULT_MARKETING };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function StringListEditor({
  label, values, onChange, placeholder, hint,
}: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim();
    if (!t) return;
    onChange([...values, t]);
    setDraft("");
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 mb-2">{hint}</p>}
      <div className="space-y-1.5 mb-2">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <input
              className="input-base flex-1 !py-1.5 !text-sm"
              value={v}
              onChange={(e) => { const n = [...values]; n[i] = e.target.value; onChange(n); }}
            />
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input-base flex-1 !py-1.5 !text-sm" placeholder={placeholder ?? "Add item…"}
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="btn-outline !py-1.5 !px-3 !text-xs flex-shrink-0">
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

function CurriculumEditor({ items, onChange }: { items: CurriculumItem[]; onChange: (v: CurriculumItem[]) => void }) {
  function update(i: number, f: keyof CurriculumItem, v: string | number) {
    const n = [...items]; n[i] = { ...n[i], [f]: v }; onChange(n);
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">Curriculum Modules</label>
      <div className="space-y-3 mb-3">
        {items.map((item, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50 group">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-navy-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
              <div className="flex-1 space-y-2">
                <input className="input-base !py-1.5 !text-sm" placeholder="Module title" value={item.title} onChange={(e) => update(i, "title", e.target.value)} />
                <input className="input-base !py-1.5 !text-sm" placeholder="Short description" value={item.description} onChange={(e) => update(i, "description", e.target.value)} />
                <div className="flex items-center gap-2">
                  <input className="input-base !py-1.5 !text-sm w-24" type="number" min="0" value={item.lessons} onChange={(e) => update(i, "lessons", parseInt(e.target.value) || 0)} />
                  <span className="text-xs text-slate-500">lessons</span>
                </div>
              </div>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity mt-0.5 flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, { title: "", description: "", lessons: 0 }])}
        className="btn-outline !py-1.5 !px-3 !text-xs w-full">
        <Plus size={12} /> Add Module
      </button>
    </div>
  );
}

function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (v: FaqItem[]) => void }) {
  function update(i: number, f: keyof FaqItem, v: string) {
    const n = [...items]; n[i] = { ...n[i], [f]: v }; onChange(n);
  }
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2 group">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">FAQ {i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
              <Trash2 size={13} />
            </button>
          </div>
          <input className="input-base !py-1.5 !text-sm" placeholder="Question" value={item.question} onChange={(e) => update(i, "question", e.target.value)} />
          <textarea className="input-base h-20 resize-none !text-sm" placeholder="Answer" value={item.answer} onChange={(e) => update(i, "answer", e.target.value)} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { question: "", answer: "" }])}
        className="btn-outline !py-1.5 !px-3 !text-xs w-full">
        <Plus size={12} /> Add FAQ
      </button>
    </div>
  );
}

function TestimonialsEditor({ items, onChange }: { items: Testimonial[]; onChange: (v: Testimonial[]) => void }) {
  function update(i: number, f: keyof Testimonial, v: string) {
    const n = [...items]; n[i] = { ...n[i], [f]: v }; onChange(n);
  }
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 group bg-slate-50">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Testimonial {i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
              <Trash2 size={13} />
            </button>
          </div>
          <textarea
            className="input-base h-24 resize-none !text-sm"
            placeholder="Quote — what did they say about the certification?"
            value={item.quote}
            onChange={(e) => update(i, "quote", e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Full Name</label>
              <input className="input-base !py-1.5 !text-sm" placeholder="Jane Smith" value={item.name} onChange={(e) => update(i, "name", e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Role / Title</label>
              <input className="input-base !py-1.5 !text-sm" placeholder="Product Manager" value={item.role} onChange={(e) => update(i, "role", e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Company</label>
              <input className="input-base !py-1.5 !text-sm" placeholder="Accenture" value={item.company} onChange={(e) => update(i, "company", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Avatar Initials (shown if no photo)</label>
              <input className="input-base !py-1.5 !text-sm" placeholder="JS" maxLength={3} value={item.avatar_initials} onChange={(e) => update(i, "avatar_initials", e.target.value.toUpperCase())} />
            </div>
            {item.avatar_initials && (
              <div className="w-10 h-10 rounded-full bg-navy-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-4">
                {item.avatar_initials}
              </div>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { ...DEFAULT_TESTIMONIAL }])}
        className="btn-outline !py-1.5 !px-3 !text-xs w-full">
        <Plus size={12} /> Add Testimonial
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CertEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const [tab, setTab] = useState<TabId>("overview");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    accessToken && id ? [`/admin/certifications/${id}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { shouldRetryOnError: true, errorRetryInterval: 3000 }
  );

  const cert: Cert | null = data?.data ?? data ?? null;

  // ── Form state ─────────────────────────────────────────────────────────
  const [acronym,              setAcronym]              = useState("");
  const [title,                setTitle]                = useState("");
  const [slug,                 setSlug]                 = useState("");
  const [level,                setLevel]                = useState("foundation");
  const [status,               setStatus]               = useState("coming_soon");
  const [badgeIcon,            setBadgeIcon]            = useState("🎓");
  const [description,          setDescription]          = useState("");
  const [longDesc,             setLongDesc]             = useState("");
  const [outcomes,             setOutcomes]             = useState<string[]>([]);
  const [audience,             setAudience]             = useState<string[]>([]);
  const [skills,               setSkills]               = useState<string[]>([]);
  const [curriculum,           setCurriculum]           = useState<CurriculumItem[]>([]);
  const [faqs,                 setFaqs]                 = useState<FaqItem[]>([]);
  const [testimonials,         setTestimonials]         = useState<Testimonial[]>([]);
  const [relatedSlugs,         setRelatedSlugs]         = useState<string[]>([]);
  const [certPreviewUrl,       setCertPreviewUrl]       = useState("");
  const [price,                setPrice]                = useState("");
  const [durationWeeks,        setDurationWeeks]        = useState("");
  const [totalLessons,         setTotalLessons]         = useState("");
  const [totalHours,           setTotalHours]           = useState("");
  const [passingScore,         setPassingScore]         = useState("");
  const [examMins,             setExamMins]             = useState("");
  const [examQuestions,        setExamQuestions]        = useState("");
  const [validityYears,        setValidityYears]        = useState("");
  const [maxRetakes,           setMaxRetakes]           = useState("");
  const [retakeFee,            setRetakeFee]            = useState("");
  const [reviewsRating,        setReviewsRating]        = useState(DEFAULT_MARKETING.reviews_rating);
  const [reviewsCount,         setReviewsCount]         = useState(DEFAULT_MARKETING.reviews_count);
  const [socialProof,          setSocialProof]          = useState(DEFAULT_MARKETING.social_proof);
  const [heroBadgeLabel,       setHeroBadgeLabel]       = useState(DEFAULT_MARKETING.hero_badge_label);
  const [prerequisites,        setPrerequisites]        = useState("");
  const [enrollmentIncludes,   setEnrollmentIncludes]   = useState<string[]>(DEFAULT_MARKETING.enrollment_includes);

  useEffect(() => {
    if (!cert) return;
    setAcronym(cert.acronym ?? "");
    setTitle(cert.title ?? "");
    setSlug(cert.slug ?? "");
    setLevel(cert.level ?? "foundation");
    setStatus(cert.status ?? "coming_soon");
    setBadgeIcon(cert.badge_icon ?? "🎓");
    setDescription(cert.description ?? "");
    setLongDesc(cert.long_description ?? "");
    setOutcomes(safeArray<string>(cert.learning_outcomes));
    setAudience(safeArray<string>(cert.target_audience));
    setSkills(safeArray<string>(cert.skills));
    setCurriculum(safeArray<CurriculumItem>(cert.curriculum_overview));
    setFaqs(safeArray<FaqItem>(cert.faqs_json));
    setTestimonials(safeArray<Testimonial>(cert.testimonials));
    setRelatedSlugs(safeArray<string>(cert.related_slugs));
    setCertPreviewUrl(cert.certificate_preview_url ?? "");
    setPrice(String(cert.price ?? ""));
    setDurationWeeks(String(cert.duration_weeks ?? ""));
    setTotalLessons(String(cert.total_lessons ?? ""));
    setTotalHours(String(cert.total_hours ?? ""));
    setPassingScore(String(cert.passing_score ?? ""));
    setExamMins(String(cert.exam_duration_minutes ?? ""));
    setExamQuestions(String(cert.exam_questions_count ?? ""));
    setValidityYears(String(cert.validity_years ?? ""));
    setMaxRetakes(String(cert.max_retakes_included ?? ""));
    setRetakeFee(String(cert.retake_fee ?? ""));
    const meta = safeMeta(cert.marketing_meta);
    setReviewsRating(meta.reviews_rating);
    setReviewsCount(meta.reviews_count);
    setSocialProof(meta.social_proof);
    setHeroBadgeLabel(meta.hero_badge_label);
    setPrerequisites(meta.prerequisites);
    setEnrollmentIncludes(meta.enrollment_includes);
  }, [cert]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/admin/certifications/${id}`, {
        acronym, title, slug, level, status,
        badge_icon:            badgeIcon,
        description,
        long_description:      longDesc,
        learning_outcomes:     outcomes,
        target_audience:       audience,
        skills,
        curriculum_overview:   curriculum,
        faqs_json:             faqs,
        testimonials,
        related_slugs:         relatedSlugs,
        certificate_preview_url: certPreviewUrl,
        marketing_meta: {
          reviews_rating:      reviewsRating,
          reviews_count:       reviewsCount,
          social_proof:        socialProof,
          hero_badge_label:    heroBadgeLabel,
          prerequisites,
          enrollment_includes: enrollmentIncludes,
        },
        price:                 parseFloat(price) || 0,
        duration_weeks:        parseInt(durationWeeks) || 0,
        total_lessons:         parseInt(totalLessons) || 0,
        total_hours:           parseFloat(totalHours) || 0,
        passing_score:         parseInt(passingScore) || 70,
        exam_duration_minutes: parseInt(examMins) || 90,
        exam_questions_count:  parseInt(examQuestions) || 75,
        validity_years:        parseInt(validityYears) || 2,
        max_retakes_included:  parseInt(maxRetakes) || 2,
        retake_fee:            parseFloat(retakeFee) || 99,
      }, accessToken!);
      toast.success("Saved!");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    active:      "text-emerald-700 bg-emerald-50 border-emerald-200",
    coming_soon: "text-amber-700 bg-amber-50 border-amber-200",
    archived:    "text-slate-500 bg-slate-100 border-slate-200",
  };

  if (isLoading) return (
    <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
      <Loader2 size={24} className="animate-spin text-slate-300" />
      <p className="text-slate-400 text-xs">Loading certification…</p>
    </div>
  );
  if (error) return (
    <div className="p-8 max-w-sm">
      <AlertCircle size={32} className="text-red-300 mb-3" />
      <p className="text-slate-600 font-semibold text-sm mb-1">Could not load this certification</p>
      <p className="text-slate-400 text-xs mb-4">The backend may be down or the ID is invalid.</p>
      <div className="flex gap-2">
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs">
          <RefreshCw size={12} /> Retry
        </button>
        <Link href="/design/certifications/new" className="btn-outline !py-1.5 !px-4 !text-xs">← Back</Link>
      </div>
    </div>
  );
  if (!cert) return (
    <div className="p-8">
      <p className="text-slate-500">Certification not found.</p>
      <Link href="/design/certifications/new" className="text-navy-700 text-sm mt-2 inline-block">← Back</Link>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Link href="/design/certifications/new" className="hover:text-slate-600">Certifications</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700 font-semibold">{cert.acronym}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-2xl flex-shrink-0">{badgeIcon || "🎓"}</div>
            <div>
              <h1 className="text-xl font-display font-black text-navy-900">{title || cert.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[status] ?? statusColors.coming_soon}`}>
                  {status === "active" ? <Globe size={9} /> : <EyeOff size={9} />}
                  {status.replace("_", " ")}
                </span>
                {cert._count?.enrollments !== undefined && (
                  <span className="text-xs text-slate-400">{cert._count.enrollments} enrolled</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary !py-2 !px-5 !text-xs flex-shrink-0 disabled:opacity-60">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                tab === t.id ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Badge Icon"><input className="input-base" value={badgeIcon} onChange={(e) => setBadgeIcon(e.target.value)} maxLength={4} /></Field>
            <Field label="Acronym"><input className="input-base" value={acronym} onChange={(e) => setAcronym(e.target.value.toUpperCase())} maxLength={10} /></Field>
          </div>
          <Field label="Full Title"><input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Slug" hint={`paii.ca/certifications/${slug || "..."}`}>
            <input className="input-base font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Level">
              <select className="input-base" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l] ?? l}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      {tab === "content" && (
        <div className="space-y-6">
          <Field label="Short Description">
            <textarea className="input-base h-20 resize-none" placeholder="One to two sentences for catalog cards." value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Long Description">
            <textarea className="input-base h-36 resize-none" placeholder="Full description shown in the hero section." value={longDesc} onChange={(e) => setLongDesc(e.target.value)} />
          </Field>
          <div className="border-t border-slate-100 pt-5">
            <Field label="Certificate Preview Image URL" hint="Image shown in the 'Your Certificate' section on the marketing page.">
              <input className="input-base" placeholder="https://..." value={certPreviewUrl} onChange={(e) => setCertPreviewUrl(e.target.value)} />
              {certPreviewUrl && (
                <img src={certPreviewUrl} alt="Certificate preview" className="mt-3 rounded-xl border border-slate-200 max-h-40 object-contain" />
              )}
            </Field>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <CurriculumEditor items={curriculum} onChange={setCurriculum} />
          </div>
        </div>
      )}

      {/* ── AUDIENCE ── */}
      {tab === "audience" && (
        <div className="space-y-6">
          <StringListEditor label="Skills You'll Gain" values={skills} onChange={setSkills}
            placeholder="e.g. Prompt Engineering"
            hint="Shown as pill tags in the hero — keep them short (2–4 words each)." />
          <div className="border-t border-slate-100 pt-5">
            <StringListEditor label="Learning Outcomes" values={outcomes} onChange={setOutcomes}
              placeholder="e.g. Apply generative AI tools across business workflows" />
          </div>
          <div className="border-t border-slate-100 pt-5">
            <StringListEditor label="Target Audience" values={audience} onChange={setAudience}
              placeholder="e.g. Business professionals" />
          </div>
          <div className="border-t border-slate-100 pt-5">
            <StringListEditor label="Related Certifications (by slug)" values={relatedSlugs} onChange={setRelatedSlugs}
              placeholder="e.g. certified-ai-manager"
              hint="Slugs of certs shown in the 'What's Next?' section at the bottom of the page." />
          </div>
        </div>
      )}

      {/* ── EXAM & PRICING ── */}
      {tab === "exam" && (
        <div className="space-y-5">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (USD)"><input className="input-base" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
              <Field label="Retake Fee (USD)"><input className="input-base" type="number" min="0" value={retakeFee} onChange={(e) => setRetakeFee(e.target.value)} /></Field>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course Details</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Duration (weeks)"><input className="input-base" type="number" min="1" value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} /></Field>
              <Field label="Total Lessons"><input className="input-base" type="number" min="0" value={totalLessons} onChange={(e) => setTotalLessons(e.target.value)} /></Field>
              <Field label="Total Hours"><input className="input-base" type="number" min="0" step="0.5" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} /></Field>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration (minutes)"><input className="input-base" type="number" min="1" value={examMins} onChange={(e) => setExamMins(e.target.value)} /></Field>
              <Field label="Questions Count"><input className="input-base" type="number" min="1" value={examQuestions} onChange={(e) => setExamQuestions(e.target.value)} /></Field>
              <Field label="Passing Score %"><input className="input-base" type="number" min="1" max="100" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} /></Field>
              <Field label="Validity (years)"><input className="input-base" type="number" min="1" value={validityYears} onChange={(e) => setValidityYears(e.target.value)} /></Field>
              <Field label="Retakes Included"><input className="input-base" type="number" min="0" value={maxRetakes} onChange={(e) => setMaxRetakes(e.target.value)} /></Field>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQs ── */}
      {tab === "faqs" && <FaqEditor items={faqs} onChange={setFaqs} />}

      {/* ── MARKETING ── */}
      {tab === "marketing" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Social Proof</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Star Rating" hint={`Shown as ★ ${reviewsRating || "4.9"} in the hero`}>
                <input className="input-base" placeholder="4.9" value={reviewsRating} onChange={(e) => setReviewsRating(e.target.value)} />
              </Field>
              <Field label="Review Count" hint='e.g. "1,200+ reviews"'>
                <input className="input-base" placeholder="1,200+" value={reviewsCount} onChange={(e) => setReviewsCount(e.target.value)} />
              </Field>
            </div>
            <Field label="Social Proof Line" hint="Shown in the sidebar CTA below the Apply button">
              <input className="input-base" placeholder="Join 3,200+ certified professionals" value={socialProof} onChange={(e) => setSocialProof(e.target.value)} />
            </Field>
          </div>
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hero</p>
            <Field label="Badge Label" hint="Dark pill shown above the title">
              <input className="input-base" placeholder="Professional Certification" value={heroBadgeLabel} onChange={(e) => setHeroBadgeLabel(e.target.value)} />
            </Field>
            <Field label="Prerequisites Note" hint="Optional — shown under the breadcrumb if set">
              <input className="input-base" placeholder="e.g. CAIP recommended before taking this program" value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} />
            </Field>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <StringListEditor label="What's Included (Enrollment Card)" values={enrollmentIncludes} onChange={setEnrollmentIncludes}
              placeholder="e.g. Digital certificate + Open Badge"
              hint="Bullet points in the enrollment card alongside auto-generated lines for hours, lessons, and exam." />
          </div>
          {/* Hero preview */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hero Preview</p>
            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">{heroBadgeLabel || "Professional Certification"}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={11} className="text-white fill-white" />)}
                <span className="text-white text-xs ml-1">{reviewsRating || "4.9"} ({reviewsCount || "1,200+ reviews"})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TESTIMONIALS ── */}
      {tab === "testimonials" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Add 3 testimonials for best results. They appear in a row on the marketing page.</p>
          <TestimonialsEditor items={testimonials} onChange={setTestimonials} />
        </div>
      )}

      {/* Save footer */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
        </button>
      </div>
    </div>
  );
}

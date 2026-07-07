"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Loader2, Save, Plus, Trash2,
  Award, BookOpen, Users, HelpCircle, Settings, ChevronRight,
  Globe, EyeOff, Megaphone, Star, Quote, Tag, AlertCircle, RefreshCw, LayoutTemplate, Code2, Eye, Copy, Check, Upload,
  GraduationCap, Sparkles, X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type CurriculumItem  = { title: string; description: string; lessons: number };
type FaqItem         = { question: string; answer: string };
type Testimonial     = { name: string; role: string; company: string; quote: string; avatar_initials: string };
type Stat     = { value: string; label: string };
type Step     = { title: string; description: string };
type Resource = { title: string; description: string };

type PageTabsData = {
  right_for_you: { headline: string; body: string; stats: Stat[]; requirements: string[]; not_ready_text: string; not_ready_href: string };
  path:          { headline: string; body: string; steps: Step[] };
  prepare:       { headline: string; body: string; resources: Resource[] };
  maintenance:   { headline: string; body: string; renewal_items: string[] };
};

type MarketingMeta   = {
  reviews_rating:      string;
  reviews_count:       string;
  social_proof:        string;
  hero_badge_label:    string;
  prerequisites:       string;
  enrollment_includes: string[];
  page_tabs?:          PageTabsData;
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
  min_years_experience?: number | null;
  min_training_hours?: number | null;
  is_featured?: boolean;
  _count?: { enrollments: number; applications: number };
  instructors?: {
    id: string; user_id: string; is_lead: boolean;
    user?: { email?: string; profile?: { first_name?: string; last_name?: string; avatar_url?: string } };
  }[];
};

const LEVELS   = ["foundation", "advanced", "executive", "specialist"] as const;
const STATUSES = ["coming_soon", "active", "archived"] as const;

const TABS = [
  { id: "overview",     label: "Overview",          icon: Award },
  { id: "content",      label: "Content",           icon: BookOpen },
  { id: "audience",     label: "Audience",          icon: Users },
  { id: "exam",         label: "Exam & Pricing",    icon: Settings },
  { id: "enrollments",  label: "Enrollments",       icon: Users },
  { id: "instructors",  label: "Instructors",       icon: GraduationCap },
  { id: "faqs",         label: "FAQs",              icon: HelpCircle },
  { id: "marketing",    label: "Marketing",         icon: Megaphone },
  { id: "testimonials", label: "Testimonials",      icon: Quote },
  { id: "page_tabs",    label: "Page Tabs",         icon: LayoutTemplate },
  { id: "certificate",  label: "Certificate Design",icon: Code2 },
] as const;

type TabId = typeof TABS[number]["id"];

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
      page_tabs:           m.page_tabs,
    };
  }
  return { ...DEFAULT_MARKETING };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function StringListEditor({ label, values, onChange, placeholder, hint }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string;
}) {
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
            <input className="input-base flex-1 !py-1.5 !text-sm" value={v}
              onChange={(e) => { const n = [...values]; n[i] = e.target.value; onChange(n); }} />
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
          <textarea className="input-base h-24 resize-none !text-sm"
            placeholder="Quote — what did they say about the certification?"
            value={item.quote} onChange={(e) => update(i, "quote", e.target.value)} />
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
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Avatar Initials</label>
              <input className="input-base !py-1.5 !text-sm" placeholder="JS" maxLength={3}
                value={item.avatar_initials} onChange={(e) => update(i, "avatar_initials", e.target.value.toUpperCase())} />
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

/* ── Visual Certificate Builder ────────────────────────────────────────── */

type DesignEl = {
  id: string;
  variable: string;
  label: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
};

const VISUAL_VARS = [
  { variable: "{{STUDENT_NAME}}",    label: "Student Name" },
  { variable: "{{CERT_TITLE}}",      label: "Cert Title" },
  { variable: "{{CERT_ACRONYM}}",    label: "Acronym" },
  { variable: "{{CERT_NUMBER}}",     label: "Cert Number" },
  { variable: "{{ISSUE_DATE}}",      label: "Issue Date" },
  { variable: "{{EXPIRY_DATE}}",     label: "Expiry Date" },
  { variable: "{{EXAM_SCORE}}",      label: "Exam Score" },
  { variable: "{{QR_CODE_URL}}",     label: "QR Code" },
];

function VisualCertBuilder({ onGenerate }: { onGenerate: (html: string) => void }) {
  const [bgImage,   setBgImage]   = useState<string | null>(null);
  const [bgW,       setBgW]       = useState(1122);
  const [bgH,       setBgH]       = useState(794);
  const [elements,  setElements]  = useState<DesignEl[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [dragging,  setDragging]  = useState<{
    id: string; startMX: number; startMY: number; startX: number; startY: number;
  } | null>(null);

  const canvasRef  = useRef<HTMLDivElement>(null);
  const bgFileRef  = useRef<HTMLInputElement>(null);

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setBgImage(src);
      const img = new Image();
      img.onload = () => { setBgW(img.naturalWidth); setBgH(img.naturalHeight); };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addElement(variable: string, label: string) {
    const id = Math.random().toString(36).slice(2);
    const isQr = variable === "{{QR_CODE_URL}}";
    setElements((prev) => [
      ...prev,
      { id, variable, label, x: 10, y: 10 + prev.length * 8, fontSize: isQr ? 80 : 24, color: "#1a1a1a", bold: false },
    ]);
    setSelected(id);
  }

  function updateEl(id: string, patch: Partial<DesignEl>) {
    setElements((prev) => prev.map((el) => el.id === id ? { ...el, ...patch } : el));
  }

  function onMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find((el) => el.id === id);
    if (!el) return;
    setSelected(id);
    setDragging({ id, startMX: e.clientX, startMY: e.clientY, startX: el.x, startY: el.y });
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragging.startMX) / rect.width)  * 100;
      const dy = ((e.clientY - dragging.startMY) / rect.height) * 100;
      setElements((prev) => prev.map((el) =>
        el.id === dragging.id
          ? { ...el, x: Math.max(0, Math.min(95, dragging.startX + dx)), y: Math.max(0, Math.min(95, dragging.startY + dy)) }
          : el,
      ));
    }
    function onUp() { setDragging(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  function generate() {
    if (!bgImage) return;
    const elsHtml = elements.map((el) => {
      if (el.variable === "{{QR_CODE_URL}}") {
        return `  <img src="{{QR_CODE_URL}}" style="position:absolute;left:${el.x.toFixed(2)}%;top:${el.y.toFixed(2)}%;width:${el.fontSize}px;height:${el.fontSize}px;" />`;
      }
      return `  <span style="position:absolute;left:${el.x.toFixed(2)}%;top:${el.y.toFixed(2)}%;font-size:${el.fontSize}px;color:${el.color};font-weight:${el.bold ? "bold" : "normal"};white-space:nowrap;">${el.variable}</span>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{width:${bgW}px;height:${bgH}px;overflow:hidden;}
.cert{position:relative;width:${bgW}px;height:${bgH}px;}
.cert img.bg{position:absolute;inset:0;width:100%;height:100%;}
</style>
</head>
<body>
<div class="cert">
  <img class="bg" src="${bgImage}" />
${elsHtml}
</div>
</body>
</html>`;
    onGenerate(html);
  }

  const selectedEl = elements.find((el) => el.id === selected);

  if (!bgImage) {
    return (
      <div>
        <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        <button
          type="button"
          onClick={() => bgFileRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-14 text-center hover:border-navy-300 hover:bg-navy-50/30 transition-colors"
        >
          <Upload size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Upload certificate background</p>
          <p className="text-xs text-slate-400 mt-1">PNG or JPG — export your PDF design as a high-res image first</p>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variable add buttons */}
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Click a variable to place it, then drag to position</p>
        <div className="flex flex-wrap gap-1.5">
          {VISUAL_VARS.map(({ variable, label }) => (
            <button key={variable} type="button" onClick={() => addElement(variable, label)}
              className="px-2.5 py-1 bg-navy-50 hover:bg-navy-100 border border-navy-200 text-navy-700 text-xs font-semibold rounded-lg transition-colors">
              + {label}
            </button>
          ))}
          <button type="button"
            onClick={() => { setBgImage(null); setElements([]); setSelected(null); }}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold rounded-lg transition-colors ml-auto">
            Change Image
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-xl border-2 border-slate-200 select-none cursor-default"
        style={{ paddingBottom: `${(bgH / bgW) * 100}%` }}
        onClick={() => setSelected(null)}
      >
        <div className="absolute inset-0">
          <img src={bgImage} className="absolute inset-0 w-full h-full" alt="Certificate background" draggable={false} />
          {elements.map((el) => (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                cursor: "move",
                outline: selected === el.id ? "2px dashed #1e40af" : "1px dashed rgba(100,100,100,0.4)",
                padding: "2px 4px",
                backgroundColor: selected === el.id ? "rgba(219,234,254,0.55)" : "transparent",
                borderRadius: 3,
              }}
              onMouseDown={(e) => onMouseDown(e, el.id)}
              onClick={(e) => { e.stopPropagation(); setSelected(el.id); }}
            >
              {el.variable === "{{QR_CODE_URL}}" ? (
                <div style={{ width: el.fontSize, height: el.fontSize, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
                  <span style={{ fontSize: 10, color: "#555" }}>QR</span>
                </div>
              ) : (
                <span style={{ fontSize: el.fontSize, color: el.color, fontWeight: el.bold ? "bold" : "normal", whiteSpace: "nowrap", lineHeight: 1 }}>
                  {el.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected element properties */}
      {selectedEl && (
        <div className="border border-navy-100 rounded-xl p-4 bg-navy-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-navy-800">{selectedEl.label}</p>
            <button type="button"
              onClick={() => { setElements((p) => p.filter((e) => e.id !== selected)); setSelected(null); }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold">
              <Trash2 size={12} className="inline mr-1" />Remove
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                {selectedEl.variable === "{{QR_CODE_URL}}" ? "Size (px)" : "Font Size (px)"}
              </label>
              <input type="number" className="input-base !py-1 !text-xs" min={8} max={300}
                value={selectedEl.fontSize}
                onChange={(e) => updateEl(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })} />
            </div>
            {selectedEl.variable !== "{{QR_CODE_URL}}" && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Color</label>
                  <input type="color" className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer"
                    value={selectedEl.color}
                    onChange={(e) => updateEl(selectedEl.id, { color: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Weight</label>
                  <button type="button"
                    onClick={() => updateEl(selectedEl.id, { bold: !selectedEl.bold })}
                    className={cn("w-full py-1.5 text-xs font-bold rounded-lg border transition-colors",
                      selectedEl.bold ? "bg-navy-700 text-white border-navy-700" : "border-slate-200 text-slate-600 bg-white")}>
                    Bold
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {elements.length > 0 && (
        <button type="button" onClick={generate}
          className="btn-primary w-full !py-2.5 !text-sm">
          <Check size={14} /> Use This Design
        </button>
      )}
    </div>
  );
}

// ─── Cert Enrollments Tab ─────────────────────────────────────────────────────

function CertEnrollmentsTab({ certId, token }: { certId: string; token: string }) {
  const { data: raw, isLoading, error, mutate } = useSWR(
    ["/admin/certifications", certId, "enrollments", token],
    ([,id,,t]) => api.get<any>(`/admin/certifications/${id}/enrollments`, t),
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const enrollments: any[] = (() => {
    const d = (raw as any)?.data ?? raw;
    return Array.isArray(d) ? d : [];
  })();

  async function handleDelete(enrollment: any) {
    const name = `${enrollment.user?.profile?.first_name ?? ""} ${enrollment.user?.profile?.last_name ?? ""}`.trim() || enrollment.user?.email;
    if (!confirm(`Remove ${name}'s enrollment? This will delete all their progress and exam attempts for this certification.`)) return;
    setDeletingId(enrollment.id);
    try {
      await api.delete(`/enrollments/${enrollment.id}`, token);
      toast.success("Enrollment removed");
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove enrollment");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return (
    <div className="card p-10 text-center">
      <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
      <p className="text-slate-400 text-xs mt-3">Loading enrollments…</p>
    </div>
  );

  if (error) return (
    <div className="card p-12 text-center">
      <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
      <p className="text-slate-600 text-sm font-semibold">Could not load enrollments</p>
    </div>
  );

  if (enrollments.length === 0) return (
    <div className="card p-12 text-center">
      <Users size={36} className="text-slate-200 mx-auto mb-3" />
      <p className="text-slate-600 text-sm font-semibold">No enrollments yet</p>
      <p className="text-slate-400 text-xs mt-1">Students will appear here once they enroll in this certification.</p>
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Progress</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Certificate</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Enrolled</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {enrollments.map((enrollment) => {
              const profile = enrollment.user?.profile;
              const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || enrollment.user?.email;
              const statusColor = enrollment.completed_at
                ? "bg-emerald-50 text-emerald-700"
                : enrollment.status === "active"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-600";
              const statusLabel = enrollment.completed_at ? "Completed" : (enrollment.status ?? "Active");
              const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString();

              return (
                <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{enrollment.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", statusColor)}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full max-w-xs">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${enrollment.progress_percentage ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{enrollment.progress_percentage ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {enrollment.certificate
                      ? <span className="text-emerald-700 font-semibold">Issued {new Date(enrollment.certificate.issued_at).toLocaleDateString()}</span>
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{enrolledDate}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={deletingId === enrollment.id}
                      onClick={() => handleDelete(enrollment)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40"
                      title="Remove enrollment"
                    >
                      {deletingId === enrollment.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Cert Instructors Tab ─────────────────────────────────────────────────────

function CertInstructorsTab({
  certId, token, instructors, onRefresh,
}: {
  certId: string; token: string; instructors: NonNullable<Cert["instructors"]>; onRefresh: () => void;
}) {
  const { data: usersRaw } = useSWR(
    token ? ["/users?limit=200", token] : null,
    ([url, t]) => api.get<any>(url, t)
  );

  const users: any[] = (() => {
    const d = (usersRaw as any)?.data?.data ?? (usersRaw as any)?.data ?? usersRaw;
    return Array.isArray(d) ? d : [];
  })();

  const professors = users.filter(
    (u: any) => u.role === "professor" || u.role === "admin" || u.role === "super_admin"
  );

  async function assignInstructor(userId: string, isLead: boolean) {
    await toast.promise(
      api.post(`/admin/certifications/${certId}/instructors`, { user_id: userId, is_lead: isLead }, token)
        .then(() => onRefresh()),
      { loading: "Assigning…", success: "Assigned", error: "Failed" }
    );
  }

  async function removeInstructor(userId: string) {
    await toast.promise(
      api.delete(`/admin/certifications/${certId}/instructors/${userId}`, token).then(() => onRefresh()),
      { loading: "Removing…", success: "Removed", error: "Failed" }
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Instructors */}
      <div className="card p-6">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-1">Assigned Instructors</p>
        <p className="text-[11px] text-slate-400 mb-4">
          Shown in the "Your Instructors" section on the public certification page. Leave empty to hide that section.
        </p>
        {instructors.length === 0 ? (
          <p className="text-xs text-slate-400">No instructors assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {instructors.map((ins) => {
              const p = ins.user?.profile;
              const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || ins.user?.email || "Unknown";
              const initials = [(p?.first_name ?? "")[0], (p?.last_name ?? "")[0]].filter(Boolean).join("").toUpperCase();
              return (
                <div key={ins.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-[10px] font-bold text-navy-600">
                      {initials || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {name}
                        {ins.is_lead && <span className="text-gold-600 font-bold ml-1">★ Lead</span>}
                      </p>
                      {ins.user?.email && <p className="text-xs text-slate-400">{ins.user.email}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeInstructor(ins.user_id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Remove instructor"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Instructor */}
      <div className="card p-6">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">Assign Instructor</p>
        <select
          className="input-base"
          defaultValue=""
          onChange={(e) => {
            const val = e.target.value;
            if (!val) return;
            const [userId, isLeadStr] = val.split("|");
            assignInstructor(userId, isLeadStr === "1");
            e.target.value = "";
          }}
        >
          <option value="" disabled>Select professor to assign…</option>
          {professors
            .filter((p: any) => !instructors.find((i) => i.user_id === p.id))
            .map((p: any) => (
              <optgroup key={p.id} label={`${p.profile?.first_name ?? ""} ${p.profile?.last_name ?? ""} (${p.role})`.trim()}>
                <option value={`${p.id}|0`}>Add as instructor</option>
                <option value={`${p.id}|1`}>Add as lead instructor ★</option>
              </optgroup>
            ))}
        </select>
      </div>
    </div>
  );
}

// ─── Exam Bank Panel ──────────────────────────────────────────────────────────

export default function CertEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const [tab, setTab] = useState<TabId>("overview");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    accessToken && id ? [`/admin/certifications/${id}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { shouldRetryOnError: true, errorRetryInterval: 3000 }
  );

  const cert: Cert | null = data?.data ?? data ?? null;

  const [isFeatured,         setIsFeatured]         = useState(false);
  const [acronym,            setAcronym]            = useState("");
  const [title,              setTitle]              = useState("");
  const [slug,               setSlug]               = useState("");
  const [level,              setLevel]              = useState("foundation");
  const [status,             setStatus]             = useState("coming_soon");
  const [badgeIcon,          setBadgeIcon]          = useState("🎓");
  const [description,        setDescription]        = useState("");
  const [longDesc,           setLongDesc]           = useState("");
  const [outcomes,           setOutcomes]           = useState<string[]>([]);
  const [audience,           setAudience]           = useState<string[]>([]);
  const [skills,             setSkills]             = useState<string[]>([]);
  const [curriculum,         setCurriculum]         = useState<CurriculumItem[]>([]);
  const [faqs,               setFaqs]               = useState<FaqItem[]>([]);
  const [testimonials,       setTestimonials]       = useState<Testimonial[]>([]);
  const [relatedSlugs,       setRelatedSlugs]       = useState<string[]>([]);
  const [certPreviewUrl,     setCertPreviewUrl]     = useState("");
  const [minYearsExp,        setMinYearsExp]        = useState("");
  const [minTrainingHours,   setMinTrainingHours]   = useState("");
  const [price,              setPrice]              = useState("");
  const [durationWeeks,      setDurationWeeks]      = useState("");
  const [totalLessons,       setTotalLessons]       = useState("");
  const [totalHours,         setTotalHours]         = useState("");
  const [passingScore,       setPassingScore]       = useState("");
  const [examMins,           setExamMins]           = useState("");
  const [examQuestions,      setExamQuestions]      = useState("");
  const [validityYears,      setValidityYears]      = useState("");
  const [maxRetakes,         setMaxRetakes]         = useState("");
  const [retakeFee,          setRetakeFee]          = useState("");
  const [reviewsRating,      setReviewsRating]      = useState(DEFAULT_MARKETING.reviews_rating);
  const [reviewsCount,       setReviewsCount]       = useState(DEFAULT_MARKETING.reviews_count);
  const [socialProof,        setSocialProof]        = useState(DEFAULT_MARKETING.social_proof);
  const [heroBadgeLabel,     setHeroBadgeLabel]     = useState(DEFAULT_MARKETING.hero_badge_label);
  const [prerequisites,      setPrerequisites]      = useState("");
  const [enrollmentIncludes, setEnrollmentIncludes] = useState<string[]>(DEFAULT_MARKETING.enrollment_includes);

  // Certificate design
  const [certTemplateHtml, setCertTemplateHtml] = useState("");
  const [certPreview,      setCertPreview]      = useState(false);
  const [copiedVar,        setCopiedVar]        = useState<string | null>(null);
  const [certDesignMode,   setCertDesignMode]   = useState<"html" | "visual">("html");
  const htmlFileRef = useRef<HTMLInputElement>(null);

  function handleHtmlFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCertTemplateHtml(content);
      setCertPreview(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Page tabs
  const [ptRfyHeadline,    setPtRfyHeadline]    = useState("");
  const [ptRfyBody,        setPtRfyBody]        = useState("");
  const [ptRfyStats,       setPtRfyStats]       = useState<Stat[]>([]);
  const [ptRfyReqs,        setPtRfyReqs]        = useState<string[]>([]);
  const [ptRfyNotReady,    setPtRfyNotReady]    = useState("");
  const [ptRfyNotReadyHref, setPtRfyNotReadyHref] = useState("");
  const [ptPathHeadline,   setPtPathHeadline]   = useState("");
  const [ptPathBody,       setPtPathBody]       = useState("");
  const [ptPathSteps,      setPtPathSteps]      = useState<Step[]>([]);
  const [ptPrepHeadline,   setPtPrepHeadline]   = useState("");
  const [ptPrepBody,       setPtPrepBody]       = useState("");
  const [ptPrepResources,  setPtPrepResources]  = useState<Resource[]>([]);
  const [ptMntHeadline,    setPtMntHeadline]    = useState("");
  const [ptMntBody,        setPtMntBody]        = useState("");
  const [ptMntItems,       setPtMntItems]       = useState<string[]>([]);

  useEffect(() => {
    if (!cert) return;
    setIsFeatured(cert.is_featured ?? false);
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
    setMinYearsExp(cert.min_years_experience != null ? String(cert.min_years_experience) : "");
    setMinTrainingHours(cert.min_training_hours != null ? String(cert.min_training_hours) : "");
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

    setCertTemplateHtml((cert.marketing_meta as any)?.certificate_template_html ?? "");

    const pt = meta.page_tabs;
    if (pt) {
      const rfy = pt.right_for_you ?? {};
      setPtRfyHeadline(rfy.headline    ?? "");
      setPtRfyBody(rfy.body            ?? "");
      setPtRfyStats(safeArray<Stat>(rfy.stats));
      setPtRfyReqs(safeArray<string>(rfy.requirements));
      setPtRfyNotReady(rfy.not_ready_text    ?? "");
      setPtRfyNotReadyHref(rfy.not_ready_href ?? "");
      const ph = pt.path ?? {};
      setPtPathHeadline(ph.headline ?? "");
      setPtPathBody(ph.body         ?? "");
      setPtPathSteps(safeArray<Step>(ph.steps));
      const pp = pt.prepare ?? {};
      setPtPrepHeadline(pp.headline  ?? "");
      setPtPrepBody(pp.body          ?? "");
      setPtPrepResources(safeArray<Resource>(pp.resources));
      const pm = pt.maintenance ?? {};
      setPtMntHeadline(pm.headline   ?? "");
      setPtMntBody(pm.body           ?? "");
      setPtMntItems(safeArray<string>(pm.renewal_items));
    }
  }, [cert]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/admin/certifications/${id}`, {
        is_featured: isFeatured,
        acronym, title, slug, level, status,
        badge_icon:              badgeIcon,
        description,
        long_description:        longDesc,
        learning_outcomes:       outcomes,
        target_audience:         audience,
        skills,
        curriculum_overview:     curriculum,
        faqs_json:               faqs,
        testimonials,
        related_slugs:           relatedSlugs,
        certificate_preview_url: certPreviewUrl,
        marketing_meta: {
          reviews_rating:           reviewsRating,
          reviews_count:            reviewsCount,
          social_proof:             socialProof,
          hero_badge_label:         heroBadgeLabel,
          prerequisites,
          enrollment_includes:      enrollmentIncludes,
          certificate_template_html: certTemplateHtml,
          page_tabs: {
            right_for_you: {
              headline:       ptRfyHeadline,
              body:           ptRfyBody,
              stats:          ptRfyStats,
              requirements:   ptRfyReqs,
              not_ready_text: ptRfyNotReady,
              not_ready_href: ptRfyNotReadyHref,
            },
            path: {
              headline: ptPathHeadline,
              body:     ptPathBody,
              steps:    ptPathSteps,
            },
            prepare: {
              headline:  ptPrepHeadline,
              body:      ptPrepBody,
              resources: ptPrepResources,
            },
            maintenance: {
              headline:      ptMntHeadline,
              body:          ptMntBody,
              renewal_items: ptMntItems,
            },
          },
        },
        min_years_experience:  minYearsExp ? parseInt(minYearsExp) : null,
        min_training_hours:    minTrainingHours ? parseInt(minTrainingHours) : null,
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

  async function handleDelete() {
    try {
      await api.delete(`/admin/certifications/${id}`, accessToken!);
      toast.success("Certification deleted");
      window.location.href = "/certifications";
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
      setConfirmDelete(false);
    }
  }

  function applyAiDraft(d: any) {
    setAcronym(d.acronym ?? acronym);
    setTitle(d.title ?? title);
    setLevel(d.level ?? level);
    setBadgeIcon(d.badge_icon ?? badgeIcon);
    setDescription(d.description ?? "");
    setLongDesc(d.long_description ?? "");
    setOutcomes(safeArray<string>(d.learning_outcomes));
    setAudience(safeArray<string>(d.target_audience));
    setSkills(safeArray<string>(d.skills));
    setCurriculum(safeArray<CurriculumItem>(d.curriculum_overview));
    setFaqs(safeArray<FaqItem>(d.faqs_json));
    setTestimonials(safeArray<Testimonial>(d.testimonials));
    setPrice(String(d.price ?? ""));
    setDurationWeeks(String(d.duration_weeks ?? ""));
    setTotalLessons(String(d.total_lessons ?? ""));
    setTotalHours(String(d.total_hours ?? ""));
    setPassingScore(String(d.passing_score ?? ""));
    setExamMins(String(d.exam_duration_minutes ?? ""));
    setExamQuestions(String(d.exam_questions_count ?? ""));
    setValidityYears(String(d.validity_years ?? ""));
    setMaxRetakes(String(d.max_retakes_included ?? ""));
    setRetakeFee(String(d.retake_fee ?? ""));
    setMinYearsExp(d.min_years_experience != null ? String(d.min_years_experience) : "");
    setMinTrainingHours(d.min_training_hours != null ? String(d.min_training_hours) : "");

    const mm = d.marketing_meta ?? {};
    setReviewsRating(mm.reviews_rating ?? reviewsRating);
    setReviewsCount(mm.reviews_count ?? reviewsCount);
    setSocialProof(mm.social_proof ?? "");
    setHeroBadgeLabel(mm.hero_badge_label ?? heroBadgeLabel);
    setPrerequisites(mm.prerequisites ?? "");
    setEnrollmentIncludes(safeArray<string>(mm.enrollment_includes, enrollmentIncludes));

    const pt = mm.page_tabs ?? {};
    const rfy = pt.right_for_you ?? {};
    setPtRfyHeadline(rfy.headline ?? "");
    setPtRfyBody(rfy.body ?? "");
    setPtRfyStats(safeArray<Stat>(rfy.stats));
    setPtRfyReqs(safeArray<string>(rfy.requirements));
    setPtRfyNotReady(rfy.not_ready_text ?? "");
    setPtRfyNotReadyHref(rfy.not_ready_href ?? "/certifications");
    const ph = pt.path ?? {};
    setPtPathHeadline(ph.headline ?? "");
    setPtPathBody(ph.body ?? "");
    setPtPathSteps(safeArray<Step>(ph.steps));
    const pp = pt.prepare ?? {};
    setPtPrepHeadline(pp.headline ?? "");
    setPtPrepBody(pp.body ?? "");
    setPtPrepResources(safeArray<Resource>(pp.resources));
    const pm = pt.maintenance ?? {};
    setPtMntHeadline(pm.headline ?? "");
    setPtMntBody(pm.body ?? "");
    setPtMntItems(safeArray<string>(pm.renewal_items));
  }

  async function handleGenerateAi() {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const res = await api.post<any>("/ai/generate-certification", { prompt: aiPrompt.trim() }, accessToken!);
      const draft = res.data ?? res;
      applyAiDraft(draft);
      setShowAiModal(false);
      setAiPrompt("");
      toast.success("Certification drafted — review each tab and edit before saving");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate certification");
    } finally {
      setGeneratingAi(false);
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
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs"><RefreshCw size={12} /> Retry</button>
        <Link href="/certifications" className="btn-outline !py-1.5 !px-4 !text-xs">← Back</Link>
      </div>
    </div>
  );
  if (!cert) return (
    <div className="p-8">
      <p className="text-slate-500">Certification not found.</p>
      <Link href="/certifications" className="text-navy-700 text-sm mt-2 inline-block">← Back</Link>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Link href="/certifications" className="hover:text-slate-600">Certifications</Link>
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowAiModal(true)} className="btn-outline !py-2 !px-4 !text-xs flex items-center gap-1.5">
              <Sparkles size={12} /> Generate with AI
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </button>
          </div>
        </div>
      </div>

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !generatingAi && setShowAiModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-navy-900 flex items-center justify-center text-white flex-shrink-0">
                  <Sparkles size={14} />
                </div>
                <h2 className="font-display font-black text-lg text-navy-900">Generate with AI</h2>
              </div>
              <button onClick={() => !generatingAi && setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Describe the certification — what it's about, who it's for, and what should be certified. AI will draft
              the title, description, curriculum, FAQs, marketing copy, and page content across every tab. This
              overwrites the fields below with the draft — review and edit anything before saving.
            </p>
            <textarea
              className="input-base h-32 resize-none"
              placeholder="e.g. A certification for professionals who want to master prompt engineering for large language models — covering fundamentals through advanced multi-agent workflows, aimed at product managers and engineers, roughly 6 weeks of part-time study."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={generatingAi}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAiModal(false)} disabled={generatingAi} className="btn-outline !py-2 !px-4 !text-xs disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleGenerateAi} disabled={generatingAi || !aiPrompt.trim()} className="btn-primary !py-2 !px-5 !text-xs flex items-center gap-1.5 disabled:opacity-60">
                {generatingAi ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {generatingAi ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-100">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                tab === t.id ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

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
                <option value="pre_certificate">Pre-Certificate</option>
                <option value="foundation">Level 1 — Foundation</option>
                <option value="advanced">Level 2 — Advanced</option>
                <option value="specialist">Level 2 — Specialist</option>
                <option value="executive">Level 3 — Executive</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-700">Featured on homepage</p>
              <p className="text-[11px] text-slate-400">Show this certification in the Certifications section of the marketing site</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFeatured((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none",
                isFeatured ? "bg-navy-700" : "bg-slate-300"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                isFeatured ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>
      )}

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

          {/* Eligibility Requirements */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">Eligibility Requirements</p>
              <p className="text-[10px] text-slate-400">Students who don't meet these minimums will be blocked from submitting an application. Leave blank for no requirement.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min. Years of Experience" hint="e.g. 2 — applicant must have at least this many years of professional experience">
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 2"
                  value={minYearsExp}
                  onChange={(e) => setMinYearsExp(e.target.value)}
                />
              </Field>
              <Field label="Min. Training Hours" hint="e.g. 120 — applicant must have completed at least this many training hours">
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  placeholder="e.g. 120"
                  value={minTrainingHours}
                  onChange={(e) => setMinTrainingHours(e.target.value)}
                />
              </Field>
            </div>
            {(minYearsExp || minTrainingHours) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                <strong>Active requirement:</strong> Applicants must have
                {minYearsExp ? ` at least ${minYearsExp} year${minYearsExp !== "1" ? "s" : ""} of experience` : ""}
                {minYearsExp && minTrainingHours ? " and" : ""}
                {minTrainingHours ? ` at least ${minTrainingHours} training hours` : ""}.
                Those who don't will see a rejection message during the application process.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <StringListEditor label="Related Certifications (by slug)" values={relatedSlugs} onChange={setRelatedSlugs}
              placeholder="e.g. certified-ai-manager"
              hint="Slugs of certs shown in the 'What's Next?' section at the bottom of the page." />
          </div>
        </div>
      )}

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

      {tab === "enrollments" && (
        <CertEnrollmentsTab certId={id} token={accessToken!} />
      )}

      {tab === "instructors" && (
        <CertInstructorsTab certId={id} token={accessToken!} instructors={cert?.instructors ?? []} onRefresh={() => mutate()} />
      )}

      {tab === "faqs" && <FaqEditor items={faqs} onChange={setFaqs} />}

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
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hero Preview</p>
            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">{heroBadgeLabel || "Professional Certification"}</span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => <Star key={i} size={11} className="text-white fill-white" />)}
                <span className="text-white text-xs ml-1">{reviewsRating || "4.9"} ({reviewsCount || "1,200+ reviews"})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "testimonials" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Add 3 testimonials for best results. They appear in a row on the marketing page.</p>
          <TestimonialsEditor items={testimonials} onChange={setTestimonials} />
        </div>
      )}

      {tab === "page_tabs" && (
        <div className="space-y-8">
          <p className="text-xs text-slate-500">
            These fields populate the tabbed navigation on the certification marketing page (PMI-style).
            Leave sections blank to hide them or show fallback data.
          </p>

          {/* Tab 1 — Is [CERT] Right for You? */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Tab 1 — Is {cert.acronym} Right for You?</p>
            <Field label="Headline">
              <input className="input-base" placeholder={`Is the ${cert.acronym} Right for You?`} value={ptRfyHeadline} onChange={(e) => setPtRfyHeadline(e.target.value)} />
            </Field>
            <Field label="Body Text">
              <textarea className="input-base h-24 resize-none" placeholder="Introductory paragraph about who this cert is for…" value={ptRfyBody} onChange={(e) => setPtRfyBody(e.target.value)} />
            </Field>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stats (large numbers shown in teal)</label>
              <p className="text-[10px] text-slate-400 mb-2">e.g. "1.7M+" / "AI professionals needed by 2030"</p>
              <div className="space-y-2 mb-2">
                {ptRfyStats.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <input className="input-base flex-1 !py-1.5 !text-sm" placeholder="Value (e.g. $70,000)" value={s.value}
                      onChange={(e) => { const n = [...ptRfyStats]; n[i] = { ...n[i], value: e.target.value }; setPtRfyStats(n); }} />
                    <input className="input-base flex-1 !py-1.5 !text-sm" placeholder="Label" value={s.label}
                      onChange={(e) => { const n = [...ptRfyStats]; n[i] = { ...n[i], label: e.target.value }; setPtRfyStats(n); }} />
                    <button type="button" onClick={() => setPtRfyStats(ptRfyStats.filter((_, j) => j !== i))}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setPtRfyStats([...ptRfyStats, { value: "", label: "" }])}
                className="btn-outline !py-1.5 !px-3 !text-xs w-full"><Plus size={12} /> Add Stat</button>
            </div>
            <StringListEditor label="Eligibility Requirements / Who It's For" values={ptRfyReqs} onChange={setPtRfyReqs}
              placeholder="e.g. 2+ years of professional experience"
              hint="Shown as a bullet list. Leave empty to use the Target Audience list instead." />
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <Field label="'Not Ready Yet?' Text" hint="Optional — shown in right column card">
                <textarea className="input-base h-20 resize-none !text-sm" placeholder="Start with our free AI Essentials course before enrolling." value={ptRfyNotReady} onChange={(e) => setPtRfyNotReady(e.target.value)} />
              </Field>
              <Field label="'Not Ready Yet?' Button URL" hint="Where the card button links">
                <input className="input-base !text-sm" placeholder="/certifications" value={ptRfyNotReadyHref} onChange={(e) => setPtRfyNotReadyHref(e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Tab 2 — Path to Certification */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Tab 2 — Path to Certification</p>
            <Field label="Headline">
              <input className="input-base" placeholder="Path to Certification" value={ptPathHeadline} onChange={(e) => setPtPathHeadline(e.target.value)} />
            </Field>
            <Field label="Body Text">
              <textarea className="input-base h-20 resize-none" placeholder="Brief intro to the certification path…" value={ptPathBody} onChange={(e) => setPtPathBody(e.target.value)} />
            </Field>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Steps</label>
              <p className="text-[10px] text-slate-400 mb-2">Numbered steps shown vertically. Leave empty to skip and show learning outcomes only.</p>
              <div className="space-y-2 mb-2">
                {ptPathSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <div className="w-6 h-6 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2">{i + 1}</div>
                    <div className="flex-1 space-y-1.5">
                      <input className="input-base !py-1.5 !text-sm" placeholder="Step title" value={s.title}
                        onChange={(e) => { const n = [...ptPathSteps]; n[i] = { ...n[i], title: e.target.value }; setPtPathSteps(n); }} />
                      <input className="input-base !py-1.5 !text-sm" placeholder="Description (optional)" value={s.description}
                        onChange={(e) => { const n = [...ptPathSteps]; n[i] = { ...n[i], description: e.target.value }; setPtPathSteps(n); }} />
                    </div>
                    <button type="button" onClick={() => setPtPathSteps(ptPathSteps.filter((_, j) => j !== i))}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0 mt-2"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setPtPathSteps([...ptPathSteps, { title: "", description: "" }])}
                className="btn-outline !py-1.5 !px-3 !text-xs w-full"><Plus size={12} /> Add Step</button>
            </div>
          </div>

          {/* Tab 3 — How to Prepare */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Tab 3 — How to Prepare</p>
            <Field label="Headline">
              <input className="input-base" placeholder="How to Prepare" value={ptPrepHeadline} onChange={(e) => setPtPrepHeadline(e.target.value)} />
            </Field>
            <Field label="Body Text">
              <textarea className="input-base h-20 resize-none" placeholder="Overview of study approach…" value={ptPrepBody} onChange={(e) => setPtPrepBody(e.target.value)} />
            </Field>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Study Resources</label>
              <p className="text-[10px] text-slate-400 mb-2">Cards shown in the left column. The right column auto-shows the curriculum.</p>
              <div className="space-y-2 mb-2">
                {ptPrepResources.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <div className="flex-1 space-y-1.5">
                      <input className="input-base !py-1.5 !text-sm" placeholder="Resource title" value={r.title}
                        onChange={(e) => { const n = [...ptPrepResources]; n[i] = { ...n[i], title: e.target.value }; setPtPrepResources(n); }} />
                      <input className="input-base !py-1.5 !text-sm" placeholder="Short description" value={r.description}
                        onChange={(e) => { const n = [...ptPrepResources]; n[i] = { ...n[i], description: e.target.value }; setPtPrepResources(n); }} />
                    </div>
                    <button type="button" onClick={() => setPtPrepResources(ptPrepResources.filter((_, j) => j !== i))}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0 mt-2"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setPtPrepResources([...ptPrepResources, { title: "", description: "" }])}
                className="btn-outline !py-1.5 !px-3 !text-xs w-full"><Plus size={12} /> Add Resource</button>
            </div>
          </div>

          {/* Tab 5 — Maintenance */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Tab 5 — Maintenance</p>
            <Field label="Headline">
              <input className="input-base" placeholder={`Maintaining Your ${cert.acronym}`} value={ptMntHeadline} onChange={(e) => setPtMntHeadline(e.target.value)} />
            </Field>
            <Field label="Body Text">
              <textarea className="input-base h-20 resize-none" placeholder="How certification holders maintain their credential…" value={ptMntBody} onChange={(e) => setPtMntBody(e.target.value)} />
            </Field>
            <StringListEditor label="Renewal Requirements" values={ptMntItems} onChange={setPtMntItems}
              placeholder="e.g. Complete 30 PDUs every 2 years"
              hint="Bullet list of steps to maintain the certification." />
          </div>
        </div>
      )}

      {tab === "certificate" && (
        <div className="space-y-6">
          {/* Mode switcher */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <button type="button"
              onClick={() => setCertDesignMode("html")}
              className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                certDesignMode === "html" ? "bg-white text-navy-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Paste / Upload HTML
            </button>
            <button type="button"
              onClick={() => setCertDesignMode("visual")}
              className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                certDesignMode === "visual" ? "bg-white text-navy-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Visual Builder
            </button>
          </div>

          {certDesignMode === "visual" && (
            <VisualCertBuilder
              onGenerate={(html) => {
                setCertTemplateHtml(html);
                setCertDesignMode("html");
                setCertPreview(true);
              }}
            />
          )}

          {certDesignMode === "html" && (<>
          <div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste the full HTML of the certificate design below. Use the variable placeholders shown below — they will be replaced with the student's actual data when the certificate is displayed.
            </p>
          </div>

          {/* Variable reference */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Placeholders</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["{{STUDENT_NAME}}",    "Student's full name"],
                ["{{CERT_TITLE}}",      "Full certification title"],
                ["{{CERT_ACRONYM}}",    "Acronym (e.g. CAIP)"],
                ["{{CERT_NUMBER}}",     "Unique certificate number"],
                ["{{ISSUE_DATE}}",      "Date certificate was issued"],
                ["{{EXPIRY_DATE}}",     "Certificate expiry date"],
                ["{{VERIFICATION_URL}}","Public verification link"],
                ["{{QR_CODE_URL}}",     "QR code image src (verification)"],
                ["{{EXAM_SCORE}}",      "Exam score percentage"],
              ].map(([variable, desc]) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(variable);
                    setCopiedVar(variable);
                    setTimeout(() => setCopiedVar(null), 1500);
                  }}
                  className="flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-navy-300 hover:bg-navy-50 transition-colors group"
                >
                  <div>
                    <code className="text-[11px] font-mono font-bold text-navy-700">{variable}</code>
                    <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <span className="text-slate-300 group-hover:text-navy-400 flex-shrink-0">
                    {copiedVar === variable ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* HTML template editor */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-3">
              <label className="text-xs font-semibold text-slate-700">HTML Template</label>
              <div className="flex items-center gap-2">
                <input
                  ref={htmlFileRef}
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={handleHtmlFileUpload}
                />
                <button
                  type="button"
                  onClick={() => htmlFileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-800 border border-slate-200 hover:border-navy-300 bg-white px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Upload size={12} /> Upload HTML File
                </button>
                <button
                  type="button"
                  onClick={() => setCertPreview((v) => !v)}
                  disabled={!certTemplateHtml.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Eye size={13} /> {certPreview ? "Edit" : "Preview"}
                </button>
              </div>
            </div>

            {certPreview && certTemplateHtml ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                <div className="bg-slate-200 px-3 py-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Preview — sample data</span>
                </div>
                <iframe
                  srcDoc={certTemplateHtml
                    .replace(/\{\{STUDENT_NAME\}\}/g, "Jane Smith")
                    .replace(/\{\{CERT_TITLE\}\}/g, cert.title)
                    .replace(/\{\{CERT_ACRONYM\}\}/g, cert.acronym)
                    .replace(/\{\{CERT_NUMBER\}\}/g, `PAII-${cert.acronym}-2025-SAMPLE`)
                    .replace(/\{\{ISSUE_DATE\}\}/g, "June 19, 2025")
                    .replace(/\{\{EXPIRY_DATE\}\}/g, "June 19, 2027")
                    .replace(/\{\{EXAM_SCORE\}\}/g, "91.5")
                    .replace(/\{\{VERIFICATION_URL\}\}/g, "https://paii.ca/verify?id=PAII-SAMPLE")
                    .replace(/\{\{QR_CODE_URL\}\}/g, "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://paii.ca/verify?id=PAII-SAMPLE")
                  }
                  className="w-full"
                  style={{ height: "600px", border: "none" }}
                  title="Certificate preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            ) : (
              <textarea
                className="input-base font-mono text-xs resize-y"
                style={{ minHeight: "420px" }}
                placeholder={`<!DOCTYPE html>\n<html>\n<head><style>/* your styles */</style></head>\n<body>\n  <h1>{{CERT_TITLE}}</h1>\n  <p>Awarded to {{STUDENT_NAME}}</p>\n  <p>Certificate No: {{CERT_NUMBER}}</p>\n  <img src="{{QR_CODE_URL}}" />\n</body>\n</html>`}
                value={certTemplateHtml}
                onChange={(e) => setCertTemplateHtml(e.target.value)}
                spellCheck={false}
              />
            )}

            {certTemplateHtml && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-slate-400">
                  {certTemplateHtml.length.toLocaleString()} characters · Click Save to persist the template.
                </p>
                <button
                  type="button"
                  onClick={() => { setCertTemplateHtml(""); setCertPreview(false); }}
                  className="text-[10px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 size={10} /> Clear Template
                </button>
              </div>
            )}
          </div>
          </>)}
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-600 font-semibold">Delete permanently?</span>
            <button onClick={handleDelete} className="btn-outline !py-1.5 !px-3 !text-xs text-red-600 border-red-200 hover:bg-red-50">
              Yes, delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-outline !py-1.5 !px-3 !text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-outline !py-1.5 !px-3 !text-xs text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
        </button>
      </div>
    </div>
  );
}

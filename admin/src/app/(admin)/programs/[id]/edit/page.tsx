"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Loader2, Save, Plus, Trash2, X, ChevronLeft, ChevronRight, AlertCircle,
  GraduationCap, BookOpen, Users, DollarSign, ArrowUp, ArrowDown,
  Globe, Archive, EyeOff, Copy, Search, HelpCircle, Megaphone, Quote, Code2,
  Eye, Check, Upload, Star, Wand2, Sparkles, Languages,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { uploadHeroImage, deleteOldUpload } from "@/components/HeroImageFrame";
import CardImageUpload from "@/components/CardImageUpload";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
type Tab = "overview" | "curriculum" | "instructors" | "faqs" | "marketing" | "testimonials" | "certificate" | "enrollments" | "pricing" | "translations";
type LanguageOpt = { code: string; name: string; native_name: string; is_rtl: boolean };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

type FaqItem = { question: string; answer: string };
type Testimonial = { name: string; role: string; company: string; quote: string; avatar_initials: string };
const DEFAULT_TESTIMONIAL: Testimonial = { name: "", role: "", company: "", quote: "", avatar_initials: "" };

type MarketingMeta = {
  reviews_rating: string; reviews_count: string; social_proof: string; hero_badge_label: string;
  enrollment_includes: string[]; certificate_template_html: string;
};
const DEFAULT_MARKETING: MarketingMeta = {
  reviews_rating: "", reviews_count: "", social_proof: "", hero_badge_label: "",
  enrollment_includes: [], certificate_template_html: "",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-red-50 text-red-700",
};

function StringListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <input
            className="input-base text-sm flex-1"
            placeholder={placeholder}
            value={item}
            onChange={(e) => onChange(items.map((it, i) => (i === idx ? e.target.value : it)))}
          />
          <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 mt-1.5">
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1">
        <Plus size={12} /> Add
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
            placeholder="Quote — what did they say about the program?"
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

// ─── Visual Certificate Builder ─────────────────────────────────────────────

type DesignEl = { id: string; variable: string; label: string; x: number; y: number; fontSize: number; color: string; bold: boolean };

const VISUAL_VARS = [
  { variable: "{{STUDENT_NAME}}",  label: "Student Name" },
  { variable: "{{PROGRAM_TITLE}}", label: "Program Title" },
  { variable: "{{CERT_NUMBER}}",   label: "Cert Number" },
  { variable: "{{ISSUE_DATE}}",    label: "Issue Date" },
];

function VisualCertBuilder({ onGenerate }: { onGenerate: (html: string) => void }) {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgW, setBgW] = useState(1122);
  const [bgH, setBgH] = useState(794);
  const [elements, setElements] = useState<DesignEl[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startMX: number; startMY: number; startX: number; startY: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

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
    setElements((prev) => [...prev, { id, variable, label, x: 10, y: 10 + prev.length * 8, fontSize: 24, color: "#1a1a1a", bold: false }]);
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
      const dx = ((e.clientX - dragging.startMX) / rect.width) * 100;
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
    const elsHtml = elements.map((el) =>
      `  <span style="position:absolute;left:${el.x.toFixed(2)}%;top:${el.y.toFixed(2)}%;font-size:${el.fontSize}px;color:${el.color};font-weight:${el.bold ? "bold" : "normal"};white-space:nowrap;">${el.variable}</span>`
    ).join("\n");

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
          <p className="text-xs text-slate-400 mt-1">PNG or JPG — export your design as a high-res image first</p>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                position: "absolute", left: `${el.x}%`, top: `${el.y}%`, cursor: "move",
                outline: selected === el.id ? "2px dashed #1e40af" : "1px dashed rgba(100,100,100,0.4)",
                padding: "2px 4px", backgroundColor: selected === el.id ? "rgba(219,234,254,0.55)" : "transparent", borderRadius: 3,
              }}
              onMouseDown={(e) => onMouseDown(e, el.id)}
              onClick={(e) => { e.stopPropagation(); setSelected(el.id); }}
            >
              <span style={{ fontSize: el.fontSize, color: el.color, fontWeight: el.bold ? "bold" : "normal", whiteSpace: "nowrap", lineHeight: 1 }}>
                {el.label}
              </span>
            </div>
          ))}
        </div>
      </div>

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
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Font Size (px)</label>
              <input type="number" className="input-base !py-1 !text-xs" min={8} max={300}
                value={selectedEl.fontSize} onChange={(e) => updateEl(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Color</label>
              <input type="color" className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer"
                value={selectedEl.color} onChange={(e) => updateEl(selectedEl.id, { color: e.target.value })} />
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
          </div>
        </div>
      )}

      {elements.length > 0 && (
        <button type="button" onClick={generate} className="btn-primary w-full !py-2.5 !text-sm">
          <Check size={14} /> Use This Design
        </button>
      )}
    </div>
  );
}

// ─── Instructors Tab ─────────────────────────────────────────────────────────

function ProgramInstructorsTab({
  programId, token, instructors, onRefresh,
}: {
  programId: string; token: string; instructors: any[]; onRefresh: () => void;
}) {
  const { data: usersRaw } = useSWR(token ? ["/users?limit=200", token] : null, ([url, t]) => api.get<any>(url, t));
  const users: any[] = (() => {
    const d = (usersRaw as any)?.data?.data ?? (usersRaw as any)?.data ?? usersRaw;
    return Array.isArray(d) ? d : [];
  })();
  const professors = users.filter((u: any) => u.role === "professor" || u.role === "admin" || u.role === "super_admin");

  async function assignInstructor(userId: string, isLead: boolean) {
    await toast.promise(
      api.post(`/admin/programs/${programId}/instructors`, { user_id: userId, is_lead: isLead }, token).then(() => onRefresh()),
      { loading: "Assigning…", success: "Assigned", error: "Failed" },
    );
  }

  async function removeInstructor(userId: string) {
    await toast.promise(
      api.delete(`/admin/programs/${programId}/instructors/${userId}`, token).then(() => onRefresh()),
      { loading: "Removing…", success: "Removed", error: "Failed" },
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-1">Assigned Instructors</p>
        <p className="text-[11px] text-slate-400 mb-4">Shown in the "Your Instructors" section on the public program page.</p>
        {instructors.length === 0 ? (
          <p className="text-xs text-slate-400">No instructors assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {instructors.map((ins: any) => {
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
                        {name}{ins.is_lead && <span className="text-gold-600 font-bold ml-1">★ Lead</span>}
                      </p>
                      {ins.user?.email && <p className="text-xs text-slate-400">{ins.user.email}</p>}
                    </div>
                  </div>
                  <button onClick={() => removeInstructor(ins.user_id)} className="text-red-500 hover:text-red-700 transition-colors" title="Remove instructor">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          {professors.filter((p: any) => !instructors.find((i: any) => i.user_id === p.id)).map((p: any) => (
            <optgroup key={p.id} label={`${p.first_name ?? ""} ${p.last_name ?? ""} (${p.role})`.trim()}>
              <option value={`${p.id}|0`}>Add as instructor</option>
              <option value={`${p.id}|1`}>Add as lead instructor ★</option>
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Enrollments Tab ─────────────────────────────────────────────────────────

function ProgramEnrollmentsTab({
  programId, token, requiredCourses,
}: {
  programId: string; token: string; requiredCourses: { course_id: string; title: string }[];
}) {
  const { data: raw, isLoading, error, mutate } = useSWR(
    token ? [`/admin/programs/enrollments?program_id=${programId}&limit=100`, token] : null,
    ([url, t]) => api.get<any>(url, t),
  );

  const payload = (raw as any)?.data ?? raw;
  const enrollments: any[] = Array.isArray(payload?.data) ? payload.data : [];

  const [expandedWaiverId, setExpandedWaiverId] = useState<string | null>(null);
  const [waiversByEnrollment, setWaiversByEnrollment] = useState<Record<string, any[]>>({});
  const [loadingWaiverCourseId, setLoadingWaiverCourseId] = useState<string | null>(null);

  async function loadWaivers(enrollmentId: string) {
    const res = await api.get<any>(`/admin/programs/enrollments/${enrollmentId}/course-waivers`, token);
    const list = (res as any)?.data ?? res;
    setWaiversByEnrollment((prev) => ({ ...prev, [enrollmentId]: Array.isArray(list) ? list : [] }));
  }

  async function toggleWaiverPanel(enrollmentId: string) {
    if (expandedWaiverId === enrollmentId) { setExpandedWaiverId(null); return; }
    setExpandedWaiverId(enrollmentId);
    if (!waiversByEnrollment[enrollmentId]) await loadWaivers(enrollmentId);
  }

  async function setWaiver(enrollmentId: string, courseId: string) {
    setLoadingWaiverCourseId(courseId);
    try {
      await api.put(`/admin/programs/enrollments/${enrollmentId}/course-waivers/${courseId}`, {}, token);
      await loadWaivers(enrollmentId);
      mutate();
      toast.success("Course waived");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to waive course");
    } finally {
      setLoadingWaiverCourseId(null);
    }
  }

  async function removeWaiver(enrollmentId: string, courseId: string) {
    setLoadingWaiverCourseId(courseId);
    try {
      await api.delete(`/admin/programs/enrollments/${enrollmentId}/course-waivers/${courseId}`, token);
      await loadWaivers(enrollmentId);
      mutate();
      toast.success("Waiver removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove waiver");
    } finally {
      setLoadingWaiverCourseId(null);
    }
  }

  async function revoke(certId: string) {
    const reason = prompt("Reason for revoking this certificate? (optional)") ?? undefined;
    await toast.promise(
      api.patch(`/admin/programs/certificates/${certId}/revoke`, { reason }, token).then(() => mutate()),
      { loading: "Revoking…", success: "Certificate revoked", error: "Failed" },
    );
  }

  async function reactivate(certId: string) {
    await toast.promise(
      api.patch(`/admin/programs/certificates/${certId}/reactivate`, {}, token).then(() => mutate()),
      { loading: "Reactivating…", success: "Certificate reactivated", error: "Failed" },
    );
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
      <p className="text-slate-400 text-xs mt-1">Students will appear here once they enroll in this program.</p>
    </div>
  );

  return (
    <div className="card overflow-hidden p-0">
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
          {enrollments.map((e: any) => {
            const profile = e.user?.profile;
            const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || e.user?.email;
            const waivedCourseIds = new Set((waiversByEnrollment[e.id] ?? []).map((w: any) => w.course_id));
            return (
              <React.Fragment key={e.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{e.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize",
                      e.status === "completed" ? "bg-emerald-50 text-emerald-700" : e.status === "active" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full max-w-xs">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${e.progress_percentage ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{e.progress_percentage ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {e.certificate ? (
                      e.certificate.status === "revoked" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-500 font-semibold">Revoked</span>
                          <button onClick={() => reactivate(e.certificate.id)} className="text-navy-600 hover:underline">Reactivate</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold">Issued {formatDate(e.certificate.issued_at)}</span>
                          <button onClick={() => revoke(e.certificate.id)} className="text-red-500 hover:underline">Revoke</button>
                        </div>
                      )
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(e.enrolled_at)}</td>
                  <td className="px-4 py-3">
                    {requiredCourses.length > 0 && (
                      <button
                        onClick={() => toggleWaiverPanel(e.id)}
                        className="text-xs font-semibold text-navy-600 hover:underline whitespace-nowrap"
                      >
                        {expandedWaiverId === e.id ? "Hide waivers" : "Waivers"}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedWaiverId === e.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-4 py-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required course waivers</p>
                      {!waiversByEnrollment[e.id] ? (
                        <p className="text-xs text-slate-400">Loading…</p>
                      ) : (
                        <div className="space-y-1.5">
                          {requiredCourses.map((c) => {
                            const waived = waivedCourseIds.has(c.course_id);
                            const busy = loadingWaiverCourseId === c.course_id;
                            return (
                              <label key={c.course_id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={waived}
                                  disabled={busy}
                                  onChange={() => waived ? removeWaiver(e.id, c.course_id) : setWaiver(e.id, c.course_id)}
                                  className="rounded border-slate-300"
                                />
                                <span className={cn(waived ? "text-emerald-700 font-medium" : "text-slate-700")}>{c.title}</span>
                                {waived && <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Waived</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;
  const token = useAuthStore((s) => s.accessToken)!;
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: languagesData } = useSWR<LanguageOpt[]>(
    token ? ["/languages", token] : null,
    ([url, t]: [string, string]) => api.get<any>(url, t).then((r: any) => r.data ?? r)
  );
  const languages = languagesData ?? [];
  const nonEnglishLanguages = languages.filter((l) => l.code !== "en");

  const [translationLocale, setTranslationLocale] = useState<string>("");
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, Record<string, any>>>({});
  const [translationsInitialized, setTranslationsInitialized] = useState(false);
  const [savingTranslation, setSavingTranslation] = useState<string | null>(null);
  const [retranslating, setRetranslating] = useState<string | null>(null);
  const [translationJsonErrors, setTranslationJsonErrors] = useState<Record<string, string>>({});

  const { data: programRaw, isLoading, error, mutate } = useSWR(
    token && programId ? [`/admin/programs/${programId}`, token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false },
  );

  const { data: coursesRaw } = useSWR(token ? ["/admin/courses", token] : null, ([url, t]) => api.get<any>(url, t));

  const program: any = (() => {
    const d = (programRaw as any)?.data ?? programRaw;
    return d || {};
  })();

  const allCourses: any[] = (() => {
    const d = (coursesRaw as any)?.data ?? coursesRaw;
    return Array.isArray(d) ? d : [];
  })();

  // ── Overview form ──────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "", slug: "", code: "", short_description: "", description: "", overview: "",
    level: "beginner" as typeof LEVELS[number], thumbnail_url: "",
    duration_weeks: "", estimated_hours: "",
  });
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>([]);
  const [savingOverview, setSavingOverview] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  // Tracks the last *persisted* thumbnail URL — cleanup only fires once a
  // save actually replaces it, not the instant a new file is uploaded (an
  // abandoned upload shouldn't orphan the still-referenced old image).
  const lastSavedThumbnailUrlRef = useRef<string>("");

  // ── Pricing/enrollment/certificate form ──────────────────────────
  const [pricingForm, setPricingForm] = useState({
    price: "0", currency: "USD", enrollment_type: "", max_learners: "", access_duration_days: "",
    allow_individual_course_purchase: true, is_featured: false,
    certificate_title: "", certificate_description: "",
  });
  const [savingPricing, setSavingPricing] = useState(false);

  // ── Curriculum ────────────────────────────────────────────────────
  const [courseSearch, setCourseSearch] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [expandedSpecialId, setExpandedSpecialId] = useState<string | null>(null);
  const [specialForm, setSpecialForm] = useState<Record<string, any>>({});
  const [savingSpecialId, setSavingSpecialId] = useState<string | null>(null);

  // ── FAQs / Testimonials / Marketing / Certificate Design ────────────
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [savingFaqs, setSavingFaqs] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [savingTestimonials, setSavingTestimonials] = useState(false);
  const [marketing, setMarketing] = useState<MarketingMeta>(DEFAULT_MARKETING);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [certDesignMode, setCertDesignMode] = useState<"html" | "visual">("html");
  const [certPreview, setCertPreview] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const htmlFileRef = useRef<HTMLInputElement>(null);

  // ── AI content tools ─────────────────────────────────────────────
  const [fillingFromBuild, setFillingFromBuild] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    if (program.id) {
      setForm({
        title: program.title || "", slug: program.slug || "", code: program.code || "",
        short_description: program.short_description || "", description: program.description || "",
        overview: program.overview || "", level: program.level || "beginner",
        thumbnail_url: program.thumbnail_url || "",
        duration_weeks: program.duration_weeks != null ? String(program.duration_weeks) : "",
        estimated_hours: program.estimated_hours != null ? String(program.estimated_hours) : "",
      });
      setLearningOutcomes(program.learning_outcomes ?? []);
      setTargetAudience(program.target_audience ?? []);
      setPrerequisites(program.prerequisites ?? []);
      setRelatedSlugs(program.related_slugs ?? []);
      lastSavedThumbnailUrlRef.current = program.thumbnail_url || "";

      setPricingForm({
        price: String(program.price ?? 0), currency: program.currency || "USD",
        enrollment_type: program.enrollment_type || "", max_learners: program.max_learners != null ? String(program.max_learners) : "",
        access_duration_days: program.access_duration_days != null ? String(program.access_duration_days) : "",
        allow_individual_course_purchase: program.allow_individual_course_purchase ?? true,
        is_featured: program.is_featured ?? false,
        certificate_title: program.certificate_title || "", certificate_description: program.certificate_description || "",
      });

      setFaqs(Array.isArray(program.faqs_json) ? program.faqs_json : []);
      setTestimonials(Array.isArray(program.testimonials) ? program.testimonials : []);
      const meta = (program.marketing_meta && typeof program.marketing_meta === "object") ? program.marketing_meta : {};
      setMarketing({
        reviews_rating: meta.reviews_rating ?? "", reviews_count: meta.reviews_count ?? "",
        social_proof: meta.social_proof ?? "", hero_badge_label: meta.hero_badge_label ?? "",
        enrollment_includes: Array.isArray(meta.enrollment_includes) ? meta.enrollment_includes : [],
        certificate_template_html: meta.certificate_template_html ?? "",
      });

      if (!translationsInitialized) {
        setTranslationDrafts(program.translations ?? {});
        setTranslationsInitialized(true);
      }
    }
  }, [program.id]);

  useEffect(() => {
    if (!translationLocale && nonEnglishLanguages.length > 0) setTranslationLocale(nonEnglishLanguages[0].code);
  }, [nonEnglishLanguages, translationLocale]);

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function setPricingField(k: string, v: any) { setPricingForm((f) => ({ ...f, [k]: v })); }

  function getTranslatedField(locale: string, field: string): any {
    return translationDrafts[locale]?.[field];
  }
  function setTranslatedField(locale: string, field: string, value: any) {
    setTranslationDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  }
  function getTranslatedText(locale: string, field: string): string {
    return getTranslatedField(locale, field) ?? "";
  }
  function getTranslatedStringList(locale: string, field: string): string {
    const val = getTranslatedField(locale, field);
    return Array.isArray(val) ? val.join("\n") : (val ?? "");
  }
  function setTranslatedStringList(locale: string, field: string, text: string) {
    setTranslatedField(locale, field, text.split("\n"));
  }
  function getTranslatedJsonText(locale: string, field: string): string {
    const val = getTranslatedField(locale, field);
    return val !== undefined ? JSON.stringify(val, null, 2) : "";
  }
  function setTranslatedJsonText(locale: string, field: string, text: string) {
    const key = `${locale}:${field}`;
    try {
      const parsed = text.trim() ? JSON.parse(text) : undefined;
      setTranslatedField(locale, field, parsed);
      setTranslationJsonErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } catch {
      setTranslationDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [`__raw_${field}`]: text } }));
      setTranslationJsonErrors((prev) => ({ ...prev, [key]: "Invalid JSON — not saved until fixed" }));
    }
  }
  function getTranslatedJsonTextValue(locale: string, field: string): string {
    const raw = translationDrafts[locale]?.[`__raw_${field}`];
    return raw !== undefined ? raw : getTranslatedJsonText(locale, field);
  }

  async function saveTranslation(locale: string) {
    setSavingTranslation(locale);
    try {
      let tok = token;
      const rawDraft = translationDrafts[locale] ?? {};
      const fields = Object.fromEntries(Object.entries(rawDraft).filter(([k]) => !k.startsWith("__raw_")));
      try {
        await api.patch(`/translations/program/${programId}?locale=${locale}`, { fields }, tok);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          tok = useAuthStore.getState().accessToken!;
          await api.patch(`/translations/program/${programId}?locale=${locale}`, { fields }, tok);
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
      let tok = token;
      let res: any;
      try {
        res = await api.post<any>(`/translations/program/${programId}?locale=${locale}`, {}, tok);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          tok = useAuthStore.getState().accessToken!;
          res = await api.post<any>(`/translations/program/${programId}?locale=${locale}`, {}, tok);
        } else throw err;
      }
      const updated = res?.data ?? res;
      setTranslationDrafts((prev) => ({ ...prev, [locale]: updated?.translations?.[locale] ?? {} }));
      setTranslationJsonErrors({});
      toast.success("Translated with AI — review and save");
    } catch {
      toast.error("Translation failed");
    } finally {
      setRetranslating(null);
    }
  }

  async function uploadThumbnail(file: File) {
    setUploadingThumbnail(true);
    try {
      const url = await uploadHeroImage(file, token, "program_thumbnail");
      if (!url) { toast.error("Upload failed"); return; }
      // Deliberately does not delete the previous image here — see
      // lastSavedThumbnailUrlRef, cleanup happens on save.
      setField("thumbnail_url", url);
    } finally {
      setUploadingThumbnail(false);
    }
  }

  async function handleSaveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    setSavingOverview(true);
    try {
      await api.patch(`/admin/programs/${programId}`, {
        title: form.title, slug: form.slug || undefined, code: form.code || null,
        short_description: form.short_description || null, description: form.description || null,
        overview: form.overview || null, level: form.level, thumbnail_url: form.thumbnail_url || null,
        duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks, 10) : null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        learning_outcomes: learningOutcomes.filter((s) => s.trim()),
        target_audience: targetAudience.filter((s) => s.trim()),
        prerequisites: prerequisites.filter((s) => s.trim()),
        related_slugs: relatedSlugs.filter((s) => s.trim()),
      }, token);
      if (lastSavedThumbnailUrlRef.current && lastSavedThumbnailUrlRef.current !== form.thumbnail_url) {
        deleteOldUpload(lastSavedThumbnailUrlRef.current, token);
      }
      lastSavedThumbnailUrlRef.current = form.thumbnail_url;
      toast.success("Overview saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingOverview(false);
    }
  }

  async function handleSavePricing(e: React.FormEvent) {
    e.preventDefault();
    setSavingPricing(true);
    try {
      await api.patch(`/admin/programs/${programId}`, {
        price: parseFloat(pricingForm.price) || 0, currency: pricingForm.currency,
        enrollment_type: pricingForm.enrollment_type || null,
        max_learners: pricingForm.max_learners ? parseInt(pricingForm.max_learners, 10) : null,
        access_duration_days: pricingForm.access_duration_days ? parseInt(pricingForm.access_duration_days, 10) : null,
        allow_individual_course_purchase: pricingForm.allow_individual_course_purchase,
        is_featured: pricingForm.is_featured,
        certificate_title: pricingForm.certificate_title || null,
        certificate_description: pricingForm.certificate_description || null,
      }, token);
      toast.success("Pricing & certificate saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingPricing(false);
    }
  }

  function openSpecialPanel(pc: any) {
    if (expandedSpecialId === pc.id) { setExpandedSpecialId(null); return; }
    const meta = (pc.special_metadata && typeof pc.special_metadata === "object") ? pc.special_metadata : {};
    setSpecialForm({
      special_type: pc.special_type ?? "",
      deliverables: meta.deliverables ?? [],
      learning_objectives: meta.learning_objectives ?? [],
      rubric_criteria: meta.rubric_criteria ?? [],
      submission_requirements: meta.submission_requirements ?? "",
      host_organization: meta.host_organization ?? "",
      supervisor_name: meta.supervisor_name ?? "",
      supervisor_email: meta.supervisor_email ?? "",
      hours_required: meta.hours_required != null ? String(meta.hours_required) : "",
      evaluation_criteria: meta.evaluation_criteria ?? [],
      report_requirements: meta.report_requirements ?? "",
      passing_score: meta.passing_score != null ? String(meta.passing_score) : "",
    });
    setExpandedSpecialId(pc.id);
  }

  async function handleSaveSpecialType(programCourseId: string) {
    setSavingSpecialId(programCourseId);
    try {
      const type = specialForm.special_type || null;
      const special_metadata = type === "capstone" ? {
        deliverables: (specialForm.deliverables ?? []).filter((s: string) => s.trim()),
        learning_objectives: (specialForm.learning_objectives ?? []).filter((s: string) => s.trim()),
        rubric_criteria: (specialForm.rubric_criteria ?? []).filter((s: string) => s.trim()),
        submission_requirements: specialForm.submission_requirements || "",
        passing_score: specialForm.passing_score ? parseInt(specialForm.passing_score, 10) : null,
      } : type === "internship" ? {
        host_organization: specialForm.host_organization || "",
        supervisor_name: specialForm.supervisor_name || "",
        supervisor_email: specialForm.supervisor_email || "",
        hours_required: specialForm.hours_required ? parseInt(specialForm.hours_required, 10) : null,
        evaluation_criteria: (specialForm.evaluation_criteria ?? []).filter((s: string) => s.trim()),
        report_requirements: specialForm.report_requirements || "",
        passing_score: specialForm.passing_score ? parseInt(specialForm.passing_score, 10) : null,
      } : {};

      await api.patch(`/admin/programs/${programId}/courses/${programCourseId}/special-type`, { special_type: type, special_metadata }, token);
      toast.success(type ? `Marked as ${type}` : "Cleared special type");
      setExpandedSpecialId(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingSpecialId(null);
    }
  }

  async function handleSaveFaqs() {
    setSavingFaqs(true);
    try {
      await api.patch(`/admin/programs/${programId}`, { faqs_json: faqs }, token);
      toast.success("FAQs saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save FAQs");
    } finally {
      setSavingFaqs(false);
    }
  }

  async function handleSaveTestimonials() {
    setSavingTestimonials(true);
    try {
      await api.patch(`/admin/programs/${programId}`, { testimonials }, token);
      toast.success("Testimonials saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save testimonials");
    } finally {
      setSavingTestimonials(false);
    }
  }

  async function handleSaveMarketing() {
    setSavingMarketing(true);
    try {
      await api.patch(`/admin/programs/${programId}`, { marketing_meta: marketing }, token);
      toast.success("Saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingMarketing(false);
    }
  }

  async function handleFillFromBuild() {
    setFillingFromBuild(true);
    try {
      const res = await api.post<any>(`/admin/programs/${programId}/ai-overview-from-build`, {}, token);
      const draft = res.data ?? res;
      setForm((f) => ({
        ...f,
        short_description: draft.short_description || f.short_description,
        description: draft.description || f.description,
        overview: draft.overview || f.overview,
      }));
      if (draft.learning_outcomes?.length) setLearningOutcomes(draft.learning_outcomes);
      if (draft.target_audience?.length) setTargetAudience(draft.target_audience);
      setActiveTab("overview");
      toast.success("Drafted from the program's actual bundled courses — review before saving");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to draft from the build");
    } finally {
      setFillingFromBuild(false);
    }
  }

  async function handleGenerateAi() {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const res = await api.post<any>("/ai/generate-program", { prompt: aiPrompt.trim() }, token);
      const draft = res.data ?? res;
      setForm((f) => ({
        ...f,
        title: draft.title || f.title,
        code: draft.code || f.code,
        level: (["beginner", "intermediate", "advanced"].includes(draft.level) ? draft.level : f.level) as typeof LEVELS[number],
        short_description: draft.short_description || f.short_description,
        description: draft.description || f.description,
        overview: draft.overview || f.overview,
        duration_weeks: draft.duration_weeks != null ? String(draft.duration_weeks) : f.duration_weeks,
        estimated_hours: draft.estimated_hours != null ? String(draft.estimated_hours) : f.estimated_hours,
      }));
      if (draft.learning_outcomes?.length) setLearningOutcomes(draft.learning_outcomes);
      if (draft.target_audience?.length) setTargetAudience(draft.target_audience);
      if (draft.prerequisites?.length) setPrerequisites(draft.prerequisites);
      if (draft.faqs_json?.length) setFaqs(draft.faqs_json);
      if (draft.testimonials?.length) setTestimonials(draft.testimonials);
      setPricingForm((p) => ({
        ...p,
        price: draft.price != null ? String(draft.price) : p.price,
        certificate_title: draft.certificate_title || p.certificate_title,
        certificate_description: draft.certificate_description || p.certificate_description,
      }));
      if (draft.marketing_meta) {
        setMarketing((m) => ({
          ...m,
          reviews_rating: draft.marketing_meta.reviews_rating || m.reviews_rating,
          reviews_count: draft.marketing_meta.reviews_count || m.reviews_count,
          social_proof: draft.marketing_meta.social_proof || m.social_proof,
          hero_badge_label: draft.marketing_meta.hero_badge_label || m.hero_badge_label,
          enrollment_includes: draft.marketing_meta.enrollment_includes?.length ? draft.marketing_meta.enrollment_includes : m.enrollment_includes,
        }));
      }
      setShowAiModal(false);
      setAiPrompt("");
      setActiveTab("overview");
      toast.success("Program drafted — review each tab and edit before saving");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate");
    } finally {
      setGeneratingAi(false);
    }
  }

  function handleHtmlFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setMarketing((m) => ({ ...m, certificate_template_html: (ev.target?.result as string) ?? "" }));
    reader.readAsText(file);
    e.target.value = "";
  }

  async function addCourse(courseId: string) {
    try {
      await api.post(`/admin/programs/${programId}/courses`, { course_id: courseId, is_required: true }, token);
      toast.success("Course added to curriculum");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add course");
    }
  }

  async function removeCourse(programCourseId: string) {
    await toast.promise(
      api.delete(`/admin/programs/${programId}/courses/${programCourseId}`, token).then(() => mutate()),
      { loading: "Removing…", success: "Removed", error: "Failed" },
    );
  }

  async function toggleRequired(programCourseId: string, isRequired: boolean) {
    await toast.promise(
      api.patch(`/admin/programs/${programId}/courses/${programCourseId}`, { is_required: !isRequired }, token).then(() => mutate()),
      { loading: "Updating…", success: "Updated", error: "Failed" },
    );
  }

  async function moveCourse(idx: number, dir: -1 | 1) {
    const list = [...program.courses];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setSavingOrder(true);
    try {
      await api.patch(`/admin/programs/${programId}/courses/reorder`, { program_course_ids: list.map((c: any) => c.id) }, token);
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reorder");
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleAction(action: "publish" | "unpublish" | "archive" | "duplicate" | "delete") {
    if (action === "delete" && !confirm(`Delete program "${program.title}"? This cannot be undone.`)) return;
    try {
      if (action === "duplicate") {
        const res = await api.post<any>(`/admin/programs/${programId}/duplicate`, {}, token);
        const dup = res.data ?? res;
        toast.success("Program duplicated as a draft");
        router.push(`/programs/${dup.id}/edit`);
      } else if (action === "delete") {
        await api.delete(`/admin/programs/${programId}`, token);
        toast.success("Program deleted");
        router.push("/programs");
      } else {
        await api.patch(`/admin/programs/${programId}/${action}`, {}, token);
        toast.success(`Program ${action === "unpublish" ? "moved back to draft" : action + "d"}`);
        mutate();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Action failed");
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading program…</p>
        </div>
      </div>
    );
  }

  if (error || !program.id) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Program not found</p>
          <Link href="/programs" className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4 inline-block">
            <ChevronLeft size={12} /> Back to Programs
          </Link>
        </div>
      </div>
    );
  }

  const courses = program.courses ?? [];
  const addableCourses = allCourses.filter(
    (c: any) => !courses.find((pc: any) => pc.course_id === c.id) &&
      (!courseSearch.trim() || c.title.toLowerCase().includes(courseSearch.trim().toLowerCase())),
  );

  return (
    <div className="p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Link href="/programs" className="hover:text-slate-600">Programs</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-semibold">{program.title}</span>
          </div>
          <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
            <GraduationCap size={20} className="text-navy-700" /> {program.title}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-slate-500 text-sm">/{program.slug}</p>
            <span className={cn("badge", STATUS_COLORS[program.status])}>{program.status}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Users size={11} /> {program.learner_count} learners</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          <button
            onClick={handleFillFromBuild}
            disabled={fillingFromBuild || courses.length === 0}
            title={courses.length === 0 ? "Add at least one course to the curriculum first" : "Draft the description and overview copy from this program's actual bundled courses"}
            className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            {fillingFromBuild ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {fillingFromBuild ? "Reading build…" : "Fill from Build"}
          </button>
          <button
            onClick={() => setShowAiModal(true)}
            className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5"
          >
            <Sparkles size={13} /> Generate with AI
          </button>
          {program.status === "draft" && (
            <button onClick={() => handleAction("publish")} className="btn-outline !py-2 !px-3 !text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <Globe size={13} /> Publish
            </button>
          )}
          {program.status === "published" && (
            <button onClick={() => handleAction("unpublish")} className="btn-outline !py-2 !px-3 !text-xs text-amber-600 border-amber-200 hover:bg-amber-50">
              <EyeOff size={13} /> Unpublish
            </button>
          )}
          {program.status !== "archived" && (
            <button onClick={() => handleAction("archive")} className="btn-outline !py-2 !px-3 !text-xs" title="Archive">
              <Archive size={13} />
            </button>
          )}
          <button onClick={() => handleAction("duplicate")} className="btn-outline !py-2 !px-3 !text-xs" title="Duplicate">
            <Copy size={13} />
          </button>
          <button onClick={() => handleAction("delete")} className="btn-outline !py-2 !px-3 !text-xs text-red-500 border-red-200 hover:bg-red-50" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {([
          ["overview", "Overview", null],
          ["curriculum", `Curriculum (${courses.length})`, BookOpen],
          ["instructors", `Instructors (${(program.instructors ?? []).length})`, GraduationCap],
          ["faqs", "FAQs", HelpCircle],
          ["marketing", "Marketing", Megaphone],
          ["testimonials", "Testimonials", Quote],
          ["certificate", "Certificate Design", Code2],
          ["enrollments", "Enrollments", Users],
          ["pricing", "Pricing", DollarSign],
          ["translations", "Translations", Languages],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap",
              activeTab === key ? "border-gold-500 text-gold-600" : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {Icon ? <Icon size={13} /> : null} {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <form onSubmit={handleSaveOverview} className="space-y-6">
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Identity</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input className="input-base" value={form.title} onChange={(e) => setField("title", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slug</label>
                <input className="input-base" value={form.slug} onChange={(e) => setField("slug", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="input-base" placeholder="e.g., AILP-2026" value={form.code} onChange={(e) => setField("code", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level</label>
                <select className="input-base" value={form.level} onChange={(e) => setField("level", e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration (weeks)</label>
                <input className="input-base" type="number" min="0" value={form.duration_weeks} onChange={(e) => setField("duration_weeks", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Estimated Hours</label>
                <input className="input-base" type="number" min="0" step="0.5" value={form.estimated_hours} onChange={(e) => setField("estimated_hours", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Card Image <span className="text-slate-400 font-normal">(shown on the /programs catalog card — leave blank for the default colored pattern)</span>
              </label>
              <CardImageUpload
                imageUrl={form.thumbnail_url}
                uploading={uploadingThumbnail}
                onUpload={uploadThumbnail}
                onRemove={() => setField("thumbnail_url", "")}
              />
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Short Description</label>
              <textarea className="input-base h-16 resize-none" value={form.short_description} onChange={(e) => setField("short_description", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea className="input-base h-24 resize-none" value={form.description} onChange={(e) => setField("description", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Overview</label>
              <textarea className="input-base h-24 resize-none" placeholder="Longer-form overview shown on the program landing page…" value={form.overview} onChange={(e) => setField("overview", e.target.value)} />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">What Learners Will Achieve</p>
            <StringListEditor items={learningOutcomes} onChange={setLearningOutcomes} placeholder="e.g., Design and deploy production AI systems" />
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Target Audience</p>
            <StringListEditor items={targetAudience} onChange={setTargetAudience} placeholder="e.g., Engineering managers" />
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Prerequisites</p>
            <StringListEditor items={prerequisites} onChange={setPrerequisites} placeholder="e.g., Basic Python experience" />
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Related Programs (by slug)</p>
            <p className="text-[11px] text-slate-400 -mt-2">Shown in the "What's Next?" section at the bottom of the public program page.</p>
            <StringListEditor items={relatedSlugs} onChange={setRelatedSlugs} placeholder="e.g., ai-product-leadership" />
          </div>

          <button type="submit" disabled={savingOverview} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {savingOverview ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Overview
          </button>
        </form>
      )}

      {/* Curriculum Tab */}
      {activeTab === "curriculum" && (
        <div className="space-y-4">
          <div className="card p-6">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">
              Curriculum {savingOrder && <Loader2 size={11} className="inline animate-spin ml-1" />}
            </p>
            {courses.length === 0 ? (
              <p className="text-xs text-slate-400 mb-2">No courses added yet — a program needs at least one course before it can be published.</p>
            ) : (
              <div className="space-y-2">
                {courses.map((pc: any, idx: number) => (
                  <div key={pc.id} className={cn("rounded-lg border", pc.special_type ? "border-purple-200 bg-purple-50/40" : "border-slate-200 bg-slate-50")}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex flex-col gap-0.5">
                        <button type="button" disabled={idx === 0} onClick={() => moveCourse(idx, -1)} className="text-slate-400 hover:text-navy-700 disabled:opacity-25">
                          <ArrowUp size={13} />
                        </button>
                        <button type="button" disabled={idx === courses.length - 1} onClick={() => moveCourse(idx, 1)} className="text-slate-400 hover:text-navy-700 disabled:opacity-25">
                          <ArrowDown size={13} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{pc.course.title}</p>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {pc.course.level} · {pc.course.duration_hours}h
                          {pc.course.is_listed === false && <span className="ml-1.5 text-slate-400">· Unlisted</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSpecialPanel(pc)}
                        className={cn(
                          "text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 capitalize",
                          pc.special_type === "capstone" ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : pc.special_type === "internship" ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-white text-slate-400 border border-dashed border-slate-300 hover:border-slate-400",
                        )}
                        title="Flag as this program's capstone or internship"
                      >
                        {pc.special_type ?? "+ Special"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRequired(pc.id, pc.is_required)}
                        disabled={!!pc.special_type}
                        className={cn(
                          "text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
                          pc.is_required ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200",
                        )}
                        title={pc.special_type ? "A capstone/internship course is always required" : "Click to toggle"}
                      >
                        {pc.is_required ? "Required" : "Elective"}
                      </button>
                      <button type="button" onClick={() => removeCourse(pc.id)} className="text-red-500 hover:text-red-700 flex-shrink-0" title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {expandedSpecialId === pc.id && (
                      <div className="border-t border-slate-200 p-4 space-y-4 bg-white rounded-b-lg">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Special Type</label>
                          <div className="flex gap-2">
                            {(["", "capstone", "internship"] as const).map((t) => (
                              <button
                                key={t || "none"}
                                type="button"
                                onClick={() => setSpecialForm((f) => ({ ...f, special_type: t }))}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize",
                                  specialForm.special_type === t ? "bg-navy-800 text-white border-navy-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
                                )}
                              >
                                {t || "None"}
                              </button>
                            ))}
                          </div>
                          {specialForm.special_type && (
                            <p className="text-[11px] text-slate-400 mt-2">
                              This course will be unlisted from the public catalog — only visible to admins, its instructors, and students enrolled in this program. Set up its content (including an assignment lesson for submission) in Course Manager.
                            </p>
                          )}
                        </div>

                        {specialForm.special_type === "capstone" && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deliverables</label>
                              <StringListEditor items={specialForm.deliverables ?? []} onChange={(v) => setSpecialForm((f) => ({ ...f, deliverables: v }))} placeholder="e.g., Working prototype + written report" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Learning Objectives</label>
                              <StringListEditor items={specialForm.learning_objectives ?? []} onChange={(v) => setSpecialForm((f) => ({ ...f, learning_objectives: v }))} placeholder="e.g., Apply the full ML lifecycle to a real dataset" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rubric Criteria</label>
                              <StringListEditor items={specialForm.rubric_criteria ?? []} onChange={(v) => setSpecialForm((f) => ({ ...f, rubric_criteria: v }))} placeholder="e.g., Technical correctness (30%)" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Submission Requirements</label>
                              <textarea className="input-base h-16 resize-none text-sm" value={specialForm.submission_requirements ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, submission_requirements: e.target.value }))} />
                            </div>
                            <div className="w-40">
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passing Score (%) <span className="text-slate-400 font-normal">(informational)</span></label>
                              <input className="input-base text-sm" type="number" min="0" max="100" value={specialForm.passing_score ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, passing_score: e.target.value }))} />
                            </div>
                          </div>
                        )}

                        {specialForm.special_type === "internship" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Host Organization</label>
                                <input className="input-base text-sm" value={specialForm.host_organization ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, host_organization: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hours Required</label>
                                <input className="input-base text-sm" type="number" min="0" value={specialForm.hours_required ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, hours_required: e.target.value }))} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supervisor Name</label>
                                <input className="input-base text-sm" value={specialForm.supervisor_name ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, supervisor_name: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supervisor Email</label>
                                <input className="input-base text-sm" type="email" value={specialForm.supervisor_email ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, supervisor_email: e.target.value }))} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Evaluation Criteria</label>
                              <StringListEditor items={specialForm.evaluation_criteria ?? []} onChange={(v) => setSpecialForm((f) => ({ ...f, evaluation_criteria: v }))} placeholder="e.g., Supervisor evaluation score" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Report Requirements</label>
                              <textarea className="input-base h-16 resize-none text-sm" value={specialForm.report_requirements ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, report_requirements: e.target.value }))} />
                            </div>
                            <div className="w-40">
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passing Score (%) <span className="text-slate-400 font-normal">(informational)</span></label>
                              <input className="input-base text-sm" type="number" min="0" max="100" value={specialForm.passing_score ?? ""} onChange={(e) => setSpecialForm((f) => ({ ...f, passing_score: e.target.value }))} />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleSaveSpecialType(pc.id)}
                            disabled={savingSpecialId === pc.id}
                            className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60"
                          >
                            {savingSpecialId === pc.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </button>
                          <button type="button" onClick={() => setExpandedSpecialId(null)} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-3">
              Required courses (including any capstone/internship) gate learner progress in this order. Electives are always available and never block completion.
            </p>
          </div>

          <div className="card p-6">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-3">Add a Course</p>
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                className="input-base !pl-8 text-sm"
                placeholder="Search existing courses…"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
            </div>
            {addableCourses.length === 0 ? (
              <p className="text-xs text-slate-400">No matching courses to add.</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {addableCourses.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{c.level} · {c.status}</p>
                    </div>
                    <button type="button" onClick={() => addCourse(c.id)} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1 flex-shrink-0">
                      <Plus size={11} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructors Tab */}
      {activeTab === "instructors" && (
        <ProgramInstructorsTab programId={programId} token={token} instructors={program.instructors ?? []} onRefresh={() => mutate()} />
      )}

      {/* FAQs Tab */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          <FaqEditor items={faqs} onChange={setFaqs} />
          <button type="button" onClick={handleSaveFaqs} disabled={savingFaqs} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {savingFaqs ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save FAQs
          </button>
        </div>
      )}

      {/* Marketing Tab */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Social Proof</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Star Rating</label>
                <p className="text-[10px] text-slate-400 mb-1.5">Shown as ★ {marketing.reviews_rating || "4.9"} in the hero</p>
                <input className="input-base" placeholder="4.9" value={marketing.reviews_rating} onChange={(e) => setMarketing((m) => ({ ...m, reviews_rating: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Review Count</label>
                <p className="text-[10px] text-slate-400 mb-1.5">e.g. "1,200+ reviews"</p>
                <input className="input-base" placeholder="1,200+" value={marketing.reviews_count} onChange={(e) => setMarketing((m) => ({ ...m, reviews_count: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Social Proof Line</label>
              <p className="text-[10px] text-slate-400 mb-1.5">Shown in the sidebar CTA below the Enroll button</p>
              <input className="input-base" placeholder="Join 3,200+ program graduates" value={marketing.social_proof} onChange={(e) => setMarketing((m) => ({ ...m, social_proof: e.target.value }))} />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Hero</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Badge Label</label>
              <p className="text-[10px] text-slate-400 mb-1.5">Dark pill shown above the title</p>
              <input className="input-base" placeholder="Professional Program" value={marketing.hero_badge_label} onChange={(e) => setMarketing((m) => ({ ...m, hero_badge_label: e.target.value }))} />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <StringListEditor items={marketing.enrollment_includes} onChange={(v) => setMarketing((m) => ({ ...m, enrollment_includes: v }))} placeholder="e.g., Digital certificate of completion" />
            <p className="text-[10px] text-slate-400 -mt-2">What's Included — bullet points shown in the enrollment card</p>
          </div>

          <div className="card p-6">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-3">Hero Preview</p>
            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">{marketing.hero_badge_label || "Professional Program"}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={11} className="text-white fill-white" />)}
                <span className="text-white text-xs ml-1">{marketing.reviews_rating || "4.9"} ({marketing.reviews_count || "1,200+ reviews"})</span>
              </div>
            </div>
          </div>

          <button type="button" onClick={handleSaveMarketing} disabled={savingMarketing} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {savingMarketing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Marketing
          </button>
        </div>
      )}

      {/* Testimonials Tab */}
      {activeTab === "testimonials" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Add 3 testimonials for best results. They appear in a row on the marketing page.</p>
          <TestimonialsEditor items={testimonials} onChange={setTestimonials} />
          <button type="button" onClick={handleSaveTestimonials} disabled={savingTestimonials} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {savingTestimonials ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Testimonials
          </button>
        </div>
      )}

      {/* Certificate Design Tab */}
      {activeTab === "certificate" && (
        <div className="space-y-6">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <button type="button" onClick={() => setCertDesignMode("html")}
              className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors", certDesignMode === "html" ? "bg-white text-navy-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Paste / Upload HTML
            </button>
            <button type="button" onClick={() => setCertDesignMode("visual")}
              className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors", certDesignMode === "visual" ? "bg-white text-navy-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Visual Builder
            </button>
          </div>

          {certDesignMode === "visual" && (
            <VisualCertBuilder onGenerate={(html) => {
              setMarketing((m) => ({ ...m, certificate_template_html: html }));
              setCertDesignMode("html");
              setCertPreview(true);
            }} />
          )}

          {certDesignMode === "html" && (<>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste the full HTML of the certificate design below. Use the variable placeholders shown below — they'll be replaced with the student's actual data when the certificate is generated.
            </p>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Placeholders</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["{{STUDENT_NAME}}", "Student's full name"],
                  ["{{PROGRAM_TITLE}}", "Full program title"],
                  ["{{CERT_NUMBER}}", "Unique certificate number"],
                  ["{{ISSUE_DATE}}", "Date certificate was issued"],
                ].map(([variable, desc]) => (
                  <button key={variable} type="button"
                    onClick={() => { navigator.clipboard.writeText(variable); setCopiedVar(variable); setTimeout(() => setCopiedVar(null), 1500); }}
                    className="flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-navy-300 hover:bg-navy-50 transition-colors group">
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

            <div>
              <div className="flex items-center justify-between mb-2 gap-3">
                <label className="text-xs font-semibold text-slate-700">HTML Template</label>
                <div className="flex items-center gap-2">
                  <input ref={htmlFileRef} type="file" accept=".html,.htm" className="hidden" onChange={handleHtmlFileUpload} />
                  <button type="button" onClick={() => htmlFileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-800 border border-slate-200 hover:border-navy-300 bg-white px-2.5 py-1.5 rounded-lg transition-colors">
                    <Upload size={12} /> Upload HTML File
                  </button>
                  <button type="button" onClick={() => setCertPreview((v) => !v)} disabled={!marketing.certificate_template_html.trim()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Eye size={13} /> {certPreview ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>

              {certPreview && marketing.certificate_template_html ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                  <div className="bg-slate-200 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Preview — sample data</span>
                  </div>
                  <iframe
                    srcDoc={marketing.certificate_template_html
                      .replace(/\{\{STUDENT_NAME\}\}/g, "Jane Smith")
                      .replace(/\{\{PROGRAM_TITLE\}\}/g, program.title)
                      .replace(/\{\{CERT_NUMBER\}\}/g, "PGM-SAMPLE1")
                      .replace(/\{\{ISSUE_DATE\}\}/g, "June 19, 2026")}
                    className="w-full" style={{ height: "600px", border: "none" }}
                    title="Certificate preview" sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              ) : (
                <textarea
                  className="input-base font-mono text-xs resize-y" style={{ minHeight: "420px" }}
                  placeholder={`<!DOCTYPE html>\n<html>\n<head><style>/* your styles */</style></head>\n<body>\n  <h1>{{PROGRAM_TITLE}}</h1>\n  <p>Awarded to {{STUDENT_NAME}}</p>\n  <p>Certificate No: {{CERT_NUMBER}}</p>\n</body>\n</html>`}
                  value={marketing.certificate_template_html}
                  onChange={(e) => setMarketing((m) => ({ ...m, certificate_template_html: e.target.value }))}
                  spellCheck={false}
                />
              )}
            </div>
          </>)}

          <button type="button" onClick={handleSaveMarketing} disabled={savingMarketing} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {savingMarketing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Certificate Design
          </button>
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === "enrollments" && (
        <ProgramEnrollmentsTab
          programId={programId}
          token={token}
          requiredCourses={courses.filter((c: any) => c.is_required).map((c: any) => ({ course_id: c.course_id, title: c.course?.title ?? "Untitled course" }))}
        />
      )}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <form onSubmit={handleSavePricing} className="space-y-6">
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price</label>
                <input className="input-base" type="number" min="0" step="0.01" value={pricingForm.price} onChange={(e) => setPricingField("price", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Currency</label>
                <input className="input-base" value={pricingForm.currency} onChange={(e) => setPricingField("currency", e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Learners pay this one price for the whole program — never the sum of the individual course prices.
            </p>
          </div>

          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Enrollment</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Learners <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="input-base" type="number" min="0" value={pricingForm.max_learners} onChange={(e) => setPricingField("max_learners", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Access Duration (days) <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="input-base" type="number" min="0" value={pricingForm.access_duration_days} onChange={(e) => setPricingField("access_duration_days", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-700">Allow individual course purchase</p>
                <p className="text-[11px] text-slate-400">Let students buy bundled courses on their own, outside the program</p>
              </div>
              <button
                type="button"
                onClick={() => setPricingField("allow_individual_course_purchase", !pricingForm.allow_individual_course_purchase)}
                className={cn("relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors", pricingForm.allow_individual_course_purchase ? "bg-navy-700" : "bg-slate-300")}
              >
                <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform", pricingForm.allow_individual_course_purchase ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-700">Featured</p>
                <p className="text-[11px] text-slate-400">Highlight this program on the catalog</p>
              </div>
              <button
                type="button"
                onClick={() => setPricingField("is_featured", !pricingForm.is_featured)}
                className={cn("relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors", pricingForm.is_featured ? "bg-navy-700" : "bg-slate-300")}
              >
                <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform", pricingForm.is_featured ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Completion Certificate</p>
            <p className="text-[11px] text-slate-400 -mt-2">
              This is a distinct, auto-issued credential — separate from PAII's accredited certifications. It's granted automatically once every required course is completed in order and the capstone is passed.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate Title</label>
              <input className="input-base" placeholder="Certificate of Completion — AI Leadership Program" value={pricingForm.certificate_title} onChange={(e) => setPricingField("certificate_title", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate Description</label>
              <textarea className="input-base h-16 resize-none" value={pricingForm.certificate_description} onChange={(e) => setPricingField("certificate_description", e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={savingPricing} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {savingPricing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Pricing & Certificate
          </button>
        </form>
      )}

      {/* Translations Tab */}
      {activeTab === "translations" && (
        <div className="space-y-4">
          {nonEnglishLanguages.length === 0 ? (
            <div className="card p-6 text-center text-slate-500 text-sm">
              No additional languages are enabled yet. Add one in Site Settings → Languages.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {nonEnglishLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setTranslationLocale(lang.code)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      translationLocale === lang.code ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {lang.native_name}
                  </button>
                ))}
              </div>

              {translationLocale && (() => {
                const lang = nonEnglishLanguages.find((l) => l.code === translationLocale);
                const jsonErr = (field: string) => translationJsonErrors[`${translationLocale}:${field}`];
                return (
                  <div className="card p-5 space-y-4" dir={lang?.is_rtl ? "rtl" : "ltr"}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">{lang?.name} Translation</p>
                      <button
                        onClick={() => retranslate(translationLocale)}
                        disabled={retranslating === translationLocale}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-50"
                      >
                        {retranslating === translationLocale ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Re-translate from English
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Auto-translated by AI when this program is saved or when {lang?.name} is enabled. Edit directly here, or re-translate to overwrite with a fresh AI pass — English stays the source of truth. Testimonials are not translated.
                    </p>
                    <Field label="Title">
                      <input className="input-base" value={getTranslatedText(translationLocale, "title")} onChange={(e) => setTranslatedField(translationLocale, "title", e.target.value)} />
                    </Field>
                    <Field label="Short Description">
                      <textarea className="input-base h-16 resize-none" value={getTranslatedText(translationLocale, "short_description")} onChange={(e) => setTranslatedField(translationLocale, "short_description", e.target.value)} />
                    </Field>
                    <Field label="Description">
                      <textarea className="input-base h-28 resize-none" value={getTranslatedText(translationLocale, "description")} onChange={(e) => setTranslatedField(translationLocale, "description", e.target.value)} />
                    </Field>
                    <Field label="Overview">
                      <textarea className="input-base h-28 resize-none" value={getTranslatedText(translationLocale, "overview")} onChange={(e) => setTranslatedField(translationLocale, "overview", e.target.value)} />
                    </Field>
                    <Field label="Learning Outcomes" hint="One per line">
                      <textarea className="input-base h-28 resize-none" value={getTranslatedStringList(translationLocale, "learning_outcomes")} onChange={(e) => setTranslatedStringList(translationLocale, "learning_outcomes", e.target.value)} />
                    </Field>
                    <Field label="Target Audience" hint="One per line">
                      <textarea className="input-base h-28 resize-none" value={getTranslatedStringList(translationLocale, "target_audience")} onChange={(e) => setTranslatedStringList(translationLocale, "target_audience", e.target.value)} />
                    </Field>
                    <Field label="Prerequisites" hint="One per line">
                      <textarea className="input-base h-24 resize-none" value={getTranslatedStringList(translationLocale, "prerequisites")} onChange={(e) => setTranslatedStringList(translationLocale, "prerequisites", e.target.value)} />
                    </Field>
                    <Field label="FAQs" hint="JSON — array of { question, answer }">
                      <textarea
                        className="input-base h-48 resize-y font-mono text-xs"
                        value={getTranslatedJsonTextValue(translationLocale, "faqs_json")}
                        onChange={(e) => setTranslatedJsonText(translationLocale, "faqs_json", e.target.value)}
                        dir="ltr"
                      />
                      {jsonErr("faqs_json") && <p className="text-[11px] text-red-500 mt-1">{jsonErr("faqs_json")}</p>}
                    </Field>
                    <Field label="Marketing Meta" hint="JSON — reviews_rating, reviews_count, social_proof, hero_badge_label, enrollment_includes[]">
                      <textarea
                        className="input-base h-40 resize-y font-mono text-xs"
                        value={getTranslatedJsonTextValue(translationLocale, "marketing_meta")}
                        onChange={(e) => setTranslatedJsonText(translationLocale, "marketing_meta", e.target.value)}
                        dir="ltr"
                      />
                      {jsonErr("marketing_meta") && <p className="text-[11px] text-red-500 mt-1">{jsonErr("marketing_meta")}</p>}
                    </Field>
                    <div className="flex justify-end">
                      <button onClick={() => saveTranslation(translationLocale)} disabled={savingTranslation === translationLocale} className="btn-primary !py-2 !px-4 !text-xs">
                        {savingTranslation === translationLocale ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Translation
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Generate with AI Modal */}
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
              Describe the program — what it's about, who it's for, and what graduates should walk away with. AI will
              draft the title, description, outcomes, FAQs, and marketing copy across every tab (it won't pick
              courses for the curriculum — that's still up to you). This overwrites the fields below with the draft —
              review and edit anything before saving.
            </p>
            <textarea
              className="input-base h-32 resize-none"
              placeholder="e.g. A 12-week program for engineering managers who want to lead AI adoption at their company — bundling our AI Fundamentals, Data Strategy, and AI Governance courses, capped off with a real-world transformation-plan capstone."
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
    </div>
  );
}

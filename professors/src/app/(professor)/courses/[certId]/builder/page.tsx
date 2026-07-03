"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Edit3, Check, Video, FileText, HelpCircle,
  File, Link2, Download, Eye, EyeOff, X, ChevronDown, ChevronRight,
  Save, Upload, GripVertical, BookOpen, Search, Loader2,
  ArrowLeft, ArrowRight, CheckCircle, FileQuestion, Code2, Layers,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type QuizQuestion = {
  id: string; lesson_id: string; question_text: string; question_type: string;
  options: string[]; correct_index: number; explanation?: string; points: number; sort_order: number;
};

type Lesson = {
  id: string; module_id: string; title: string; type: string; description?: string;
  content?: string; video_url?: string; download_url?: string; allow_download?: boolean;
  external_url?: string; is_published: boolean; duration_minutes: number; order_index: number;
  passing_score?: number; max_attempts?: number; max_score?: number; due_date?: string;
  allow_text_response?: boolean; text_word_limit?: number;
};

type Module = { id: string; title: string; description?: string; is_published: boolean; order_index: number; lessons: Lesson[] };

type CourseDocument = {
  id: string;
  title: string;
  file_url: string;
  file_name?: string;
};

type CourseContent = {
  overview_headline?: string;
  overview_body?: string;
  learning_outcomes?: string[];
  how_it_works_headline?: string;
  how_it_works_steps?: { title: string; description: string }[];
  training_exam_prep_headline?: string;
  training_exam_prep_body?: string;
  training_exam_prep_items?: string[];
  related_course_slugs?: string[];
};

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video, reading: FileText, quiz: HelpCircle,
  assignment: File, download: Download, live_session: Link2, html: FileQuestion,
};
const LESSON_COLORS: Record<string, string> = {
  video: "text-blue-600 bg-blue-50", reading: "text-emerald-600 bg-emerald-50",
  quiz: "text-purple-600 bg-purple-50", assignment: "text-amber-600 bg-amber-50",
  download: "text-slate-600 bg-slate-100", live_session: "text-rose-600 bg-rose-50",
  html: "text-orange-600 bg-orange-50",
};
const LESSON_TYPE_LABEL: Record<string, string> = {
  video: "Video", reading: "Reading", quiz: "Quiz",
  assignment: "Assignment", download: "Download / PDF", live_session: "Live Session", html: "HTML Page",
};

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STATUSES = ["draft", "active", "archived"] as const;

function Field({ label, value, onChange, textarea = false, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {textarea ? (
        <textarea className="input-base h-24 resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className="input-base" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ course, courseId, token, onSaved }: { course: any; courseId: string; token: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: course.title ?? "",
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    level: (course.level ?? "beginner") as typeof LEVELS[number],
    status: (course.status ?? "draft") as typeof STATUSES[number],
    duration_hours: String(course.duration_hours ?? 0),
    price: String(course.price ?? 0),
  });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      await api.put(`/prof/courses/${courseId}`, {
        title: form.title,
        subtitle: form.subtitle || undefined,
        description: form.description || undefined,
        level: form.level,
        status: form.status,
        duration_hours: parseFloat(form.duration_hours) || 0,
        price: parseFloat(form.price) || 0,
      }, token);
      toast.success("Course updated!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update course");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 max-w-2xl">
      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Identity</p>
        <Field label="Title" value={form.title} onChange={(v) => set("title", v)} placeholder="AI Fundamentals for Professionals" />
        <Field label="Subtitle" value={form.subtitle} onChange={(v) => set("subtitle", v)} placeholder="Short tagline for the course card" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Level</label>
            <select className="input-base" value={form.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select className="input-base" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content</p>
        <Field label="Description" value={form.description} onChange={(v) => set("description", v)} textarea placeholder="What students will learn in this course…" />
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (hours)" value={form.duration_hours} onChange={(v) => set("duration_hours", v)} type="number" placeholder="8" />
          <Field label="Price (USD)" value={form.price} onChange={(v) => set("price", v)} type="number" placeholder="99.00" />
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
      </button>
    </form>
  );
}

// ─── Content tab ──────────────────────────────────────────────────────────────

function ContentTab({ course, courseId, token, onSaved }: { course: any; courseId: string; token: string; onSaved: () => void }) {
  const c: CourseContent = course.content ?? {};
  const [form, setForm] = useState<CourseContent>({
    overview_headline: c.overview_headline ?? "",
    overview_body: c.overview_body ?? "",
    learning_outcomes: c.learning_outcomes ?? [],
    how_it_works_headline: c.how_it_works_headline ?? "",
    how_it_works_steps: c.how_it_works_steps ?? [],
    training_exam_prep_headline: c.training_exam_prep_headline ?? "",
    training_exam_prep_body: c.training_exam_prep_body ?? "",
    training_exam_prep_items: c.training_exam_prep_items ?? [],
    related_course_slugs: c.related_course_slugs ?? [],
  });
  const [saving, setSaving] = useState(false);

  function setField(k: keyof CourseContent, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/prof/courses/${courseId}`, { content: form }, token);
      toast.success("Course content updated!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update content");
    } finally {
      setSaving(false);
    }
  }

  function addOutcome() {
    setForm((f) => ({ ...f, learning_outcomes: [...(f.learning_outcomes ?? []), ""] }));
  }
  function updateOutcome(i: number, v: string) {
    setForm((f) => ({ ...f, learning_outcomes: (f.learning_outcomes ?? []).map((o, idx) => idx === i ? v : o) }));
  }
  function removeOutcome(i: number) {
    setForm((f) => ({ ...f, learning_outcomes: (f.learning_outcomes ?? []).filter((_, idx) => idx !== i) }));
  }

  function addStep() {
    setForm((f) => ({ ...f, how_it_works_steps: [...(f.how_it_works_steps ?? []), { title: "", description: "" }] }));
  }
  function updateStep(i: number, key: "title" | "description", v: string) {
    setForm((f) => ({ ...f, how_it_works_steps: (f.how_it_works_steps ?? []).map((s, idx) => idx === i ? { ...s, [key]: v } : s) }));
  }
  function removeStep(i: number) {
    setForm((f) => ({ ...f, how_it_works_steps: (f.how_it_works_steps ?? []).filter((_, idx) => idx !== i) }));
  }

  function addItem() {
    setForm((f) => ({ ...f, training_exam_prep_items: [...(f.training_exam_prep_items ?? []), ""] }));
  }
  function updateItem(i: number, v: string) {
    setForm((f) => ({ ...f, training_exam_prep_items: (f.training_exam_prep_items ?? []).map((it, idx) => idx === i ? v : it) }));
  }
  function removeItem(i: number) {
    setForm((f) => ({ ...f, training_exam_prep_items: (f.training_exam_prep_items ?? []).filter((_, idx) => idx !== i) }));
  }

  return (
    <form onSubmit={save} className="space-y-5 max-w-2xl">
      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Overview</p>
        <Field label="Headline" value={form.overview_headline ?? ""} onChange={(v) => setField("overview_headline", v)} placeholder="What is this course about?" />
        <Field label="Body" value={form.overview_body ?? ""} onChange={(v) => setField("overview_body", v)} textarea placeholder="Detailed overview of the course…" />
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">What You'll Learn</p>
          <button type="button" onClick={addOutcome} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"><Plus size={12} /> Add</button>
        </div>
        {(form.learning_outcomes ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">No learning outcomes yet.</p>
        ) : (
          <div className="space-y-2">
            {(form.learning_outcomes ?? []).map((o, i) => (
              <div key={i} className="flex items-start gap-2">
                <input className="input-base text-sm flex-1" value={o} onChange={(e) => updateOutcome(i, e.target.value)} placeholder="e.g., Understand core AI concepts" />
                <button type="button" onClick={() => removeOutcome(i)} className="text-red-500 hover:text-red-700 mt-1.5"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">How It Works</p>
        <Field label="Headline" value={form.how_it_works_headline ?? ""} onChange={(v) => setField("how_it_works_headline", v)} placeholder="How the course is structured" />
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-600">Steps</label>
          <button type="button" onClick={addStep} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"><Plus size={12} /> Add Step</button>
        </div>
        {(form.how_it_works_steps ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">No steps yet.</p>
        ) : (
          <div className="space-y-3">
            {(form.how_it_works_steps ?? []).map((s, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Step {i + 1}</span>
                  <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700 ml-auto"><Trash2 size={12} /></button>
                </div>
                <input className="input-base text-sm" value={s.title} onChange={(e) => updateStep(i, "title", e.target.value)} placeholder="Step title" />
                <textarea className="input-base text-sm h-16 resize-none" value={s.description} onChange={(e) => updateStep(i, "description", e.target.value)} placeholder="Step description" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Training &amp; Exam Prep</p>
        <Field label="Headline" value={form.training_exam_prep_headline ?? ""} onChange={(v) => setField("training_exam_prep_headline", v)} placeholder="Training and exam preparation details" />
        <Field label="Body" value={form.training_exam_prep_body ?? ""} onChange={(v) => setField("training_exam_prep_body", v)} textarea placeholder="Details about training and exam prep…" />
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-600">Includes</label>
          <button type="button" onClick={addItem} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"><Plus size={12} /> Add Item</button>
        </div>
        {(form.training_exam_prep_items ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">No items yet.</p>
        ) : (
          <div className="space-y-2">
            {(form.training_exam_prep_items ?? []).map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <input className="input-base text-sm flex-1" value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder="e.g., Practice exams, Study guides" />
                <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 mt-1.5"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Content
      </button>
    </form>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ courseId, token }: { courseId: string; token: string }) {
  const { data: docsRaw, mutate } = useSWR(
    token && courseId ? [`/prof/courses/${courseId}/documents`, token] as const : null,
    ([url, t]) => api.get<any>(url, t)
  );
  const documents: CourseDocument[] = (() => {
    const d = (docsRaw as any)?.data ?? docsRaw;
    return Array.isArray(d) ? d : [];
  })();

  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  async function uploadFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_BASE}/uploads/local`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const data = await res.json();
        const fileUrl: string = data?.url ?? data?.data?.url;
        if (!fileUrl) throw new Error("No URL in response");
        const docTitle = (files.length === 1 && title.trim())
          ? title.trim()
          : file.name.replace(/\.[^/.]+$/, "");
        await api.post(`/prof/courses/${courseId}/documents`, {
          title: docTitle,
          file_url: fileUrl,
          file_name: file.name,
        }, token);
      }
      setTitle("");
      toast.success(files.length > 1 ? `${files.length} documents added` : "Document added");
      mutate();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function saveRename(doc: CourseDocument) {
    if (!editTitle.trim()) return;
    await toast.promise(
      api.put(`/prof/courses/${courseId}/documents/${doc.id}`, { title: editTitle.trim() }, token)
        .then(() => { setEditingId(null); mutate(); }),
      { loading: "Saving…", success: "Renamed", error: "Failed" }
    );
  }

  async function deleteDocument(doc: CourseDocument) {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await toast.promise(
      api.delete(`/prof/courses/${courseId}/documents/${doc.id}`, token).then(() => mutate()),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-6">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-1">Course Documents</p>
        <p className="text-[11px] text-slate-400 mb-4">
          Syllabus, outline, or any other file students can download from the public course page — visible before they enroll.
        </p>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-400 mb-4">No documents yet.</p>
        ) : (
          <div className="space-y-2 mb-5">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-navy-600" />
                </div>
                {editingId === doc.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      className="input-base py-1 text-sm flex-1"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveRename(doc); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                    />
                    <button onClick={() => saveRename(doc)} className="text-emerald-600 hover:text-emerald-700"><Check size={15} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-navy-500 hover:underline truncate block">
                      {doc.file_name || doc.file_url.split("/").pop()}
                    </a>
                  </div>
                )}
                {editingId !== doc.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-navy-700" title="Download">
                      <Download size={14} />
                    </a>
                    <button onClick={() => { setEditingId(doc.id); setEditTitle(doc.title); }} className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-navy-700" title="Rename">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteDocument(doc)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Name <span className="text-slate-400 font-normal normal-case">(optional for a single file — leave blank to use the file name; ignored when uploading several at once)</span>
            </label>
            <input
              className="input-base text-sm"
              placeholder="e.g., Course Syllabus, Module Outline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <label className={cn(
            "flex items-center justify-center gap-2 h-16 rounded-lg cursor-pointer transition-colors text-sm",
            uploading ? "bg-navy-50 text-navy-400" : "bg-slate-50 hover:bg-navy-50 text-slate-500 hover:text-navy-700"
          )}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Click to upload one or more files"}
            <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={uploadFiles} disabled={uploading} />
          </label>
          <p className="text-[11px] text-slate-400">You can add as many documents as you like — repeat this to upload more.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Curriculum tab — builder sidebar ─────────────────────────────────────────

function CourseSidebar({
  modules, selectedLessonId, onSelectLesson, onAddModule, onDeleteModule,
  onAddLesson, onDeleteLesson, studentView,
}: {
  modules: Module[]; selectedLessonId: string | null; onSelectLesson: (l: Lesson, m: Module) => void;
  onAddModule: () => void; onDeleteModule: (m: Module) => void;
  onAddLesson: (m: Module) => void; onDeleteLesson: (l: Lesson, m: Module) => void;
  studentView: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const init: Record<string, boolean> = {};
    modules.forEach(m => { init[m.id] = true; });
    setExpanded(prev => ({ ...init, ...prev }));
  }, [modules.length]);

  const filtered = search
    ? modules.map(m => ({ ...m, lessons: m.lessons.filter(l => l.title.toLowerCase().includes(search.toLowerCase())) })).filter(m => m.lessons.length > 0 || m.title.toLowerCase().includes(search.toLowerCase()))
    : modules;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search titles"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-400"
          />
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map(mod => (
          <div key={mod.id}>
            {/* Module row */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 group hover:bg-slate-50">
              <button onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))} className="p-0.5 text-slate-500">
                {expanded[mod.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <span className="flex-1 text-sm font-semibold text-navy-800 truncate cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))}>
                {mod.title}
              </span>
              {!studentView && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button onClick={() => onAddLesson(mod)} className="p-1.5 rounded hover:bg-navy-100 text-slate-400 hover:text-navy-700" title="Add lesson"><Plus size={13} /></button>
                  <button onClick={() => onDeleteModule(mod)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete module"><Trash2 size={13} /></button>
                </div>
              )}
            </div>

            {/* Lesson rows */}
            {expanded[mod.id] && mod.lessons.map(lesson => {
              const Icon = LESSON_ICONS[lesson.type] ?? FileText;
              const isSelected = lesson.id === selectedLessonId;
              return (
                <div
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson, mod)}
                  className={cn(
                    "flex items-center gap-2.5 pl-8 pr-2.5 py-2.5 cursor-pointer group transition-colors",
                    isSelected ? "bg-navy-700 text-white" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <Icon size={16} className={isSelected ? "text-white" : "text-slate-400"} />
                  <span className={cn("flex-1 text-sm truncate", isSelected ? "text-white font-medium" : "text-slate-700")}>
                    {lesson.title}
                  </span>
                  {!lesson.is_published && !isSelected && (
                    <span className="text-xs text-slate-400">draft</span>
                  )}
                  {!studentView && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteLesson(lesson, mod); }}
                      className={cn("opacity-0 group-hover:opacity-100 p-1 rounded", isSelected ? "hover:bg-navy-800 text-navy-200" : "hover:bg-red-50 text-slate-400 hover:text-red-600")}
                    ><Trash2 size={13} /></button>
                  )}
                </div>
              );
            })}

            {/* Add lesson button */}
            {!studentView && expanded[mod.id] && (
              <button
                onClick={() => onAddLesson(mod)}
                className="flex items-center gap-2 pl-9 pr-3 py-2 w-full text-sm text-slate-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
              >
                <Plus size={14} /> Add lesson
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add module */}
      {!studentView && (
        <div className="p-3 border-t border-slate-100">
          <button onClick={onAddModule} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-slate-200 hover:border-navy-300 text-sm text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all">
            <Plus size={14} /> New Module
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reading Editor ───────────────────────────────────────────────────────────

function ReadingEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [content, setContent] = useState(lesson.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setContent(lesson.content ?? ""); }, [lesson.id, lesson.content]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, { content_body: content }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Content</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full h-72 input-base resize-none text-sm leading-relaxed font-mono"
          placeholder="Write your lesson content here..."
        />
        <p className="text-xs text-slate-400 mt-1">Supports plain text. HTML tags will be rendered.</p>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Video Editor ─────────────────────────────────────────────────────────────

function VideoEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [url, setUrl] = useState(lesson.video_url ?? "");
  const [content, setContent] = useState(lesson.content ?? "");
  const [contentMode, setContentMode] = useState<"text" | "html">(
    (lesson.content ?? "").trim().startsWith("<") ? "html" : "text"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(lesson.video_url ?? "");
    setContent(lesson.content ?? "");
    setContentMode((lesson.content ?? "").trim().startsWith("<") ? "html" : "text");
  }, [lesson.id, lesson.content]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, { video_url: url, content_body: content }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  const embedUrl = isYoutube ? url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/") : url;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Video URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} className="input-base text-sm" placeholder="https://youtube.com/watch?v=... or direct video URL" />
      </div>
      {url && isYoutube && (
        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video preview" />
        </div>
      )}
      {url && !isYoutube && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
          <video src={url} controls className="w-full h-full" />
        </div>
      )}

      {/* Text below video */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Text Below Video</label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            <button
              onClick={() => setContentMode("text")}
              className={cn("px-3 py-1 transition-colors", contentMode === "text" ? "bg-navy-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              Text
            </button>
            <button
              onClick={() => setContentMode("html")}
              className={cn("px-3 py-1 transition-colors border-l border-slate-200", contentMode === "html" ? "bg-navy-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              HTML
            </button>
          </div>
        </div>
        {contentMode === "html" ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-48 font-mono text-sm border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-navy-200 bg-slate-950 text-emerald-400"
            placeholder={"<p>Write your HTML here…</p>"}
            spellCheck={false}
          />
        ) : (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-36 input-base resize-none text-sm leading-relaxed"
            placeholder="Add supplementary text, notes, or a description below the video…"
          />
        )}
      </div>

      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Download Editor ──────────────────────────────────────────────────────────

function DownloadEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [url, setUrl] = useState(lesson.download_url ?? "");
  const [allowDownload, setAllowDownload] = useState(lesson.allow_download ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(lesson.download_url ?? "");
    setAllowDownload(lesson.allow_download ?? true);
  }, [lesson.id]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  async function uploadAndSave(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/uploads/local`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      const fileUrl: string = data?.url ?? data?.data?.url;
      if (!fileUrl) throw new Error("No URL in response");
      await api.put(`/prof/courses/lessons/${lesson.id}`, { download_url: fileUrl }, token);
      setUrl(fileUrl);
      toast.success("File uploaded and saved");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, { download_url: url, allow_download: allowDownload }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Upload PDF / File</label>
        <label className={cn("flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors", uploading ? "border-navy-200 bg-navy-50" : "border-slate-200 hover:border-navy-300 hover:bg-navy-50")}>
          {uploading ? <Loader2 size={20} className="animate-spin text-navy-500" /> : <Upload size={20} className="text-slate-400" />}
          <span className="text-sm text-slate-500">{uploading ? "Uploading…" : "Click to upload PDF or file"}</span>
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={uploadAndSave} disabled={uploading} />
        </label>
      </div>
      {url && (
        <div className="space-y-2">
          {/\.pdf$/i.test(url) && (
            <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 500 }}>
              <iframe src={url} className="w-full h-full" title="PDF Preview" style={{ border: "none" }} />
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <File size={16} className="text-slate-500 flex-shrink-0" />
            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:underline truncate flex-1">{url.split("/").pop()}</a>
            <button onClick={() => setUrl("")} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
          </div>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Or paste URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} className="input-base text-sm" placeholder="https://..." />
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div>
          <p className="text-sm font-medium text-slate-700">Allow Download</p>
          <p className="text-xs text-slate-500">Students can download this file</p>
        </div>
        <button
          onClick={async () => {
            const next = !allowDownload;
            setAllowDownload(next);
            try {
              await api.put(`/prof/courses/lessons/${lesson.id}`, { allow_download: next }, token);
              toast.success(next ? "Download enabled" : "Download disabled");
              onSaved();
            } catch { setAllowDownload(!next); toast.error("Failed to update"); }
          }}
          className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0", allowDownload ? "bg-navy-700" : "bg-slate-300")}
        >
          <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", allowDownload ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Quiz Editor ──────────────────────────────────────────────────────────────

function QuizEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const questionsKey = token ? [`/prof/courses/lessons/${lesson.id}/questions`, token] : null;
  const { data: qRaw, mutate: mutateQ } = useSWR(questionsKey, ([url, t]) => api.get<any>(url, t), { dedupingInterval: 0 });
  const questions: QuizQuestion[] = (() => { try { const d = (qRaw as any)?.data ?? qRaw; return Array.isArray(d) ? d : []; } catch { return []; } })();

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "", question_type: "multiple_choice" });
  const [saving, setSaving] = useState(false);

  const [passingScore, setPassingScore] = useState(lesson.passing_score ?? 70);
  const [maxAttempts, setMaxAttempts] = useState(lesson.max_attempts ?? 3);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => { setPassingScore(lesson.passing_score ?? 70); setMaxAttempts(lesson.max_attempts ?? 3); }, [lesson.id]);

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, { passing_score: passingScore, max_attempts: maxAttempts }, token);
      toast.success("Settings saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSettingsSaving(false); }
  }

  function resetForm() { setForm({ question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "", question_type: "multiple_choice" }); setAdding(false); setEditId(null); }

  async function submitQuestion() {
    if (!form.question_text.trim()) { toast.error("Question text required"); return; }
    const opts = form.options.filter(o => o.trim());
    if (form.question_type === "multiple_choice" && opts.length < 2) { toast.error("Add at least 2 options"); return; }
    setSaving(true);
    try {
      const payload = { ...form, options: form.question_type === "true_false" ? ["True", "False"] : opts, sort_order: questions.length };
      if (editId) { await api.put(`/prof/courses/lessons/${lesson.id}/questions/${editId}`, payload, token); }
      else { await api.post(`/prof/courses/lessons/${lesson.id}/questions`, payload, token); }
      toast.success(editId ? "Question updated" : "Question added");
      mutateQ(); resetForm();
    } catch { toast.error("Failed to save question"); }
    finally { setSaving(false); }
  }

  async function deleteQuestion(qId: string) {
    if (!confirm("Delete this question?")) return;
    await toast.promise(
      api.delete(`/prof/courses/lessons/${lesson.id}/questions/${qId}`, token).then(() => mutateQ()),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  function startEdit(q: QuizQuestion) {
    setForm({ question_text: q.question_text, options: q.options.length >= 4 ? q.options : [...q.options, ...Array(4 - q.options.length).fill("")], correct_index: q.correct_index, explanation: q.explanation ?? "", question_type: q.question_type });
    setEditId(q.id); setAdding(true);
  }

  return (
    <div className="space-y-5">
      {/* Settings row */}
      <div className="flex items-end gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
        <div>
          <label className="text-xs font-semibold text-purple-700 mb-1 block">Passing Score (%)</label>
          <input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(+e.target.value)} className="input-base w-24 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-purple-700 mb-1 block">Max Attempts</label>
          <input type="number" min={1} max={10} value={maxAttempts} onChange={e => setMaxAttempts(+e.target.value)} className="input-base w-24 text-sm" />
        </div>
        <button onClick={saveSettings} disabled={settingsSaving} className="btn-primary !py-2 !px-3 !text-xs disabled:opacity-60">
          {settingsSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Settings
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="p-4 border border-slate-200 rounded-xl bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{i + 1}. {q.question_text}</p>
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={cn("flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg", oi === q.correct_index ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-600")}>
                      {oi === q.correct_index ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                      {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="text-xs text-slate-400 mt-2 italic">"{q.explanation}"</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => startEdit(q)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-navy-700"><Edit3 size={13} /></button>
                <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit question form */}
      {adding ? (
        <div className="p-4 border-2 border-purple-200 rounded-xl bg-purple-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">{editId ? "Edit Question" : "New Question"}</p>
            <select value={form.question_type} onChange={e => setForm(p => ({ ...p, question_type: e.target.value }))} className="input-base py-1 text-xs w-40">
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
            </select>
          </div>
          <textarea value={form.question_text} onChange={e => setForm(p => ({ ...p, question_text: e.target.value }))} className="input-base text-sm h-16 resize-none" placeholder="Question text…" autoFocus />
          {form.question_type === "multiple_choice" && (
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => setForm(p => ({ ...p, correct_index: i }))} className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors", form.correct_index === i ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-emerald-400")} />
                  <input value={opt} onChange={e => setForm(p => { const o = [...p.options]; o[i] = e.target.value; return { ...p, options: o }; })} className="input-base py-1.5 text-sm flex-1" placeholder={`Option ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
          {form.question_type === "true_false" && (
            <div className="flex gap-3">
              {["True", "False"].map((opt, i) => (
                <button key={i} onClick={() => setForm(p => ({ ...p, correct_index: i }))} className={cn("flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors", form.correct_index === i ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          <input value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} className="input-base py-1.5 text-sm" placeholder="Explanation (optional — shown after answer)" />
          <div className="flex gap-2">
            <button onClick={submitQuestion} disabled={saving} className="btn-primary !py-1.5 !px-3 !text-xs disabled:opacity-60">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {editId ? "Update" : "Add Question"}
            </button>
            <button onClick={resetForm} className="btn-outline !py-1.5 !px-3 !text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 text-purple-600 hover:bg-purple-50 transition-all text-sm font-medium">
          <Plus size={14} /> Add Question
        </button>
      )}
    </div>
  );
}

// ─── HTML Editor ─────────────────────────────────────────────────────────────

function HtmlEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [code, setCode] = useState(lesson.content ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setCode(lesson.content ?? ""); }, [lesson.id]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, { content_body: code }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">HTML Code</label>
        <button onClick={() => setPreview(p => !p)} className={cn("text-xs px-3 py-1 rounded-lg border transition-colors", preview ? "bg-orange-50 border-orange-200 text-orange-700" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
          {preview ? "Edit Code" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden" style={{ height: 500 }}>
          <iframe srcDoc={code} className="w-full h-full" title="HTML Preview" sandbox="allow-scripts" style={{ border: "none" }} />
        </div>
      ) : (
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          className="w-full font-mono text-sm border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 bg-slate-950 text-emerald-400"
          style={{ height: 500 }}
          placeholder={"<h1>Hello World</h1>\n<p>Write your HTML here…</p>"}
          spellCheck={false}
        />
      )}
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Assignment Editor ────────────────────────────────────────────────────────

function AssignmentEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [desc, setDesc] = useState(lesson.content ?? "");
  const [maxScore, setMaxScore] = useState(lesson.max_score ?? 100);
  const [dueDate, setDueDate] = useState(lesson.due_date ? lesson.due_date.split("T")[0] : "");
  const [allowText, setAllowText] = useState(lesson.allow_text_response ?? true);
  const [wordLimit, setWordLimit] = useState<number | "">(lesson.text_word_limit ?? "");
  const [saving, setSaving] = useState(false);
  const [htmlMode, setHtmlMode] = useState(() => (lesson.content ?? "").trim().startsWith("<"));
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setDesc(lesson.content ?? "");
    setMaxScore(lesson.max_score ?? 100);
    setDueDate(lesson.due_date ? lesson.due_date.split("T")[0] : "");
    setAllowText(lesson.allow_text_response ?? true);
    setWordLimit(lesson.text_word_limit ?? "");
    setHtmlMode((lesson.content ?? "").trim().startsWith("<"));
    setPreview(false);
  }, [lesson.id, lesson.content]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, {
        content_body: desc,
        max_score: maxScore,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        allow_text_response: allowText,
        text_word_limit: wordLimit !== "" ? Number(wordLimit) : null,
      }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Assignment Instructions</label>
          <div className="flex items-center gap-1">
            {htmlMode && (
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  preview ? "bg-navy-100 text-navy-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Eye size={11} /> {preview ? "Editor" : "Preview"}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setHtmlMode((v) => !v); setPreview(false); }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                htmlMode ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              <Code2 size={11} /> {htmlMode ? "HTML" : "Plain text"}
            </button>
          </div>
        </div>

        {htmlMode ? (
          preview ? (
            <div
              className="min-h-[180px] rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 leading-relaxed
                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-2
                [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3
                [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1
                [&_strong]:font-semibold [&_a]:text-navy-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: desc }}
            />
          ) : (
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full h-64 font-mono text-sm border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 bg-slate-950 text-emerald-400"
              placeholder={"<h2>Instructions</h2>\n<p>Describe what students need to do…</p>"}
              spellCheck={false}
            />
          )
        ) : (
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full h-40 input-base resize-y text-sm leading-relaxed"
            placeholder="Describe what students need to do…"
          />
        )}
        <p className="text-[11px] text-slate-400 mt-1">
          {htmlMode
            ? "HTML mode — use <h2>, <p>, <ul>, <ol>, <li>, <strong> tags for rich formatting."
            : "Switch to HTML mode for rich formatting with headings, lists, and bold text."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Max Score</label>
          <input type="number" min={1} value={maxScore} onChange={e => setMaxScore(+e.target.value)} className="input-base text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input-base text-sm" />
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Written Response Box</p>
            <p className="text-xs text-slate-500">Show a text field for students to type their answer</p>
          </div>
          <button
            onClick={async () => {
              const next = !allowText;
              setAllowText(next);
              if (!next) setWordLimit("");
              try {
                await api.put(`/prof/courses/lessons/${lesson.id}`, {
                  allow_text_response: next,
                  text_word_limit: next ? (wordLimit !== "" ? Number(wordLimit) : null) : null,
                }, token);
                onSaved();
              } catch { setAllowText(!next); }
            }}
            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0", allowText ? "bg-amber-500" : "bg-slate-300")}
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", allowText ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>

        {allowText && (
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Word Limit</p>
              <p className="text-xs text-slate-500">Leave blank for no limit</p>
            </div>
            <input
              type="number"
              min={1}
              value={wordLimit}
              onChange={e => setWordLimit(e.target.value === "" ? "" : +e.target.value)}
              placeholder="e.g. 500"
              className="input-base text-sm w-28 text-right"
            />
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">File Upload</p>
            <p className="text-xs text-slate-500">Students can always attach a file</p>
          </div>
          <span className="text-xs text-emerald-600 font-medium">Always on</span>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Lesson Settings Panel ────────────────────────────────────────────────────

function LessonSettings({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [type, setType] = useState(lesson.type);
  const [duration, setDuration] = useState(lesson.duration_minutes);
  const [published, setPublished] = useState(lesson.is_published);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTitle(lesson.title); setType(lesson.type); setDuration(lesson.duration_minutes); setPublished(lesson.is_published); }, [lesson.id]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/courses/lessons/${lesson.id}`, { title, type, duration_minutes: duration, is_published: published }, token);
      toast.success("Settings saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Lesson Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="input-base text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="input-base text-sm">
            <option value="reading">Reading</option>
            <option value="video">Video</option>
            <option value="html">HTML Page</option>
            <option value="download">Download / PDF</option>
            <option value="quiz">Quiz</option>
            <option value="assignment">Assignment</option>
            <option value="live_session">Live Session</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Duration (min)</label>
          <input type="number" min={0} value={duration} onChange={e => setDuration(+e.target.value)} className="input-base text-sm" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="rounded" />
        <span className="text-sm text-slate-700">Published (visible to students)</span>
      </label>
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Settings
      </button>
    </div>
  );
}

// ─── Student preview ──────────────────────────────────────────────────────────

function StudentCourseView({ modules, course, token }: { modules: Module[]; course: any; token: string }) {
  const allLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleName: m.title, moduleId: m.id })));
  const [selectedId, setSelectedId] = useState<string | null>(allLessons[0]?.id ?? null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    modules.forEach(m => { init[m.id] = true; });
    setExpanded(init);
  }, []);

  const lesson = allLessons.find(l => l.id === selectedId) ?? allLessons[0];
  const idx = allLessons.findIndex(l => l.id === lesson?.id);
  const prev = allLessons[idx - 1];
  const next = allLessons[idx + 1];

  useEffect(() => {
    if (!lesson || lesson.type !== "quiz") { setQuizQuestions([]); return; }
    api.get<any>(`/prof/courses/lessons/${lesson.id}/questions`, token)
      .then(res => setQuizQuestions((res as any)?.data ?? res ?? []))
      .catch(() => setQuizQuestions([]));
  }, [selectedId]);

  return (
    <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden">
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-3.5 border-b border-slate-100 bg-navy-900">
          <p className="text-sm font-bold text-white truncate">{course.title}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {modules.map(mod => (
            <div key={mod.id}>
              <button onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))} className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-slate-50 text-left">
                {expanded[mod.id] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                <span className="text-sm font-semibold text-navy-800 flex-1">{mod.title}</span>
              </button>
              {expanded[mod.id] && mod.lessons.map(l => {
                const Icon = LESSON_ICONS[l.type] ?? FileText;
                const isSelected = l.id === selectedId;
                return (
                  <button key={l.id} onClick={() => setSelectedId(l.id)} className={cn("flex items-center gap-2.5 w-full pl-8 pr-3 py-2.5 text-left transition-colors", isSelected ? "bg-navy-700 text-white" : "hover:bg-slate-50 text-slate-700")}>
                    <Icon size={16} className={isSelected ? "text-white" : "text-slate-400"} />
                    <span className={cn("text-sm flex-1 truncate", isSelected ? "text-white" : "text-slate-700")}>{l.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white overflow-y-auto">
        {lesson ? (
          <div className="max-w-3xl mx-auto px-8 py-8">
            <p className="text-xs text-slate-400 mb-1">{lesson.moduleName}</p>
            <h1 className="text-3xl font-bold text-navy-900 mb-6">{lesson.title}</h1>

            {lesson.type === "video" && lesson.video_url && (
              <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video mb-6">
                {(lesson.video_url.includes("youtube") || lesson.video_url.includes("youtu.be")) ? (
                  <iframe src={lesson.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")} className="w-full h-full" allowFullScreen title={lesson.title} />
                ) : (
                  <video src={lesson.video_url} controls className="w-full h-full" />
                )}
              </div>
            )}

            {(lesson.type === "reading" || lesson.type === "live_session" || lesson.type === "video") && lesson.content && (
              (lesson.content as string).trim().startsWith("<") ? (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: lesson.content }} />
              ) : (
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-6">{lesson.content}</p>
              )
            )}

            {lesson.type === "html" && (
              <div className="rounded-xl overflow-hidden border border-slate-200 mb-6" style={{ height: 500 }}>
                <iframe srcDoc={lesson.content ?? ""} className="w-full h-full" title={lesson.title} sandbox="allow-scripts" style={{ border: "none" }} />
              </div>
            )}

            {lesson.download_url && (
              <div className="mb-6">
                {/\.pdf$/i.test(lesson.download_url) ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 500 }}>
                    <iframe src={lesson.download_url} className="w-full h-full" title="PDF" style={{ border: "none" }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <File size={20} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{lesson.download_url.split("/").pop()}</p>
                    </div>
                    {(lesson.allow_download ?? true) && (
                      <a href={lesson.download_url} download target="_blank" rel="noreferrer" className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1 flex-shrink-0">
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {lesson.type === "quiz" && (
              quizQuestions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <HelpCircle size={16} className="text-purple-500" />
                    <span className="text-sm text-purple-700 font-medium">
                      {quizQuestions.length} question{quizQuestions.length !== 1 ? "s" : ""}
                      {lesson.passing_score ? ` · Passing score: ${lesson.passing_score}%` : ""}
                      {lesson.max_attempts ? ` · ${lesson.max_attempts} attempt(s)` : ""}
                    </span>
                  </div>
                  {quizQuestions.map((q, qi) => (
                    <div key={q.id} className="border border-slate-200 rounded-xl p-5">
                      <p className="font-semibold text-slate-800 mb-3 text-sm">{qi + 1}. {q.question_text}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={cn("flex items-center gap-3 p-3 rounded-lg border text-sm", oi === q.correct_index ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600")}>
                            <span className="w-6 h-6 rounded-full border border-current flex-shrink-0 flex items-center justify-center text-xs font-bold">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && <p className="mt-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">{q.explanation}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-purple-50 border border-purple-100 rounded-xl text-center">
                  <HelpCircle size={36} className="text-purple-400 mx-auto mb-3" />
                  <p className="font-semibold text-purple-800">Quiz</p>
                  <p className="text-sm text-purple-600 mt-1">No questions added yet.</p>
                </div>
              )
            )}

            {lesson.type === "assignment" && lesson.content && (
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="font-semibold text-amber-800 text-sm mb-2">Instructions</p>
                {(lesson.content as string).trim().startsWith("<") ? (
                  <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.content }} />
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-100">
              {prev ? (
                <button onClick={() => setSelectedId(prev.id)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-navy-700 font-medium">
                  <ArrowLeft size={16} /> {prev.title}
                </button>
              ) : <div />}
              {next && (
                <button onClick={() => setSelectedId(next.id)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-navy-700 font-medium">
                  {next.title} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>No lessons yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Curriculum tab ─────────────────────────────────────────────────────────

function CurriculumTab({ courseId, token }: { courseId: string; token: string }) {
  const [showStudentView, setShowStudentView] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; module: Module } | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");
  const [publishing, setPublishing] = useState(false);

  const { data: courseRaw } = useSWR(
    token && courseId ? [`/prof/courses/${courseId}`, token] as const : null,
    ([url, t]) => api.get<any>(url, t)
  );
  const course = (courseRaw as any)?.data ?? courseRaw ?? { id: courseId, title: "" };

  const { data: modulesRaw, mutate } = useSWR(
    token && courseId ? [`/prof/courses/${courseId}/modules`, token] as const : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const modules: Module[] = (() => {
    try {
      const d = (modulesRaw as any)?.data ?? modulesRaw;
      if (!Array.isArray(d)) return [];
      return d.map((m: any) => ({ ...m, lessons: Array.isArray(m.lessons) ? m.lessons : [] }))
               .sort((a: Module, b: Module) => (a.order_index ?? 0) - (b.order_index ?? 0));
    } catch { return []; }
  })();

  useEffect(() => {
    if (!selectedLesson) return;
    const mod = modules.find(m => m.id === selectedLesson.module.id);
    const lesson = mod?.lessons.find(l => l.id === selectedLesson.lesson.id);
    if (mod && lesson) setSelectedLesson({ lesson, module: mod });
  }, [modulesRaw]);

  async function handlePublishAll() {
    if (!confirm("Publish all modules and lessons in this course? Students will immediately have access.")) return;
    setPublishing(true);
    try {
      const res = await api.post<any>(`/prof/courses/${courseId}/publish-all`, {}, token) as any;
      const { modules: m, lessons: l } = res?.data ?? res;
      toast.success(`Published ${m} modules and ${l} lessons`);
      mutate();
    } catch (err: any) {
      toast.error(err?.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");

  const [addingLessonToModule, setAddingLessonToModule] = useState<Module | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState("reading");

  async function handleAddModule() {
    if (!moduleTitle.trim()) return;
    await toast.promise(
      api.post(`/prof/courses/${courseId}/modules`, { title: moduleTitle }, token)
        .then(() => { setAddingModule(false); setModuleTitle(""); mutate(); }),
      { loading: "Creating…", success: "Module created", error: "Failed" }
    );
  }

  async function handleDeleteModule(mod: Module) {
    if (!confirm(`Delete "${mod.title}" and all its lessons?`)) return;
    await toast.promise(
      api.delete(`/prof/courses/modules/${mod.id}`, token).then(() => { if (selectedLesson?.module.id === mod.id) setSelectedLesson(null); mutate(); }),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  function handleAddLesson(mod: Module) {
    setAddingLessonToModule(mod);
    setNewLessonTitle(""); setNewLessonType("reading");
  }

  async function submitAddLesson() {
    if (!addingLessonToModule || !newLessonTitle.trim()) return;
    const mod = addingLessonToModule;
    await toast.promise(
      api.post(`/prof/courses/modules/${mod.id}/lessons`, { title: newLessonTitle, type: newLessonType, duration_minutes: 10 }, token)
        .then(() => { setAddingLessonToModule(null); mutate(); }),
      { loading: "Creating…", success: "Lesson created", error: "Failed" }
    );
  }

  async function handleDeleteLesson(lesson: Lesson, mod: Module) {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await toast.promise(
      api.delete(`/prof/courses/lessons/${lesson.id}`, token).then(() => { if (selectedLesson?.lesson.id === lesson.id) setSelectedLesson(null); mutate(); }),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  if (!modulesRaw) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 184px)" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-navy-900 border-y border-navy-800 flex-shrink-0">
        <span className="text-xs text-navy-300">{modules.length} module{modules.length !== 1 ? "s" : ""} · {modules.reduce((s, m) => s + m.lessons.length, 0)} lesson{modules.reduce((s, m) => s + m.lessons.length, 0) !== 1 ? "s" : ""}</span>
        <div className="flex items-center gap-2">
          {!showStudentView && modules.length > 0 && (
            <button
              onClick={handlePublishAll}
              disabled={publishing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border bg-emerald-700 text-emerald-100 border-emerald-600 hover:bg-emerald-600 disabled:opacity-50"
            >
              {publishing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              Publish All
            </button>
          )}
          <button
            onClick={() => setShowStudentView(!showStudentView)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border", showStudentView ? "bg-navy-600 text-white border-navy-500" : "bg-navy-800 text-navy-200 border-navy-700 hover:bg-navy-700")}
          >
            {showStudentView ? <EyeOff size={12} /> : <Eye size={12} />}
            {showStudentView ? "Exit Preview" : "Student View"}
          </button>
        </div>
      </div>

      {showStudentView ? (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <StudentCourseView modules={modules} course={course} token={token} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 border-r border-slate-200 overflow-y-auto">
            <CourseSidebar
              modules={modules}
              selectedLessonId={selectedLesson?.lesson.id ?? null}
              onSelectLesson={(l, m) => { setSelectedLesson({ lesson: l, module: m }); setActiveTab("content"); }}
              onAddModule={() => setAddingModule(true)}
              onDeleteModule={handleDeleteModule}
              onAddLesson={handleAddLesson}
              onDeleteLesson={handleDeleteLesson}
              studentView={false}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 bg-white overflow-y-auto">
            {selectedLesson ? (
              <div className="max-w-3xl mx-auto px-8 py-8">
                <div className="flex items-center gap-2 mb-1">
                  {(() => { const Icon = LESSON_ICONS[selectedLesson.lesson.type] ?? FileText; const col = LESSON_COLORS[selectedLesson.lesson.type] ?? "text-slate-600 bg-slate-100"; return <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", col)}><Icon size={14} /></div>; })()}
                  <p className="text-xs text-slate-400">{LESSON_TYPE_LABEL[selectedLesson.lesson.type] ?? selectedLesson.lesson.type} · {selectedLesson.module.title}</p>
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mb-6">{selectedLesson.lesson.title}</h1>

                <div className="flex gap-1 border-b border-slate-200 mb-6">
                  {(["content", "settings"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={cn("px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2", activeTab === t ? "text-navy-700 border-navy-700" : "text-slate-500 border-transparent hover:text-slate-700")}>
                      {t === "content" ? "Content" : "Settings"}
                    </button>
                  ))}
                </div>

                {activeTab === "content" && (
                  <>
                    {selectedLesson.lesson.type === "reading" && <ReadingEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "video" && <VideoEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "html" && <HtmlEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "download" && <DownloadEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "quiz" && <QuizEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "assignment" && <AssignmentEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "live_session" && <ReadingEditor lesson={selectedLesson.lesson} token={token} onSaved={mutate} />}
                  </>
                )}

                {activeTab === "settings" && (
                  <LessonSettings lesson={selectedLesson.lesson} token={token} onSaved={mutate} />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 py-24">
                <BookOpen size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">Select a lesson to start editing</p>
                <p className="text-slate-400 text-sm mt-1">Choose a lesson from the sidebar or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add module modal */}
      {addingModule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <p className="font-bold text-navy-900 mb-4">New Module</p>
            <input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddModule(); if (e.key === "Escape") setAddingModule(false); }} className="input-base mb-4" placeholder="Module title" autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddingModule(false)} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
              <button onClick={handleAddModule} className="btn-primary !py-2 !px-4 !text-sm">Create Module</button>
            </div>
          </div>
        </div>
      )}

      {/* Add lesson modal */}
      {addingLessonToModule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <p className="font-bold text-navy-900 mb-1">New Lesson</p>
            <p className="text-xs text-slate-500 mb-4">in {addingLessonToModule.title}</p>
            <input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submitAddLesson(); if (e.key === "Escape") setAddingLessonToModule(null); }} className="input-base mb-3" placeholder="Lesson title" autoFocus />
            <select value={newLessonType} onChange={e => setNewLessonType(e.target.value)} className="input-base mb-4 text-sm">
              <option value="reading">Reading</option>
              <option value="video">Video</option>
              <option value="html">HTML Page</option>
              <option value="download">Download / PDF</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
              <option value="live_session">Live Session</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddingLessonToModule(null)} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
              <button onClick={submitAddLesson} className="btn-primary !py-2 !px-4 !text-sm">Create Lesson</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "content" | "curriculum" | "documents";

export default function CourseBuilderPage() {
  const { certId: courseId } = useParams<{ certId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const [tab, setTab] = useState<Tab>("overview");

  const swrKey = token ? [`/prof/courses/${courseId}`, token] as const : null;
  const { data: course, mutate } = useSWR(
    swrKey,
    ([url, t]) => fetcher(url, t)
  );

  if (!course) {
    return (
      <div className="p-8">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const modules: Module[] = course.modules ?? [];

  return (
    <div>
      <div className="px-8 pt-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-black text-navy-900">{course.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              /{course.slug} · {course.module_count ?? modules.length} modules
            </p>
          </div>
          <span className={cn("badge", course.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
            {course.status}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setTab("overview")}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === "overview" ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("content")}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
              tab === "content" ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <BookOpen size={13} /> Content
          </button>
          <button
            onClick={() => setTab("curriculum")}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
              tab === "curriculum" ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Layers size={13} /> Curriculum
          </button>
          <button
            onClick={() => setTab("documents")}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
              tab === "documents" ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <FileText size={13} /> Documents
          </button>
        </div>

        {tab === "overview" && <div className="pb-8"><OverviewTab course={course} courseId={courseId} token={token} onSaved={() => mutate()} /></div>}
        {tab === "content" && <div className="pb-8"><ContentTab course={course} courseId={courseId} token={token} onSaved={() => mutate()} /></div>}
        {tab === "documents" && <div className="pb-8"><DocumentsTab courseId={courseId} token={token} /></div>}
      </div>

      {tab === "curriculum" && <CurriculumTab courseId={courseId} token={token} />}
    </div>
  );
}

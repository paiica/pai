"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, ChevronDown, ChevronRight, Trash2, Edit3, Check,
  Video, FileText, HelpCircle, File, Link2, Download,
  GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, X,
  Layers, BookOpen, Save, Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Video, reading: FileText, quiz: HelpCircle,
  assignment: File, download: Download, live_session: Link2,
};
const LESSON_COLORS: Record<string, string> = {
  video: "text-blue-600 bg-blue-50",
  reading: "text-emerald-600 bg-emerald-50",
  quiz: "text-purple-600 bg-purple-50",
  assignment: "text-amber-600 bg-amber-50",
  download: "text-slate-600 bg-slate-100",
  live_session: "text-rose-600 bg-rose-50",
};

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STATUSES = ["draft", "active", "archived"] as const;

type Lesson = { id: string; title: string; type: string; is_published: boolean; duration_minutes: number; sort_order: number };
type Module = { id: string; title: string; description?: string; is_published: boolean; sort_order: number; lessons: Lesson[] | null };

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

// ─── Curriculum tab (modules/lessons) ──────────────────────────────────────────

function LessonRow({ lesson, token, onRefresh }: { lesson: Lesson; token: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const Icon = LESSON_ICONS[lesson.type] ?? FileText;
  const color = LESSON_COLORS[lesson.type] ?? "text-slate-600 bg-slate-100";

  async function save() {
    await toast.promise(
      api.put<any>(`/prof/courses/lessons/${lesson.id}`, { title }, token).then(() => { setEditing(false); onRefresh(); }),
      { loading: "Saving…", success: "Updated", error: "Failed" }
    );
  }

  async function togglePublish() {
    await api.put<any>(`/prof/courses/lessons/${lesson.id}`, { is_published: !lesson.is_published }, token);
    onRefresh();
  }

  async function deleteLesson() {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await toast.promise(
      api.delete<any>(`/prof/courses/lessons/${lesson.id}`, token).then(onRefresh),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-slate-100 hover:border-slate-200 group">
      <GripVertical size={14} className="text-slate-300 cursor-grab flex-shrink-0" />
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon size={13} />
      </div>
      {editing ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-base py-1 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            autoFocus
          />
          <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check size={15} /></button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
        </div>
      ) : (
        <span className="flex-1 text-sm text-slate-700 truncate">{lesson.title}</span>
      )}
      <span className="text-xs text-slate-400">{lesson.duration_minutes}m</span>
      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", lesson.type === "quiz" ? "bg-purple-50 text-purple-600" : "bg-slate-50 text-slate-500")}>{lesson.type}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={togglePublish} className={cn("p-1 rounded hover:bg-slate-100", lesson.is_published ? "text-emerald-600" : "text-slate-400")} title={lesson.is_published ? "Unpublish" : "Publish"}>
          {lesson.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-navy-700">
          <Edit3 size={14} />
        </button>
        <button onClick={deleteLesson} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function ModuleSection({ module, token, onRefresh, index, total }: {
  module: Module; token: string; onRefresh: () => void; index: number; total: number;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(module.title);
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState("video");

  async function saveTitle() {
    await api.put<any>(`/prof/modules/${module.id}`, { title }, token);
    setEditing(false);
    onRefresh();
  }

  async function deleteModule() {
    if (!confirm(`Delete module "${module.title}" and all its lessons?`)) return;
    await toast.promise(
      api.delete<any>(`/prof/modules/${module.id}`, token).then(onRefresh),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  async function addLesson() {
    if (!lessonTitle.trim()) return;
    await toast.promise(
      api.post<any>(`/prof/modules/${module.id}/lessons`, { title: lessonTitle, type: lessonType, duration_minutes: 10 }, token)
        .then(() => { setAddingLesson(false); setLessonTitle(""); onRefresh(); }),
      { loading: "Adding lesson…", success: "Lesson added", error: "Failed" }
    );
  }

  return (
    <div className="card border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-navy-50 border-b border-slate-100">
        <GripVertical size={15} className="text-slate-300 cursor-grab flex-shrink-0" />
        <button onClick={() => setOpen(!open)} className="text-navy-700">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base py-1 text-sm flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
            />
            <button onClick={saveTitle} className="text-emerald-600"><Check size={15} /></button>
            <button onClick={() => setEditing(false)} className="text-slate-400"><X size={15} /></button>
          </div>
        ) : (
          <span className="flex-1 font-semibold text-navy-900 text-sm">{module.title}</span>
        )}
        <span className="text-xs text-slate-400">{module.lessons?.length ?? 0} lessons</span>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button onClick={() => toast("Drag-and-drop reorder coming soon.")} className="p-1 rounded hover:bg-slate-200 text-slate-400">
              <ArrowUp size={13} />
            </button>
          )}
          {index < total - 1 && (
            <button onClick={() => toast("Drag-and-drop reorder coming soon.")} className="p-1 rounded hover:bg-slate-200 text-slate-400">
              <ArrowDown size={13} />
            </button>
          )}
          <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-navy-700">
            <Edit3 size={13} />
          </button>
          <button onClick={deleteModule} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {(module.lessons?.length ?? 0) === 0 && !addingLesson && (
            <p className="text-xs text-slate-400 text-center py-3">No lessons yet.</p>
          )}
          {(module.lessons ?? []).map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              token={token}
              onRefresh={onRefresh}
            />
          ))}

          {addingLesson ? (
            <div className="flex items-center gap-2 p-2 border border-navy-200 rounded-lg bg-navy-50">
              <input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Lesson title"
                className="input-base py-1.5 text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") addLesson(); if (e.key === "Escape") setAddingLesson(false); }}
                autoFocus
              />
              <select
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value)}
                className="input-base py-1.5 text-sm w-36"
              >
                <option value="video">Video</option>
                <option value="reading">Reading</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="download">Download</option>
              </select>
              <button onClick={addLesson} className="btn-primary py-1.5 text-xs">Add</button>
              <button onClick={() => setAddingLesson(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingLesson(true)}
              className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-navy-700 py-2 px-3 rounded-lg hover:bg-navy-50 transition-colors border border-dashed border-slate-200 hover:border-navy-200"
            >
              <Plus size={13} /> Add lesson
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CurriculumTab({ course, courseId, token, onRefresh }: { course: any; courseId: string; token: string; onRefresh: () => void }) {
  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const modules: Module[] = course.modules ?? [];

  async function addModule() {
    if (!moduleTitle.trim()) return;
    await toast.promise(
      api.post<any>(`/prof/courses/${courseId}/modules`, { title: moduleTitle }, token)
        .then(() => { setAddingModule(false); setModuleTitle(""); onRefresh(); }),
      { loading: "Creating module…", success: "Module created", error: "Failed" }
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {modules.map((mod, i) => (
        <ModuleSection
          key={mod.id}
          module={mod}
          token={token}
          onRefresh={onRefresh}
          index={i}
          total={modules.length}
        />
      ))}

      {addingModule ? (
        <div className="card p-4 border-2 border-navy-300 bg-navy-50">
          <div className="flex items-center gap-2">
            <input
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="Module title (e.g. Introduction to AI)"
              className="input-base flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") addModule(); if (e.key === "Escape") setAddingModule(false); }}
              autoFocus
            />
            <button onClick={addModule} className="btn-primary">Create</button>
            <button onClick={() => setAddingModule(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingModule(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-navy-300 text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all text-sm font-medium"
        >
          <Plus size={16} /> Add Module
        </button>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "content" | "curriculum";

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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">{course.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            /{course.slug} · {modules.length} modules · {modules.reduce((s: number, m: Module) => s + (m.lessons?.length ?? 0), 0)} lessons
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
      </div>

      {tab === "overview" && <OverviewTab course={course} courseId={courseId} token={token} onSaved={() => mutate()} />}
      {tab === "content" && <ContentTab course={course} courseId={courseId} token={token} onSaved={() => mutate()} />}
      {tab === "curriculum" && <CurriculumTab course={course} courseId={courseId} token={token} onRefresh={() => mutate()} />}
    </div>
  );
}

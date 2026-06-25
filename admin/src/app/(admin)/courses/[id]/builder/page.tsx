"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Edit3, Check, Video, FileText, HelpCircle,
  File, Link2, Download, Eye, EyeOff, X, ChevronLeft,
  ChevronDown, ChevronRight, Save, Upload, GripVertical,
  BookOpen, Clock, Search, AlertCircle, Loader2, Settings,
  ArrowLeft, ArrowRight, CheckCircle, FileQuestion, Paperclip,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function CourseSidebar({
  modules, selectedLessonId, onSelectLesson, onAddModule, onDeleteModule,
  onAddLesson, onDeleteLesson, courseId, token, onRefresh, studentView,
}: {
  modules: Module[]; selectedLessonId: string | null; onSelectLesson: (l: Lesson, m: Module) => void;
  onAddModule: () => void; onDeleteModule: (m: Module) => void;
  onAddLesson: (m: Module) => void; onDeleteLesson: (l: Lesson, m: Module) => void;
  courseId: string; token: string; onRefresh: () => void; studentView: boolean;
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
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Search */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search titles, descriptions"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-400"
          />
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map(mod => (
          <div key={mod.id}>
            {/* Module row */}
            <div className="flex items-center gap-1 px-2 py-1 group hover:bg-slate-50">
              <button onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))} className="p-0.5 text-slate-500">
                {expanded[mod.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              <span className="flex-1 text-xs font-semibold text-navy-800 truncate cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))}>
                {mod.title}
              </span>
              {!studentView && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button onClick={() => onAddLesson(mod)} className="p-1 rounded hover:bg-navy-100 text-slate-400 hover:text-navy-700" title="Add lesson"><Plus size={11} /></button>
                  <button onClick={() => onDeleteModule(mod)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete module"><Trash2 size={11} /></button>
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
                    "flex items-center gap-2 pl-6 pr-2 py-1.5 cursor-pointer group transition-colors",
                    isSelected ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <Icon size={13} className={isSelected ? "text-white" : "text-slate-400"} />
                  <span className={cn("flex-1 text-xs truncate", isSelected ? "text-white font-medium" : "text-slate-700")}>
                    {lesson.title}
                  </span>
                  {!lesson.is_published && !isSelected && (
                    <span className="text-[10px] text-slate-400">draft</span>
                  )}
                  {!studentView && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteLesson(lesson, mod); }}
                      className={cn("opacity-0 group-hover:opacity-100 p-0.5 rounded", isSelected ? "hover:bg-blue-700 text-blue-200" : "hover:bg-red-50 text-slate-400 hover:text-red-600")}
                    ><Trash2 size={10} /></button>
                  )}
                </div>
              );
            })}

            {/* Add lesson button */}
            {!studentView && expanded[mod.id] && (
              <button
                onClick={() => onAddLesson(mod)}
                className="flex items-center gap-1.5 pl-7 pr-3 py-1.5 w-full text-xs text-slate-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
              >
                <Plus size={11} /> Add lesson
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add module */}
      {!studentView && (
        <div className="p-3 border-t border-slate-100">
          <button onClick={onAddModule} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-200 hover:border-navy-300 text-xs text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all">
            <Plus size={12} /> New Module
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reading Editor ───────────────────────────────────────────────────────────

function ReadingEditor({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
  const [content, setContent] = useState(lesson.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setContent(lesson.content ?? ""); }, [lesson.id, lesson.content]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { content_body: content }, token);
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

function VideoEditor({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
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
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { video_url: url, content_body: content }, token);
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
              className={cn("px-3 py-1 transition-colors", contentMode === "text" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              Text
            </button>
            <button
              onClick={() => setContentMode("html")}
              className={cn("px-3 py-1 transition-colors border-l border-slate-200", contentMode === "html" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              HTML
            </button>
          </div>
        </div>
        {contentMode === "html" ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-48 font-mono text-sm border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-950 text-emerald-400"
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

function DownloadEditor({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
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
    // Reset input so same file can be re-selected
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
      // Auto-save the URL to the lesson
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { download_url: fileUrl }, token);
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
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { download_url: url, allow_download: allowDownload }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Upload PDF / File</label>
        <label className={cn("flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors", uploading ? "border-blue-200 bg-blue-50" : "border-slate-200 hover:border-navy-300 hover:bg-navy-50")}>
          {uploading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Upload size={20} className="text-slate-400" />}
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
            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{url.split("/").pop()}</a>
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
              await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { allow_download: next }, token);
              toast.success(next ? "Download enabled" : "Download disabled");
              onSaved();
            } catch { setAllowDownload(!next); toast.error("Failed to update"); }
          }}
          className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0", allowDownload ? "bg-blue-600" : "bg-slate-300")}
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

function QuizEditor({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
  const questionsKey = token ? [`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/questions`, token] : null;
  const { data: qRaw, mutate: mutateQ } = useSWR(questionsKey, ([url, t]) => api.get<any>(url, t), { dedupingInterval: 0 });
  const questions: QuizQuestion[] = (() => { try { const d = (qRaw as any)?.data ?? qRaw; return Array.isArray(d) ? d : []; } catch { return []; } })();

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "", question_type: "multiple_choice" });
  const [saving, setSaving] = useState(false);

  // quiz settings
  const [passingScore, setPassingScore] = useState(lesson.passing_score ?? 70);
  const [maxAttempts, setMaxAttempts] = useState(lesson.max_attempts ?? 3);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => { setPassingScore(lesson.passing_score ?? 70); setMaxAttempts(lesson.max_attempts ?? 3); }, [lesson.id]);

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { passing_score: passingScore, max_attempts: maxAttempts }, token);
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
      if (editId) { await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/questions/${editId}`, payload, token); }
      else { await api.post(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/questions`, payload, token); }
      toast.success(editId ? "Question updated" : "Question added");
      mutateQ(); resetForm();
    } catch { toast.error("Failed to save question"); }
    finally { setSaving(false); }
  }

  async function deleteQuestion(qId: string) {
    if (!confirm("Delete this question?")) return;
    await toast.promise(
      api.delete(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/questions/${qId}`, token).then(() => mutateQ()),
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

function HtmlEditor({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
  const [code, setCode] = useState(lesson.content ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setCode(lesson.content ?? ""); }, [lesson.id]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { content_body: code }, token);
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

function AssignmentEditor({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
  const [desc, setDesc] = useState(lesson.content ?? "");
  const [maxScore, setMaxScore] = useState(lesson.max_score ?? 100);
  const [dueDate, setDueDate] = useState(lesson.due_date ? lesson.due_date.split("T")[0] : "");
  const [allowText, setAllowText] = useState(lesson.allow_text_response ?? true);
  const [wordLimit, setWordLimit] = useState<number | "">(lesson.text_word_limit ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDesc(lesson.content ?? "");
    setMaxScore(lesson.max_score ?? 100);
    setDueDate(lesson.due_date ? lesson.due_date.split("T")[0] : "");
    setAllowText(lesson.allow_text_response ?? true);
    setWordLimit(lesson.text_word_limit ?? "");
  }, [lesson.id, lesson.content]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
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
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Assignment Instructions</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full h-40 input-base resize-none text-sm leading-relaxed" placeholder="Describe what students need to do…" />
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

      {/* Submission options */}
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        {/* Written response toggle */}
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
                await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
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

        {/* Word limit — only shown when text is enabled */}
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

        {/* File upload is always available — informational row */}
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

function LessonSettings({ lesson, courseId, moduleId, token, onSaved }: { lesson: Lesson; courseId: string; moduleId: string; token: string; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [type, setType] = useState(lesson.type);
  const [duration, setDuration] = useState(lesson.duration_minutes);
  const [published, setPublished] = useState(lesson.is_published);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTitle(lesson.title); setType(lesson.type); setDuration(lesson.duration_minutes); setPublished(lesson.is_published); }, [lesson.id]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { title, type, duration_minutes: duration, is_published: published }, token);
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

// ─── Student View ─────────────────────────────────────────────────────────────

function StudentCourseView({ modules, course, onExit }: { modules: Module[]; course: any; onExit: () => void }) {
  const token = useAuthStore(s => s.accessToken) ?? "";
  const allLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleName: m.title, moduleId: m.id })));
  const [selectedId, setSelectedId] = useState<string | null>(allLessons[0]?.id ?? null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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
    if (!lesson || lesson.type !== "quiz") {
      setQuizQuestions([]); setQuizAnswers({}); setQuizSubmitted(false); return;
    }
    api.get<any>(`/admin/courses/${course.id}/modules/${lesson.moduleId}/lessons/${lesson.id}/questions`, token)
      .then(res => setQuizQuestions(res?.data ?? res ?? []))
      .catch(() => setQuizQuestions([]));
  }, [selectedId]);

  return (
    <div className="flex h-[calc(100vh-80px)] border border-slate-200 rounded-xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 bg-navy-900">
          <p className="text-xs font-bold text-white truncate">{course.title}</p>
        </div>
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search titles, descriptions" className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none" readOnly />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {modules.map(mod => (
            <div key={mod.id}>
              <button onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-50 text-left">
                {expanded[mod.id] ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
                <span className="text-xs font-semibold text-navy-800 flex-1">{mod.title}</span>
              </button>
              {expanded[mod.id] && mod.lessons.map(l => {
                const Icon = LESSON_ICONS[l.type] ?? FileText;
                const isSelected = l.id === selectedId;
                return (
                  <button key={l.id} onClick={() => setSelectedId(l.id)} className={cn("flex items-center gap-2 w-full pl-6 pr-3 py-2 text-left transition-colors", isSelected ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-700")}>
                    <GripVertical size={11} className={isSelected ? "text-blue-300" : "text-slate-300"} />
                    <Icon size={13} className={isSelected ? "text-white" : "text-slate-400"} />
                    <span className={cn("text-xs flex-1 truncate", isSelected ? "text-white" : "text-slate-700")}>{l.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Content pane — PDF/HTML get full-height layout, everything else scrolls */}
      <div className={cn("flex-1 bg-white", (lesson?.download_url && /\.pdf$/i.test(lesson.download_url)) || lesson?.type === "html" ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
        {lesson ? (
          (lesson.download_url && /\.pdf$/i.test(lesson.download_url)) || lesson.type === "html" ? (
            /* ── Full-height PDF / HTML layout ── */
            <>
              <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-xs text-slate-400">{lesson.moduleName}</p>
                  <h1 className="text-lg font-bold text-navy-900 leading-tight">{lesson.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                  {lesson.download_url && (lesson.allow_download ?? true) && (
                    <a href={lesson.download_url} download target="_blank" rel="noreferrer" className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1">
                      <Download size={12} /> Download
                    </a>
                  )}
                  {prev && <button onClick={() => setSelectedId(prev.id)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-navy-700"><ArrowLeft size={13} />{prev.title}</button>}
                  {next && <button onClick={() => setSelectedId(next.id)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-navy-700">{next.title}<ArrowRight size={13} /></button>}
                </div>
              </div>
              {lesson.type === "html" ? (
                <iframe
                  srcDoc={lesson.content ?? ""}
                  className="flex-1 w-full"
                  title={lesson.title}
                  style={{ border: "none" }}
                  sandbox="allow-scripts"
                />
              ) : (
                <iframe
                  src={lesson.download_url}
                  className="flex-1 w-full"
                  title={lesson.title}
                  style={{ border: "none" }}
                />
              )}
            </>
          ) : (
          <div className="max-w-3xl mx-auto px-8 py-8">
            <p className="text-xs text-slate-400 mb-1">{lesson.moduleName}</p>
            <h1 className="text-3xl font-bold text-navy-900 mb-6">{lesson.title}</h1>

            {/* Content by type */}
            {lesson.type === "video" && lesson.video_url && (
              <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video mb-6">
                {(lesson.video_url.includes("youtube") || lesson.video_url.includes("youtu.be")) ? (
                  <iframe src={lesson.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")} className="w-full h-full" allowFullScreen title={lesson.title} />
                ) : (
                  <video src={lesson.video_url} controls className="w-full h-full" />
                )}
              </div>
            )}
            {lesson.type === "video" && lesson.content && (
              (lesson.content as string).trim().startsWith("<") ? (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: lesson.content }} />
              ) : (
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-6">{lesson.content}</p>
              )
            )}

            {(lesson.type === "reading" || lesson.type === "live_session") && lesson.content && (
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.content }} />
            )}

            {lesson.download_url && !(/\.pdf$/i.test(lesson.download_url)) && (
              <div className="mb-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <File size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{lesson.download_url.split("/").pop()}</p>
                    <p className="text-xs text-slate-500">File</p>
                  </div>
                  {(lesson.allow_download ?? true) && (
                    <a href={lesson.download_url} download target="_blank" rel="noreferrer" className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1 flex-shrink-0">
                      <Download size={13} /> Download
                    </a>
                  )}
                </div>
              </div>
            )}

            {lesson.type === "quiz" && (
              quizQuestions.length > 0 ? (
                <div className="space-y-6">
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
                      <p className="font-semibold text-slate-800 mb-4 text-sm">{qi + 1}. {q.question_text}</p>
                      {q.question_type !== "short_answer" ? (
                        <div className="space-y-2">
                          {q.options.map((opt: string, oi: number) => {
                            const selected = quizAnswers[q.id] === oi;
                            const correct = quizSubmitted && oi === q.correct_index;
                            const wrong = quizSubmitted && selected && oi !== q.correct_index;
                            return (
                              <button key={oi} onClick={() => !quizSubmitted && setQuizAnswers(p => ({ ...p, [q.id]: oi }))}
                                className={cn("flex items-center gap-3 w-full p-3 rounded-lg border text-left text-sm transition-colors",
                                  correct ? "border-emerald-400 bg-emerald-50 text-emerald-700" :
                                  wrong ? "border-red-400 bg-red-50 text-red-700" :
                                  selected ? "border-blue-400 bg-blue-50 text-blue-700" :
                                  "border-slate-200 hover:border-slate-300 text-slate-700")}>
                                <span className="w-6 h-6 rounded-full border border-current flex-shrink-0 flex items-center justify-center text-xs font-bold">
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <textarea className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={3} placeholder="Write your answer here…" disabled={quizSubmitted} />
                      )}
                      {quizSubmitted && q.explanation && (
                        <p className="mt-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">{q.explanation}</p>
                      )}
                    </div>
                  ))}
                  {!quizSubmitted ? (
                    <button onClick={() => setQuizSubmitted(true)} className="btn-primary">Submit Quiz</button>
                  ) : (
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-emerald-700">Quiz Complete!</p>
                      <p className="text-sm text-emerald-600 mt-1">
                        Score: {Object.entries(quizAnswers).filter(([id, ans]) => {
                          const q = quizQuestions.find(q => q.id === id);
                          return q && q.correct_index === ans;
                        }).length} / {quizQuestions.filter(q => q.question_type !== "short_answer").length} correct
                      </p>
                      <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }} className="mt-3 text-xs text-emerald-600 underline">Retake</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-purple-50 border border-purple-100 rounded-xl text-center">
                  <HelpCircle size={36} className="text-purple-400 mx-auto mb-3" />
                  <p className="font-semibold text-purple-800">Quiz</p>
                  <p className="text-sm text-purple-600 mt-1">No questions added yet.</p>
                </div>
              )
            )}

            {lesson.type === "assignment" && (
              <div className="space-y-4">
                {lesson.content && (
                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="font-semibold text-amber-800 text-sm mb-2">Instructions</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>
                  </div>
                )}
                {(lesson.max_score || lesson.due_date) && (
                  <p className="text-xs text-amber-600 font-medium">
                    {lesson.max_score ? `Max score: ${lesson.max_score} pts` : ""}
                    {lesson.max_score && lesson.due_date ? " · " : ""}
                    {lesson.due_date ? `Due: ${new Date(lesson.due_date).toLocaleDateString()}` : ""}
                  </p>
                )}
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Written Response <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea className="w-full h-32 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none" placeholder="Write your response here…" readOnly />
                </div>
                <label className="flex flex-col items-center justify-center gap-2 h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-not-allowed opacity-60">
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-xs text-slate-500">Attach file (PDF, Word, etc.)</span>
                </label>
                <button className="btn-primary w-full justify-center opacity-60 cursor-not-allowed" disabled>
                  <Upload size={14} /> Submit Assignment
                </button>
                <p className="text-xs text-center text-slate-400">Preview only — students submit via the learning portal</p>
              </div>
            )}

            {!lesson.content && !lesson.video_url && !lesson.download_url && lesson.type !== "quiz" && lesson.type !== "assignment" && (
              <div className="text-center py-12 text-slate-400">
                <BookOpen size={32} className="mx-auto mb-3" />
                <p className="text-sm">No content added yet.</p>
              </div>
            )}

            {/* Prev / Next */}
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
          )
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Select a lesson to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Assistant Panel ───────────────────────────────────────────────────────

type AiTab = "lesson" | "module" | "course";

type AiProgress = { label: string; done: number; total: number };

function ProgressBar({ p }: { p: AiProgress }) {
  return (
    <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
      <div className="flex items-center justify-between text-xs text-violet-700 mb-1.5">
        <span className="font-medium truncate">{p.label}</span>
        <span className="flex-shrink-0 ml-2">{p.done} / {p.total}</span>
      </div>
      <div className="h-1.5 bg-violet-200 rounded-full overflow-hidden">
        <div className="h-full bg-violet-600 rounded-full transition-all duration-300"
          style={{ width: `${p.total > 0 ? (p.done / p.total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function AiAssistantPanel({
  courseId, course, modules, token, selectedLesson, onRefresh, onClose,
}: {
  courseId: string;
  course: any;
  modules: Module[];
  token: string;
  selectedLesson: { lesson: Lesson; module: Module } | null;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<AiTab>("lesson");

  // ── Lesson tab ────────────────────────────────────────────────────────────
  const [lessonTopic, setLessonTopic] = useState("");
  const [numQ, setNumQ] = useState(5);
  const [lessonBusy, setLessonBusy] = useState(false);

  // ── Module tab ────────────────────────────────────────────────────────────
  const [modTarget,       setModTarget]       = useState<string>("");        // module id or "new"
  const [modNewTitle,     setModNewTitle]      = useState("");
  const [modTopic,        setModTopic]         = useState("");
  const [modNumLessons,   setModNumLessons]    = useState(5);
  const [modGenContent,   setModGenContent]    = useState(true);
  const [modBusy,         setModBusy]          = useState(false);
  const [modProgress,     setModProgress]      = useState<AiProgress | null>(null);

  // ── Course tab ────────────────────────────────────────────────────────────
  const [courseTopic,     setCourseTopic]      = useState("");
  const [courseNumMods,   setCourseNumMods]    = useState(4);
  const [courseLPM,       setCourseLPM]        = useState(4);
  const [courseGenContent,setCourseGenContent] = useState(true);
  const [courseBusy,      setCourseBusy]       = useState(false);
  const [courseProgress,  setCourseProgress]   = useState<AiProgress | null>(null);

  useEffect(() => {
    if (selectedLesson) setTab("lesson");
  }, [selectedLesson?.lesson.id]);

  useEffect(() => {
    if (modules.length > 0 && !modTarget) setModTarget(modules[0].id);
  }, [modules.length]);

  // ── Shared helpers ─────────────────────────────────────────────────────────

  async function generateLessonContent(lessonId: string, moduleId: string, lesson: Lesson, topicStr: string) {
    const modTitle = modules.find(m => m.id === moduleId)?.title ?? "";
    if (lesson.type === "quiz") {
      const res = await api.post<any>("/ai/generate-course-content", {
        lesson_title: lesson.title, lesson_type: "quiz",
        topic: topicStr || lesson.title, course_title: course.title,
        module_title: modTitle, num_questions: numQ,
      }, token) as any;
      const questions: any[] = res?.data?.questions ?? res?.questions ?? [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await api.post(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/questions`, {
          question_text: q.question_text, question_type: "multiple_choice",
          options: q.options, correct_index: q.correct_index,
          explanation: q.explanation ?? "", points: 1, sort_order: i,
        }, token);
      }
    } else {
      const res = await api.post<any>("/ai/generate-course-content", {
        lesson_title: lesson.title, lesson_type: lesson.type,
        topic: topicStr || lesson.title, course_title: course.title,
        module_title: modTitle,
      }, token) as any;
      await api.patch(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
        content_body: res?.data?.content ?? res?.content ?? "",
      }, token);
    }
  }

  // ── Lesson tab handler ─────────────────────────────────────────────────────

  async function handleGenerateLesson() {
    if (!selectedLesson) return;
    setLessonBusy(true);
    try {
      await generateLessonContent(
        selectedLesson.lesson.id, selectedLesson.module.id, selectedLesson.lesson, lessonTopic
      );
      toast.success("Content generated and saved!");
      setLessonTopic("");
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Generation failed");
    } finally {
      setLessonBusy(false);
    }
  }

  // ── Module tab handler ─────────────────────────────────────────────────────

  async function handleGenerateModule() {
    const isNew = modTarget === "new";
    if (isNew && !modNewTitle.trim()) { toast.error("Enter a module title"); return; }
    if (!modTopic.trim()) { toast.error("Describe what this module should cover"); return; }
    setModBusy(true);
    setModProgress(null);
    try {
      // 1. Determine module title
      const moduleTitle = isNew ? modNewTitle.trim() : (modules.find(m => m.id === modTarget)?.title ?? "");

      // 2. AI generates lesson structure
      setModProgress({ label: "Designing lesson structure…", done: 0, total: 1 });
      const structRes = await api.post<any>("/ai/generate-module-structure", {
        course_title: course.title,
        module_title: moduleTitle,
        topic: modTopic,
        num_lessons: modNumLessons,
      }, token) as any;
      const aiLessons: Array<{ title: string; type: string; topic: string }> = structRes?.data?.lessons ?? structRes?.lessons ?? [];
      if (!aiLessons.length) throw new Error("AI returned no lessons");

      // 3. Create module if new
      let targetModuleId = modTarget;
      if (isNew) {
        const modRes = await api.post<any>(`/admin/courses/${courseId}/modules`, {
          title: moduleTitle, order_index: modules.length,
        }, token) as any;
        targetModuleId = (modRes?.data ?? modRes)?.id ?? (modRes?.id);
        if (!targetModuleId) throw new Error("Failed to create module");
        setModNewTitle("");
      }

      // 4. Create lessons
      setModProgress({ label: "Creating lessons…", done: 0, total: aiLessons.length });
      const createdLessons: Array<{ id: string; type: string; title: string; topic: string }> = [];
      for (let i = 0; i < aiLessons.length; i++) {
        const l = aiLessons[i];
        const r = await api.post<any>(`/admin/courses/${courseId}/modules/${targetModuleId}/lessons`, {
          title: l.title, type: l.type || "reading", order_index: i,
        }, token) as any;
        const created = r?.data ?? r;
        createdLessons.push({ id: created.id, type: l.type || "reading", title: l.title, topic: l.topic });
        setModProgress({ label: "Creating lessons…", done: i + 1, total: aiLessons.length });
      }

      await onRefresh();

      // 5. Optionally generate content
      if (modGenContent) {
        let failed = 0;
        for (let i = 0; i < createdLessons.length; i++) {
          const l = createdLessons[i];
          setModProgress({ label: `Generating content: ${l.title}`, done: i, total: createdLessons.length });
          try {
            const fakeLesson: Lesson = {
              id: l.id, module_id: targetModuleId, title: l.title, type: l.type,
              is_published: false, duration_minutes: 0, order_index: i,
            };
            await generateLessonContent(l.id, targetModuleId, fakeLesson, l.topic);
          } catch {
            failed++;
            toast.error(`Content failed: ${l.title}`);
          }
          setModProgress({ label: `Generating content…`, done: i + 1, total: createdLessons.length });
        }
        await onRefresh();
        toast.success(`Module built! ${createdLessons.length - failed} lessons generated${failed ? `, ${failed} failed` : ""}`);
      } else {
        toast.success(`Module created with ${createdLessons.length} lessons!`);
      }

      setModTopic("");
      setModProgress(null);
    } catch (err: any) {
      toast.error(err?.message || "Module generation failed");
      setModProgress(null);
    } finally {
      setModBusy(false);
    }
  }

  // ── Course tab handler ─────────────────────────────────────────────────────

  async function handleGenerateCourse() {
    if (!courseTopic.trim()) { toast.error("Describe what this course should teach"); return; }
    setCourseBusy(true);
    setCourseProgress(null);
    try {
      // 1. Generate full course structure
      setCourseProgress({ label: "Designing course structure…", done: 0, total: 1 });
      const structRes = await api.post<any>("/ai/generate-course-structure", {
        course_title: course.title || "Course",
        topic: courseTopic,
        num_modules: courseNumMods,
        lessons_per_module: courseLPM,
      }, token) as any;
      const aiModules: Array<{ title: string; description: string; lessons: Array<{ title: string; type: string; topic: string }> }> =
        structRes?.data?.modules ?? structRes?.modules ?? [];
      if (!aiModules.length) throw new Error("AI returned no modules");

      const totalLessons = aiModules.reduce((s, m) => s + m.lessons.length, 0);
      let lessonsCreated = 0;

      // 2. Create each module + its lessons
      const createdData: Array<{ moduleId: string; lessons: Array<{ id: string; type: string; title: string; topic: string }> }> = [];
      for (let mi = 0; mi < aiModules.length; mi++) {
        const am = aiModules[mi];
        setCourseProgress({ label: `Creating module ${mi + 1}/${aiModules.length}: ${am.title}`, done: lessonsCreated, total: totalLessons });

        const modRes = await api.post<any>(`/admin/courses/${courseId}/modules`, {
          title: am.title, order_index: modules.length + mi,
          description: am.description,
        }, token) as any;
        const moduleId = (modRes?.data ?? modRes)?.id ?? modRes?.id;
        if (!moduleId) throw new Error(`Failed to create module: ${am.title}`);

        const createdLessons: Array<{ id: string; type: string; title: string; topic: string }> = [];
        for (let li = 0; li < am.lessons.length; li++) {
          const al = am.lessons[li];
          const lr = await api.post<any>(`/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
            title: al.title, type: al.type || "reading", order_index: li,
          }, token) as any;
          const created = lr?.data ?? lr;
          createdLessons.push({ id: created.id, type: al.type || "reading", title: al.title, topic: al.topic });
          lessonsCreated++;
          setCourseProgress({ label: `Creating lessons for "${am.title}"…`, done: lessonsCreated, total: totalLessons });
        }
        createdData.push({ moduleId, lessons: createdLessons });
      }

      await onRefresh();

      // 3. Optionally generate content for all lessons
      if (courseGenContent) {
        let done = 0;
        let failed = 0;
        for (const { moduleId, lessons } of createdData) {
          for (const l of lessons) {
            setCourseProgress({ label: `Generating: ${l.title}`, done, total: totalLessons });
            try {
              const fakeLesson: Lesson = {
                id: l.id, module_id: moduleId, title: l.title, type: l.type,
                is_published: false, duration_minutes: 0, order_index: 0,
              };
              await generateLessonContent(l.id, moduleId, fakeLesson, l.topic);
            } catch {
              failed++;
              toast.error(`Content failed: ${l.title}`);
            }
            done++;
            setCourseProgress({ label: `Generating content…`, done, total: totalLessons });
          }
        }
        await onRefresh();
        toast.success(`Course built! ${aiModules.length} modules, ${totalLessons - failed} lessons${failed ? ` (${failed} failed)` : ""}`);
      } else {
        toast.success(`Course structure created! ${aiModules.length} modules, ${totalLessons} lessons`);
      }

      setCourseTopic("");
      setCourseProgress(null);
    } catch (err: any) {
      toast.error(err?.message || "Course generation failed");
      setCourseProgress(null);
    } finally {
      setCourseBusy(false);
    }
  }

  const anyBusy = lessonBusy || modBusy || courseBusy;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={anyBusy ? undefined : onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-white" />
            <span className="text-white font-bold text-sm">AI Course Assistant</span>
          </div>
          <button onClick={onClose} disabled={anyBusy} className="text-white/70 hover:text-white transition-colors disabled:opacity-40"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          {([
            { id: "lesson", label: "Lesson" },
            { id: "module", label: "Module" },
            { id: "course", label: "Full Course" },
          ] as { id: AiTab; label: string }[]).map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn("flex-1 py-2.5 text-xs font-semibold transition-colors",
                tab === id
                  ? "text-violet-700 border-b-2 border-violet-600 bg-violet-50/40"
                  : "text-slate-500 hover:text-slate-700"
              )}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Lesson Tab ── */}
          {tab === "lesson" && (
            <div className="p-4 space-y-4">
              {selectedLesson ? (
                <>
                  <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                    <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">
                      {LESSON_TYPE_LABEL[selectedLesson.lesson.type] ?? selectedLesson.lesson.type}
                    </p>
                    <p className="text-sm font-semibold text-violet-900 mt-0.5">{selectedLesson.lesson.title}</p>
                    <p className="text-xs text-violet-500 mt-0.5">{selectedLesson.module.title}</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Topic / Focus</label>
                    <textarea
                      value={lessonTopic}
                      onChange={e => setLessonTopic(e.target.value)}
                      placeholder={`What should this ${selectedLesson.lesson.type} lesson cover? Be specific for better results.`}
                      className="w-full h-28 input-base text-sm resize-none"
                    />
                  </div>

                  {selectedLesson.lesson.type === "quiz" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Questions to Generate</label>
                      <input type="number" min={1} max={20} value={numQ}
                        onChange={e => setNumQ(Math.max(1, Math.min(20, +e.target.value)))}
                        className="input-base w-24 text-sm" />
                    </div>
                  )}

                  <button onClick={handleGenerateLesson} disabled={lessonBusy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-60 shadow-sm">
                    {lessonBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {lessonBusy ? "Generating…"
                      : selectedLesson.lesson.type === "quiz" ? `Generate ${numQ} Questions`
                      : "Generate Content"}
                  </button>
                  <p className="text-xs text-slate-400 text-center">
                    {selectedLesson.lesson.type === "quiz"
                      ? "Questions will be added to this quiz."
                      : "Content is saved and loaded in the editor."}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-violet-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No lesson selected</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Select a lesson from the sidebar to generate its content.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Module Tab ── */}
          {tab === "module" && (
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe a module and AI will create all lessons and optionally fill in the content.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Target Module</label>
                <select value={modTarget} onChange={e => setModTarget(e.target.value)} className="input-base text-sm">
                  {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  <option value="new">+ Create new module</option>
                </select>
              </div>

              {modTarget === "new" && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">New Module Title</label>
                  <input value={modNewTitle} onChange={e => setModNewTitle(e.target.value)}
                    placeholder="e.g. Module 3: Advanced AI Applications"
                    className="input-base text-sm" />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">What should this module cover?</label>
                <textarea
                  value={modTopic}
                  onChange={e => setModTopic(e.target.value)}
                  placeholder="Describe the topics, learning goals, and what students should know by the end of this module…"
                  className="w-full h-28 input-base text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Number of Lessons</label>
                  <input type="number" min={1} max={12} value={modNumLessons}
                    onChange={e => setModNumLessons(Math.max(1, Math.min(12, +e.target.value)))}
                    className="input-base text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Questions/Quiz</label>
                  <input type="number" min={1} max={20} value={numQ}
                    onChange={e => setNumQ(Math.max(1, Math.min(20, +e.target.value)))}
                    className="input-base text-sm" />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={modGenContent} onChange={e => setModGenContent(e.target.checked)} className="rounded" />
                <span className="text-sm text-slate-700">Also generate lesson content</span>
              </label>

              {modProgress && <ProgressBar p={modProgress} />}

              <button onClick={handleGenerateModule} disabled={modBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-60 shadow-sm">
                {modBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {modBusy ? "Building Module…" : "Build Module"}
              </button>
            </div>
          )}

          {/* ── Course Tab ── */}
          {tab === "course" && (
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe your course goals and AI will generate the full module and lesson structure, then fill in all the content.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Course Topic & Goals</label>
                <textarea
                  value={courseTopic}
                  onChange={e => setCourseTopic(e.target.value)}
                  placeholder="What is this course about? Who is the audience? What will students be able to do after completing it?"
                  className="w-full h-32 input-base text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Modules</label>
                  <input type="number" min={1} max={10} value={courseNumMods}
                    onChange={e => setCourseNumMods(Math.max(1, Math.min(10, +e.target.value)))}
                    className="input-base text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Lessons / Module</label>
                  <input type="number" min={1} max={10} value={courseLPM}
                    onChange={e => setCourseLPM(Math.max(1, Math.min(10, +e.target.value)))}
                    className="input-base text-sm" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Total lessons to create</span>
                <span className="font-bold text-slate-700">{courseNumMods * courseLPM}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Questions per Quiz</label>
                <input type="number" min={1} max={20} value={numQ}
                  onChange={e => setNumQ(Math.max(1, Math.min(20, +e.target.value)))}
                  className="input-base w-24 text-sm" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={courseGenContent} onChange={e => setCourseGenContent(e.target.checked)} className="rounded" />
                <span className="text-sm text-slate-700">Also generate all lesson content</span>
              </label>

              {courseProgress && <ProgressBar p={courseProgress} />}

              <button onClick={handleGenerateCourse} disabled={courseBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-60 shadow-sm">
                {courseBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {courseBusy ? "Building Course…" : "Build Full Course"}
              </button>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                This will add {courseNumMods} modules with {courseNumMods * courseLPM} lessons to the existing course.
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.accessToken)!;

  const [showStudentView, setShowStudentView] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; module: Module } | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function handlePublishAll() {
    if (!confirm("Publish all modules and lessons in this course? Students will immediately have access.")) return;
    setPublishing(true);
    try {
      const res = await api.post<any>(`/admin/courses/${courseId}/publish-all`, {}, token) as any;
      const { modules: m, lessons: l } = res?.data ?? res;
      toast.success(`Published ${m} modules and ${l} lessons`);
      mutate();
    } catch (err: any) {
      toast.error(err?.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  // Add module
  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");

  // Add lesson
  const [addingLessonToModule, setAddingLessonToModule] = useState<Module | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState("reading");

  const { data: courseRaw } = useSWR(
    token && courseId ? [`/admin/courses/${courseId}`, token] : null,
    ([url, t]) => api.get<any>(url, t)
  );
  const course = (courseRaw as any)?.data ?? courseRaw ?? { id: courseId, title: "" };

  const { data: modulesRaw, mutate } = useSWR(
    token && courseId ? [`/admin/courses/${courseId}/modules`, token] : null,
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

  // Keep selected lesson in sync after refresh
  useEffect(() => {
    if (!selectedLesson) return;
    const mod = modules.find(m => m.id === selectedLesson.module.id);
    const lesson = mod?.lessons.find(l => l.id === selectedLesson.lesson.id);
    if (mod && lesson) setSelectedLesson({ lesson, module: mod });
  }, [modulesRaw]);

  async function handleAddModule() {
    if (!moduleTitle.trim()) return;
    await toast.promise(
      api.post(`/admin/courses/${courseId}/modules`, { title: moduleTitle, order_index: modules.length }, token)
        .then(() => { setAddingModule(false); setModuleTitle(""); mutate(); }),
      { loading: "Creating…", success: "Module created", error: "Failed" }
    );
  }

  async function handleDeleteModule(mod: Module) {
    if (!confirm(`Delete "${mod.title}" and all its lessons?`)) return;
    await toast.promise(
      api.delete(`/admin/courses/${courseId}/modules/${mod.id}`, token).then(() => { if (selectedLesson?.module.id === mod.id) setSelectedLesson(null); mutate(); }),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  async function handleAddLesson(mod: Module) {
    setAddingLessonToModule(mod);
    setNewLessonTitle(""); setNewLessonType("reading");
  }

  async function submitAddLesson() {
    if (!addingLessonToModule || !newLessonTitle.trim()) return;
    const mod = addingLessonToModule;
    await toast.promise(
      api.post(`/admin/courses/${courseId}/modules/${mod.id}/lessons`, { title: newLessonTitle, type: newLessonType, order_index: mod.lessons.length }, token)
        .then(() => { setAddingLessonToModule(null); mutate(); }),
      { loading: "Creating…", success: "Lesson created", error: "Failed" }
    );
  }

  async function handleDeleteLesson(lesson: Lesson, mod: Module) {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await toast.promise(
      api.delete(`/admin/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`, token).then(() => { if (selectedLesson?.lesson.id === lesson.id) setSelectedLesson(null); mutate(); }),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  if (!modulesRaw && !courseRaw) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading course…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/courses/${courseId}`} className="text-navy-300 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <span className="text-white font-semibold text-sm truncate max-w-xs">{course.title || "Course Builder"}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", course.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-300")}>
            {course.status ?? "draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-navy-400">{modules.length} modules · {modules.reduce((s, m) => s + m.lessons.length, 0)} lessons</span>
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
          {!showStudentView && (
            <button
              onClick={() => setAiPanelOpen(o => !o)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border", aiPanelOpen ? "bg-violet-500 text-white border-violet-400" : "bg-navy-800 text-navy-200 border-navy-700 hover:bg-navy-700")}
            >
              <Sparkles size={12} />
              AI Assistant
            </button>
          )}
          <button
            onClick={() => setShowStudentView(!showStudentView)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border", showStudentView ? "bg-blue-500 text-white border-blue-400" : "bg-navy-800 text-navy-200 border-navy-700 hover:bg-navy-700")}
          >
            {showStudentView ? <EyeOff size={12} /> : <Eye size={12} />}
            {showStudentView ? "Exit Preview" : "Student View"}
          </button>
        </div>
      </div>

      {showStudentView ? (
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <StudentCourseView modules={modules} course={course} onExit={() => setShowStudentView(false)} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-200 overflow-hidden">
            <CourseSidebar
              modules={modules}
              selectedLessonId={selectedLesson?.lesson.id ?? null}
              onSelectLesson={(l, m) => { setSelectedLesson({ lesson: l, module: m }); setActiveTab("content"); }}
              onAddModule={() => setAddingModule(true)}
              onDeleteModule={handleDeleteModule}
              onAddLesson={handleAddLesson}
              onDeleteLesson={handleDeleteLesson}
              courseId={courseId}
              token={token}
              onRefresh={mutate}
              studentView={false}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedLesson ? (
              <div className="max-w-3xl mx-auto px-8 py-8">
                {/* Lesson header */}
                <div className="flex items-center gap-2 mb-1">
                  {(() => { const Icon = LESSON_ICONS[selectedLesson.lesson.type] ?? FileText; const col = LESSON_COLORS[selectedLesson.lesson.type] ?? "text-slate-600 bg-slate-100"; return <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", col)}><Icon size={14} /></div>; })()}
                  <p className="text-xs text-slate-400">{LESSON_TYPE_LABEL[selectedLesson.lesson.type] ?? selectedLesson.lesson.type} · {selectedLesson.module.title}</p>
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mb-6">{selectedLesson.lesson.title}</h1>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-slate-200 mb-6">
                  {(["content", "settings"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2", activeTab === tab ? "text-navy-700 border-navy-700" : "text-slate-500 border-transparent hover:text-slate-700")}>
                      {tab === "content" ? "Content" : "Settings"}
                    </button>
                  ))}
                </div>

                {activeTab === "content" && (
                  <>
                    {selectedLesson.lesson.type === "reading" && <ReadingEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "video" && <VideoEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "html" && <HtmlEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "download" && <DownloadEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "quiz" && <QuizEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "assignment" && <AssignmentEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                    {selectedLesson.lesson.type === "live_session" && <ReadingEditor lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />}
                  </>
                )}

                {activeTab === "settings" && (
                  <LessonSettings lesson={selectedLesson.lesson} courseId={courseId} moduleId={selectedLesson.module.id} token={token} onSaved={mutate} />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
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

      {/* AI Assistant Panel */}
      {aiPanelOpen && !showStudentView && (
        <AiAssistantPanel
          courseId={courseId}
          course={course}
          modules={modules}
          token={token}
          selectedLesson={selectedLesson}
          onRefresh={async () => { await mutate(); }}
          onClose={() => setAiPanelOpen(false)}
        />
      )}
    </div>
  );
}

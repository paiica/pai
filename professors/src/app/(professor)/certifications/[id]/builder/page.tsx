"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Edit3, Check, Video, FileText, HelpCircle,
  File, Link2, Download, Eye, EyeOff, X, ChevronDown, ChevronRight,
  Save, Loader2, Search, BookOpen, FileQuestion, CheckCircle,
  ArrowLeft, ArrowRight, Sparkles, Upload, RotateCcw, Paperclip,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type QuizQuestion = {
  id: string; question_text: string; question_type: string;
  options: string[]; correct_index: number; explanation?: string; points: number; sort_order: number;
};

type Lesson = {
  id: string; module_id: string; title: string; type: string; description?: string;
  content_body?: string; video_url?: string; download_url?: string; external_url?: string;
  is_published: boolean; is_free_preview: boolean; duration_minutes: number; sort_order: number;
  passing_score?: number; max_attempts?: number; time_limit_minutes?: number;
  max_score?: number; due_date?: string;
  quiz_questions?: QuizQuestion[];
};

type Module = { id: string; title: string; description?: string; is_published: boolean; sort_order: number; lessons: Lesson[] };

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
const LESSON_TYPE_OPTIONS = ["reading", "video", "html", "download", "quiz", "assignment", "live_session"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
  coming_soon: "bg-amber-100 text-amber-700",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function CertSidebar({
  modules, selectedLessonId, onSelectLesson, onAddModule, onDeleteModule,
  onAddLesson, onDeleteLesson, onToggleModulePublish, onGenerateAi,
}: {
  modules: Module[]; selectedLessonId: string | null; onSelectLesson: (l: Lesson, m: Module) => void;
  onAddModule: () => void; onDeleteModule: (m: Module) => void;
  onAddLesson: (m: Module) => void; onDeleteLesson: (l: Lesson, m: Module) => void;
  onToggleModulePublish: (m: Module) => void; onGenerateAi: () => void;
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

      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map(mod => (
          <div key={mod.id}>
            <div className="flex items-center gap-1.5 px-2.5 py-2 group hover:bg-slate-50">
              <button onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))} className="p-0.5 text-slate-500">
                {expanded[mod.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <span className="flex-1 text-sm font-semibold text-navy-800 truncate cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [mod.id]: !p[mod.id] }))}>
                {mod.title}
              </span>
              <button
                onClick={() => onToggleModulePublish(mod)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                  mod.is_published ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
                title={mod.is_published ? "Published — visible to enrolled students. Click to unpublish." : "Draft — hidden from students. Click to publish."}
              >
                {mod.is_published ? <Eye size={11} /> : <EyeOff size={11} />}
                {mod.is_published ? "Published" : "Draft"}
              </button>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                <button onClick={() => onAddLesson(mod)} className="p-1.5 rounded hover:bg-navy-100 text-slate-400 hover:text-navy-700" title="Add lesson"><Plus size={13} /></button>
                <button onClick={() => onDeleteModule(mod)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete module"><Trash2 size={13} /></button>
              </div>
            </div>

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
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteLesson(lesson, mod); }}
                    className={cn("opacity-0 group-hover:opacity-100 p-1 rounded", isSelected ? "hover:bg-navy-800 text-navy-200" : "hover:bg-red-50 text-slate-400 hover:text-red-600")}
                  ><Trash2 size={13} /></button>
                </div>
              );
            })}

            {expanded[mod.id] && (
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

      <div className="p-3 border-t border-slate-100 space-y-2">
        <button onClick={onGenerateAi} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-sm text-white transition-all">
          <Sparkles size={14} /> Generate with AI
        </button>
        <button onClick={onAddModule} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-slate-200 hover:border-navy-300 text-sm text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all">
          <Plus size={14} /> New Module
        </button>
      </div>
    </div>
  );
}

// ─── Reading Editor ───────────────────────────────────────────────────────────

function ReadingEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [content, setContent] = useState(lesson.content_body ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setContent(lesson.content_body ?? ""); }, [lesson.id, lesson.content_body]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/lessons/${lesson.id}`, { content_body: content }, token);
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
  const [content, setContent] = useState(lesson.content_body ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(lesson.video_url ?? "");
    setContent(lesson.content_body ?? "");
  }, [lesson.id, lesson.content_body]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/lessons/${lesson.id}`, { video_url: url, content_body: content }, token);
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
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Text Below Video</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full h-36 input-base resize-none text-sm leading-relaxed"
          placeholder="Add supplementary text, notes, or a description below the video…"
        />
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setUrl(lesson.download_url ?? ""); }, [lesson.id]);

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
      await api.put(`/prof/lessons/${lesson.id}`, { download_url: fileUrl }, token);
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
      await api.put(`/prof/lessons/${lesson.id}`, { download_url: url }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Upload PDF / File</label>
        <label className={cn("flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors", uploading ? "border-navy-200 bg-navy-50" : "border-slate-200 hover:border-navy-300 hover:bg-navy-50")}>
          {uploading ? <Loader2 size={20} className="animate-spin text-navy-500" /> : <FileText size={20} className="text-slate-400" />}
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
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Quiz Editor ──────────────────────────────────────────────────────────────

function QuizEditor({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const questions: QuizQuestion[] = lesson.quiz_questions ?? [];

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "", question_type: "multiple_choice" });
  const [saving, setSaving] = useState(false);

  const [passingScore, setPassingScore] = useState(lesson.passing_score ?? 70);
  const [maxAttempts, setMaxAttempts] = useState(lesson.max_attempts ?? 3);
  const [timeLimit, setTimeLimit] = useState(lesson.time_limit_minutes ?? 0);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    setPassingScore(lesson.passing_score ?? 70);
    setMaxAttempts(lesson.max_attempts ?? 3);
    setTimeLimit(lesson.time_limit_minutes ?? 0);
  }, [lesson.id]);

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await api.put(`/prof/lessons/${lesson.id}`, {
        passing_score: passingScore, max_attempts: maxAttempts,
        time_limit_minutes: timeLimit || undefined,
      }, token);
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
      if (editId) { await api.put(`/prof/questions/${editId}`, payload, token); }
      else { await api.post(`/prof/lessons/${lesson.id}/questions`, payload, token); }
      toast.success(editId ? "Question updated" : "Question added");
      resetForm(); onSaved();
    } catch { toast.error("Failed to save question"); }
    finally { setSaving(false); }
  }

  async function deleteQuestion(qId: string) {
    if (!confirm("Delete this question?")) return;
    await toast.promise(
      api.delete(`/prof/questions/${qId}`, token).then(() => onSaved()),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  function startEdit(q: QuizQuestion) {
    setForm({ question_text: q.question_text, options: q.options.length >= 4 ? q.options : [...q.options, ...Array(4 - q.options.length).fill("")], correct_index: q.correct_index, explanation: q.explanation ?? "", question_type: q.question_type });
    setEditId(q.id); setAdding(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 flex-wrap">
        <div>
          <label className="text-xs font-semibold text-purple-700 mb-1 block">Passing Score (%)</label>
          <input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(+e.target.value)} className="input-base w-24 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-purple-700 mb-1 block">Max Attempts</label>
          <input type="number" min={1} max={10} value={maxAttempts} onChange={e => setMaxAttempts(+e.target.value)} className="input-base w-24 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-purple-700 mb-1 block">Time Limit (min)</label>
          <input type="number" min={0} value={timeLimit} onChange={e => setTimeLimit(+e.target.value)} className="input-base w-24 text-sm" placeholder="No limit" />
        </div>
        <button onClick={saveSettings} disabled={settingsSaving} className="btn-primary !py-2 !px-3 !text-xs disabled:opacity-60">
          {settingsSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Settings
        </button>
      </div>

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
  const [code, setCode] = useState(lesson.content_body ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setCode(lesson.content_body ?? ""); }, [lesson.id]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/lessons/${lesson.id}`, { content_body: code }, token);
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
  const [desc, setDesc] = useState(lesson.content_body ?? "");
  const [maxScore, setMaxScore] = useState(lesson.max_score ?? 100);
  const [dueDate, setDueDate] = useState(lesson.due_date ? lesson.due_date.split("T")[0] : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDesc(lesson.content_body ?? "");
    setMaxScore(lesson.max_score ?? 100);
    setDueDate(lesson.due_date ? lesson.due_date.split("T")[0] : "");
  }, [lesson.id, lesson.content_body]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/lessons/${lesson.id}`, {
        content_body: desc,
        max_score: maxScore,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      }, token);
      toast.success("Saved"); onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Assignment Instructions</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full h-40 input-base resize-y text-sm leading-relaxed"
          placeholder="Describe what students need to do…"
        />
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
      <p className="text-xs text-slate-400">
        Students can submit a written response and/or attach a file from the learning portal.
      </p>
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
      </button>
    </div>
  );
}

// ─── Lesson Settings Panel ────────────────────────────────────────────────────

function LessonSettings({ lesson, token, onSaved }: { lesson: Lesson; token: string; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [type, setType] = useState(lesson.type);
  const [duration, setDuration] = useState(lesson.duration_minutes);
  const [published, setPublished] = useState(lesson.is_published);
  const [freePreview, setFreePreview] = useState(lesson.is_free_preview);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(lesson.title); setDescription(lesson.description ?? ""); setType(lesson.type); setDuration(lesson.duration_minutes);
    setPublished(lesson.is_published); setFreePreview(lesson.is_free_preview);
  }, [lesson.id]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/prof/lessons/${lesson.id}`, {
        title, description: description || undefined, type, duration_minutes: duration, is_published: published, is_free_preview: freePreview,
      }, token);
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
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
          Instructions <span className="text-slate-400 normal-case font-normal">(shown to students before the lesson content)</span>
        </label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-base h-20 resize-none text-sm" placeholder="Anything students should know before starting this lesson…" />
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
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={freePreview} onChange={e => setFreePreview(e.target.checked)} className="rounded" />
        <span className="text-sm text-slate-700">Free preview (visible before enrolling)</span>
      </label>
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Settings
      </button>
    </div>
  );
}

// ─── Student preview ──────────────────────────────────────────────────────────

function StudentCertView({ modules, cert }: { modules: Module[]; cert: any }) {
  const allLessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleName: m.title, moduleId: m.id })));
  const [selectedId, setSelectedId] = useState<string | null>(allLessons[0]?.id ?? null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init: Record<string, boolean> = {};
    modules.forEach(m => { init[m.id] = true; });
    setExpanded(init);
  }, []);

  const lesson = allLessons.find(l => l.id === selectedId) ?? allLessons[0];
  const idx = allLessons.findIndex(l => l.id === lesson?.id);
  const prev = allLessons[idx - 1];
  const next = allLessons[idx + 1];

  return (
    <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden">
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-3.5 border-b border-slate-100 bg-navy-900">
          <p className="text-sm font-bold text-white truncate">{cert.title}</p>
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

            {(lesson.type === "reading" || lesson.type === "live_session" || lesson.type === "video") && lesson.content_body && (
              (lesson.content_body as string).trim().startsWith("<") ? (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
              ) : (
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-6">{lesson.content_body}</p>
              )
            )}

            {lesson.type === "html" && (
              <div className="rounded-xl overflow-hidden border border-slate-200 mb-6" style={{ height: 500 }}>
                <iframe srcDoc={lesson.content_body ?? ""} className="w-full h-full" title={lesson.title} sandbox="allow-scripts" style={{ border: "none" }} />
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
                    <a href={lesson.download_url} download target="_blank" rel="noreferrer" className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1 flex-shrink-0">
                      <Download size={13} /> Download
                    </a>
                  </div>
                )}
              </div>
            )}

            {lesson.type === "quiz" && (
              (lesson.quiz_questions ?? []).length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <HelpCircle size={16} className="text-purple-500" />
                    <span className="text-sm text-purple-700 font-medium">
                      {lesson.quiz_questions!.length} question{lesson.quiz_questions!.length !== 1 ? "s" : ""}
                      {lesson.passing_score ? ` · Passing score: ${lesson.passing_score}%` : ""}
                      {lesson.max_attempts ? ` · ${lesson.max_attempts} attempt(s)` : ""}
                      {lesson.time_limit_minutes ? ` · ${lesson.time_limit_minutes} min limit` : ""}
                    </span>
                  </div>
                  {lesson.quiz_questions!.map((q, qi) => (
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

            {lesson.type === "assignment" && lesson.content_body && (
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="font-semibold text-amber-800 text-sm mb-2">Instructions</p>
                {(lesson.content_body as string).trim().startsWith("<") ? (
                  <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{lesson.content_body}</p>
                )}
                {(lesson.due_date || lesson.max_score) && (
                  <p className="text-xs text-amber-600 mt-3">
                    {lesson.max_score ? `${lesson.max_score} points` : ""}
                    {lesson.due_date ? ` · Due ${new Date(lesson.due_date).toLocaleDateString()}` : ""}
                  </p>
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

// ─── AI Module Assistant ──────────────────────────────────────────────────────

type ProposedLesson = { title: string; type: string; topic: string };

function AiModuleAssistantModal({
  certId, certTitle, token, onClose, onCreated,
}: { certId: string; certTitle: string; token: string; onClose: () => void; onCreated: () => void }) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  const [moduleTitle, setModuleTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [numLessons, setNumLessons] = useState<number | "">("");
  const [lessonTypes, setLessonTypes] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [proposed, setProposed] = useState<ProposedLesson[] | null>(null);

  function updateNumLessons(raw: string) {
    if (raw === "") { setNumLessons(""); setLessonTypes([]); return; }
    const n = Math.max(1, Math.min(20, parseInt(raw, 10) || 1));
    setNumLessons(n);
    setLessonTypes((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("reading");
      next.length = n;
      return next;
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setExtracting(true);
    setDocumentText("");
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch(`${API_BASE}/ai/extract-document-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Extraction failed: ${res.status}`);
      const text: string = data?.text ?? data?.data?.text ?? "";
      if (!text.trim()) throw new Error("No readable text found in this document");
      setDocumentText(text);
      setFile(f);
      toast.success(`Extracted text from ${f.name}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to read document");
      setFile(null);
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    if (!moduleTitle.trim()) { toast.error("Module title is required"); return; }
    if (!prompt.trim() && !documentText.trim()) { toast.error("Describe the module or upload a document"); return; }
    setGenerating(true);
    try {
      const body: Record<string, any> = { course_title: certTitle, module_title: moduleTitle.trim() };
      if (prompt.trim()) body.topic = prompt.trim();
      if (typeof numLessons === "number") body.num_lessons = numLessons;
      if (lessonTypes.length) body.lesson_types = lessonTypes;
      if (documentText.trim()) body.document_text = documentText.trim();

      const res = await api.post<any>("/ai/generate-module-structure", body, token);
      const data = res.data ?? res;
      const lessons = Array.isArray(data.lessons) ? data.lessons : [];
      if (!lessons.length) throw new Error("AI returned no lessons");
      setProposed(lessons.map((l: any) => ({
        title: l.title || "Untitled lesson",
        type: LESSON_TYPE_OPTIONS.includes(l.type) ? l.type : "reading",
        topic: l.topic || "",
      })));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate module");
    } finally {
      setGenerating(false);
    }
  }

  async function handleConfirmCreate() {
    if (!proposed || !proposed.length) return;
    setCreating(true);
    try {
      const modRes = await api.post<any>(`/prof/certifications/${certId}/modules`, {
        title: moduleTitle.trim(),
        description: prompt.trim() || undefined,
      }, token);
      const modData = modRes.data ?? modRes;
      const newModuleId: string = modData.id ?? modData.data?.id;
      if (!newModuleId) throw new Error("Module was created but no ID was returned");
      for (const lesson of proposed) {
        await api.post(`/prof/modules/${newModuleId}/lessons`, {
          title: lesson.title, type: lesson.type, duration_minutes: 10,
          description: lesson.topic || undefined,
        }, token);
      }
      toast.success(`Module created with ${proposed.length} lesson${proposed.length !== 1 ? "s" : ""}`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create module");
    } finally {
      setCreating(false);
    }
  }

  function updateProposedLesson(i: number, patch: Partial<ProposedLesson>) {
    setProposed((prev) => prev ? prev.map((l, idx) => idx === i ? { ...l, ...patch } : l) : prev);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-navy-900 flex items-center justify-center text-white flex-shrink-0">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="font-bold text-navy-900 text-sm">Generate Module with AI</p>
              <p className="text-xs text-slate-400">{proposed ? "Review before creating" : "From a prompt, or an uploaded document"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {!proposed ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Module Title</label>
                <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} className="input-base" placeholder="e.g. Prompt Engineering Fundamentals" autoFocus />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Describe this module <span className="text-slate-400 font-normal">(optional if you upload a document below)</span>
                </label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="input-base h-20 resize-none text-sm" placeholder="What should this module teach? Any topics, tone, or level to focus on…" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Or build from a document <span className="text-slate-400 font-normal">(PDF, DOCX, or text — its content becomes the lessons)</span>
                </label>
                {documentText ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Paperclip size={15} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-emerald-800 truncate flex-1">{file?.name}</span>
                    <button onClick={() => { setFile(null); setDocumentText(""); }} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0"><X size={14} /></button>
                  </div>
                ) : (
                  <label className={cn("flex items-center justify-center gap-2 h-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors", extracting ? "border-navy-200 bg-navy-50" : "border-slate-200 hover:border-navy-300 hover:bg-navy-50")}>
                    {extracting ? <Loader2 size={17} className="animate-spin text-navy-500" /> : <Upload size={17} className="text-slate-400" />}
                    <span className="text-sm text-slate-500">{extracting ? "Reading document…" : "Click to upload a document"}</span>
                    <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleFileSelect} disabled={extracting} />
                  </label>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Number of Lessons <span className="text-slate-400 font-normal">(optional — leave blank to let AI decide)</span>
                </label>
                <input type="number" min={1} max={20} value={numLessons} onChange={(e) => updateNumLessons(e.target.value)} className="input-base w-28 text-sm" placeholder="Auto" />
              </div>

              {lessonTypes.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Type of Each Lesson</label>
                  <div className="grid grid-cols-2 gap-2">
                    {lessonTypes.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-14 flex-shrink-0">Lesson {i + 1}</span>
                        <select
                          value={t}
                          onChange={(e) => setLessonTypes((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                          className="input-base py-1.5 text-xs flex-1"
                        >
                          {LESSON_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{LESSON_TYPE_LABEL[opt]}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {proposed.map((lesson, i) => {
                const Icon = LESSON_ICONS[lesson.type] ?? FileText;
                return (
                  <div key={i} className="p-3 border border-slate-200 rounded-xl bg-white">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", LESSON_COLORS[lesson.type] ?? "text-slate-600 bg-slate-100")}>
                        <Icon size={13} />
                      </div>
                      <input
                        value={lesson.title}
                        onChange={(e) => updateProposedLesson(i, { title: e.target.value })}
                        className="input-base py-1.5 text-sm flex-1"
                      />
                      <select
                        value={lesson.type}
                        onChange={(e) => updateProposedLesson(i, { type: e.target.value })}
                        className="input-base py-1.5 text-xs w-36 flex-shrink-0"
                      >
                        {LESSON_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{LESSON_TYPE_LABEL[opt]}</option>)}
                      </select>
                    </div>
                    {lesson.topic && <p className="text-xs text-slate-400 mt-1.5 pl-9">{lesson.topic}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          {!proposed ? (
            <>
              <button onClick={onClose} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || extracting} className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-1.5 disabled:opacity-60">
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? "Generating…" : "Generate"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setProposed(null)} disabled={creating} className="btn-outline !py-2 !px-4 !text-sm flex items-center gap-1.5 disabled:opacity-60">
                <RotateCcw size={13} /> Back
              </button>
              <button onClick={handleConfirmCreate} disabled={creating} className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-1.5 disabled:opacity-60">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {creating ? "Creating…" : `Create Module & ${proposed.length} Lesson${proposed.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CertBuilderPage() {
  const { id: certId } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; module: Module } | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");
  const [showStudentView, setShowStudentView] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const { data: certRaw, mutate } = useSWR(
    token && certId ? [`/prof/certifications/${certId}`, token] as const : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const cert = certRaw ?? null;
  const modules: Module[] = (() => {
    const d = cert?.modules;
    if (!Array.isArray(d)) return [];
    return d.map((m: any) => ({ ...m, lessons: Array.isArray(m.lessons) ? m.lessons : [] }))
             .sort((a: Module, b: Module) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  })();

  useEffect(() => {
    if (!selectedLesson) return;
    const mod = modules.find(m => m.id === selectedLesson.module.id);
    const lesson = mod?.lessons.find(l => l.id === selectedLesson.lesson.id);
    if (mod && lesson) setSelectedLesson({ lesson, module: mod });
  }, [certRaw]);

  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [addingLessonToModule, setAddingLessonToModule] = useState<Module | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState("reading");
  const [newLessonDescription, setNewLessonDescription] = useState("");

  async function handleAddModule() {
    if (!moduleTitle.trim()) return;
    await toast.promise(
      api.post(`/prof/certifications/${certId}/modules`, { title: moduleTitle, description: moduleDescription || undefined }, token)
        .then(() => { setAddingModule(false); setModuleTitle(""); setModuleDescription(""); mutate(); }),
      { loading: "Creating…", success: "Module created", error: "Failed" }
    );
  }

  async function handleDeleteModule(mod: Module) {
    if (!confirm(`Delete "${mod.title}" and all its lessons?`)) return;
    await toast.promise(
      api.delete(`/prof/modules/${mod.id}`, token).then(() => { if (selectedLesson?.module.id === mod.id) setSelectedLesson(null); mutate(); }),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  function handleAddLesson(mod: Module) {
    setAddingLessonToModule(mod);
    setNewLessonTitle(""); setNewLessonType("reading"); setNewLessonDescription("");
  }

  async function submitAddLesson() {
    if (!addingLessonToModule || !newLessonTitle.trim()) return;
    const mod = addingLessonToModule;
    await toast.promise(
      api.post(`/prof/modules/${mod.id}/lessons`, {
        title: newLessonTitle, type: newLessonType, duration_minutes: 10,
        description: newLessonDescription || undefined,
      }, token)
        .then(() => { setAddingLessonToModule(null); mutate(); }),
      { loading: "Creating…", success: "Lesson created", error: "Failed" }
    );
  }

  async function handleDeleteLesson(lesson: Lesson, mod: Module) {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await toast.promise(
      api.delete(`/prof/lessons/${lesson.id}`, token).then(() => { if (selectedLesson?.lesson.id === lesson.id) setSelectedLesson(null); mutate(); }),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  async function handleToggleModulePublish(mod: Module) {
    const next = !mod.is_published;
    await toast.promise(
      api.put(`/prof/modules/${mod.id}`, { is_published: next }, token).then(() => mutate()),
      { loading: "Saving…", success: next ? "Module published — visible to students" : "Module unpublished", error: "Failed" }
    );
  }

  if (!certRaw) {
    return (
      <div className="p-8">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="flex flex-col h-screen">
      {/* Page header */}
      <div className="px-8 pt-8 max-w-4xl mx-auto w-full flex-shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-black text-navy-900">{cert.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {cert.acronym} · {modules.length} module{modules.length !== 1 ? "s" : ""}
            </p>
          </div>
          <span className={cn("badge", STATUS_COLORS[cert.status] ?? "bg-slate-100 text-slate-600")}>
            {cert.status}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-navy-900 border-y border-navy-800 flex-shrink-0">
        <span className="text-xs text-navy-300">{modules.length} module{modules.length !== 1 ? "s" : ""} · {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}</span>
        <button
          onClick={() => setShowStudentView(!showStudentView)}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border", showStudentView ? "bg-navy-600 text-white border-navy-500" : "bg-navy-800 text-navy-200 border-navy-700 hover:bg-navy-700")}
        >
          {showStudentView ? <EyeOff size={12} /> : <Eye size={12} />}
          {showStudentView ? "Exit Preview" : "Student View"}
        </button>
      </div>

      {showStudentView ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50">
          <StudentCertView modules={modules} cert={cert} />
        </div>
      ) : (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 overflow-y-auto">
          <CertSidebar
            modules={modules}
            selectedLessonId={selectedLesson?.lesson.id ?? null}
            onSelectLesson={(l, m) => { setSelectedLesson({ lesson: l, module: m }); setActiveTab("content"); }}
            onAddModule={() => setAddingModule(true)}
            onDeleteModule={handleDeleteModule}
            onAddLesson={handleAddLesson}
            onDeleteLesson={handleDeleteLesson}
            onToggleModulePublish={handleToggleModulePublish}
            onGenerateAi={() => setShowAiModal(true)}
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
            <input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setAddingModule(false); }} className="input-base mb-3" placeholder="Module title" autoFocus />
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Instructions <span className="text-slate-400 font-normal">(optional — shown to students above this module's lessons)</span></label>
            <textarea value={moduleDescription} onChange={e => setModuleDescription(e.target.value)} className="input-base mb-4 h-20 resize-none text-sm" placeholder="What this module covers…" />
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
            <input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setAddingLessonToModule(null); }} className="input-base mb-3" placeholder="Lesson title" autoFocus />
            <select value={newLessonType} onChange={e => setNewLessonType(e.target.value)} className="input-base mb-3 text-sm">
              <option value="reading">Reading</option>
              <option value="video">Video</option>
              <option value="html">HTML Page</option>
              <option value="download">Download / PDF</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
              <option value="live_session">Live Session</option>
            </select>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Instructions <span className="text-slate-400 font-normal">(optional — shown to students before the lesson content)</span></label>
            <textarea value={newLessonDescription} onChange={e => setNewLessonDescription(e.target.value)} className="input-base mb-4 h-20 resize-none text-sm" placeholder="Anything students should know before starting this lesson…" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddingLessonToModule(null)} className="btn-outline !py-2 !px-4 !text-sm">Cancel</button>
              <button onClick={submitAddLesson} className="btn-primary !py-2 !px-4 !text-sm">Create Lesson</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate module with AI */}
      {showAiModal && (
        <AiModuleAssistantModal
          certId={certId as string}
          certTitle={cert.title}
          token={token}
          onClose={() => setShowAiModal(false)}
          onCreated={mutate}
        />
      )}
    </div>
  );
}

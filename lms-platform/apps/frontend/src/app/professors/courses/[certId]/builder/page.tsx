"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, ChevronDown, ChevronRight, Trash2, Edit3, Check,
  Video, FileText, HelpCircle, File, Link2, Download,
  GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
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

type Lesson = { id: string; title: string; type: string; is_published: boolean; duration_minutes: number; sort_order: number };
type Module = { id: string; title: string; description?: string; is_published: boolean; sort_order: number; lessons: Lesson[] };

function LessonRow({ lesson, moduleId, certId, token, onRefresh }: { lesson: Lesson; moduleId: string; certId: string; token: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const Icon = LESSON_ICONS[lesson.type] ?? FileText;
  const color = LESSON_COLORS[lesson.type] ?? "text-slate-600 bg-slate-100";

  async function save() {
    await toast.promise(
      api.put<any>(`/prof/lessons/${lesson.id}`, { title }, token).then(() => { setEditing(false); onRefresh(); }),
      { loading: "Saving…", success: "Updated", error: "Failed" }
    );
  }

  async function togglePublish() {
    await api.put<any>(`/prof/lessons/${lesson.id}`, { is_published: !lesson.is_published }, token);
    onRefresh();
  }

  async function deleteLesson() {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await toast.promise(
      api.delete<any>(`/prof/lessons/${lesson.id}`, token).then(onRefresh),
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

function ModuleSection({ module, certId, token, onRefresh, index, total, onMove }: {
  module: Module; certId: string; token: string; onRefresh: () => void; index: number; total: number;
  onMove: (index: number, direction: "up" | "down") => void;
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
      {/* Module header */}
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
        <span className="text-xs text-slate-400">{module.lessons.length} lessons</span>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button onClick={() => onMove(index, "up")} className="p-1 rounded hover:bg-slate-200 text-slate-400" title="Move up">
              <ArrowUp size={13} />
            </button>
          )}
          {index < total - 1 && (
            <button onClick={() => onMove(index, "down")} className="p-1 rounded hover:bg-slate-200 text-slate-400" title="Move down">
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
          {module.lessons.length === 0 && !addingLesson && (
            <p className="text-xs text-slate-400 text-center py-3">No lessons yet.</p>
          )}
          {module.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              moduleId={module.id}
              certId={certId}
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

export default function CourseBuilderPage() {
  const { certId } = useParams<{ certId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");

  const swrKey = token ? [`/prof/certifications/${certId}`, token] as const : null;
  const { data: cert, mutate } = useSWR(
    swrKey,
    ([url, t]) => fetcher(url, t)
  );

  async function addModule() {
    if (!moduleTitle.trim()) return;
    await toast.promise(
      api.post<any>(`/prof/certifications/${certId}/modules`, { title: moduleTitle }, token)
        .then(() => { setAddingModule(false); setModuleTitle(""); mutate(); }),
      { loading: "Creating module…", success: "Module created", error: "Failed" }
    );
  }

  async function moveModule(index: number, direction: "up" | "down") {
    const modules: Module[] = cert?.modules ?? [];
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= modules.length) return;

    const reordered = [...modules];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    const ordered_ids = reordered.map((m) => m.id);

    await toast.promise(
      api.post<any>(`/prof/certifications/${certId}/modules/reorder`, { ordered_ids }, token).then(() => mutate()),
      { loading: "Reordering…", success: "Order updated", error: "Failed to reorder" }
    );
  }

  if (!cert) {
    return (
      <div className="p-8">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const modules: Module[] = cert.modules ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{cert.badge_icon}</span>
            <h1 className="text-2xl font-display font-black text-navy-900">{cert.title}</h1>
          </div>
          <p className="text-slate-500 text-sm">
            {cert.acronym} · {modules.length} modules · {modules.reduce((s: number, m: Module) => s + m.lessons.length, 0)} lessons
          </p>
        </div>
        <span className={cn("badge", cert.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
          {cert.status}
        </span>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {modules.map((mod, i) => (
          <ModuleSection
            key={mod.id}
            module={mod}
            certId={certId}
            token={token}
            onRefresh={mutate}
            index={i}
            total={modules.length}
            onMove={moveModule}
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
    </div>
  );
}

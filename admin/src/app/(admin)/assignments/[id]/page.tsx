"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Loader2, Save, Plus, Trash2, ChevronLeft, AlertCircle,
  Globe, Archive, Users, Layers, ArrowUp, ArrowDown,
  CheckCircle, Star, Lock, Unlock, ChevronDown, ChevronUp,
  ClipboardList, FlaskConical, Briefcase, BookOpen,
  Code2, Eye,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-40 bg-slate-50 animate-pulse rounded-lg" /> }
);

type Tab = "overview" | "build" | "submissions";

type Section = {
  id: string;
  title: string;
  description: string;
  points: number;
  sort_order: number;
};

type Assignment = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  instructions: string | null;
  sections: Section[];
  due_date: string | null;
  max_score: number;
  grades_released: boolean;
  status: string;
  sort_order: number;
  certification_id: string;
  certification: { id: string; acronym: string; title: string };
  _count: { entries: number };
};

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  assignment: { label: "Assignment", icon: ClipboardList, color: "bg-indigo-50 text-indigo-500" },
  exam:       { label: "Exam",       icon: FlaskConical,  color: "bg-amber-50 text-amber-500"  },
  case:       { label: "Case Study", icon: Briefcase,     color: "bg-purple-50 text-purple-500"},
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-500",
  published: "bg-emerald-50 text-emerald-700",
  archived:  "bg-red-50 text-red-700",
};

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AssignmentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);

  const { data: raw, isLoading, error, mutate } = useSWR(
    token && id ? [`/admin/assignments/${id}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const assignment: Assignment | null = (() => {
    const d = (raw as any)?.data ?? raw;
    return d?.id ? d : null;
  })();

  // ── Overview form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "", type: "assignment", description: "", instructions: "",
    due_date: "", status: "draft", sort_order: "0",
  });

  useEffect(() => {
    if (!assignment) return;
    setForm({
      title:        assignment.title,
      type:         assignment.type,
      description:  assignment.description ?? "",
      instructions: assignment.instructions ?? "",
      due_date:     assignment.due_date ? new Date(assignment.due_date).toISOString().slice(0, 10) : "",
      status:       assignment.status,
      sort_order:   String(assignment.sort_order),
    });
  }, [assignment?.id]);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function saveOverview() {
    setSaving(true);
    try {
      await api.patch(`/admin/assignments/${id}`, {
        title:        form.title.trim(),
        type:         form.type,
        description:  form.description || null,
        instructions: form.instructions || null,
        due_date:     form.due_date || null,
        status:       form.status,
        sort_order:   parseInt(form.sort_order) || 0,
      }, token);
      toast.success("Saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${assignment?.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/assignments/${id}`, token);
      toast.success("Deleted");
      router.push("/assignments");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function toggleStatus() {
    if (!assignment) return;
    const next = assignment.status === "published" ? "archived" : "published";
    try {
      await api.patch(`/admin/assignments/${id}`, { status: next }, token);
      mutate();
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Assignment not found</p>
        <Link href="/assignments" className="btn-outline !py-1.5 !px-4 !text-xs inline-flex mt-4">
          <ChevronLeft size={12} /> Back to Assignments
        </Link>
      </div>
    );
  }

  const typeMeta = TYPE_META[assignment.type] ?? TYPE_META.assignment;
  const TypeIcon = typeMeta.icon;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/assignments" className="hover:text-slate-600 flex items-center gap-1">
          <ChevronLeft size={13} /> Assignments
        </Link>
        <span>/</span>
        <span className="text-slate-600 truncate max-w-[200px]">{assignment.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", typeMeta.color)}>
            <TypeIcon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-display font-black text-navy-900 truncate">{assignment.title}</h1>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", STATUS_COLORS[assignment.status])}>
                {assignment.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {typeMeta.label} · {assignment.certification?.acronym} · {assignment.max_score} pts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleStatus}
            className={cn(
              "btn-outline !py-1.5 !px-3 !text-xs",
              assignment.status === "published"
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            )}
          >
            {assignment.status === "published"
              ? <><Archive size={12} /> Archive</>
              : <><Globe size={12} /> Publish</>}
          </button>
          <button
            onClick={handleDelete}
            className="btn-outline !py-1.5 !px-3 !text-xs text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(["overview", "build", "submissions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-navy-700 text-navy-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "submissions"
              ? `Submissions (${assignment._count?.entries ?? 0})`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab assignment={assignment} form={form} setField={setField} saving={saving} onSave={saveOverview} />
      )}
      {tab === "build" && (
        <BuildTab assignment={assignment} token={token} onMutate={mutate} />
      )}
      {tab === "submissions" && (
        <SubmissionsTab assignment={assignment} token={token} onMutate={mutate} />
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ assignment, form, setField, saving, onSave }: {
  assignment: Assignment;
  form: Record<string, string>;
  setField: (k: string, v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Cert info (read-only) */}
      <div className="card p-4 flex items-center gap-3 bg-gold-50/40 border-gold-100">
        <BookOpen size={15} className="text-gold-600 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-gold-800">{assignment.certification?.title}</p>
          <p className="text-xs text-gold-600">{assignment.certification?.acronym}</p>
        </div>
      </div>

      {/* Identity */}
      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identity</p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
          <input
            className="input-base"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
            <select className="input-base" value={form.type} onChange={(e) => setField("type", e.target.value)}>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="case">Case Study</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
            <select className="input-base" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sort Order</label>
            <input
              className="input-base"
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(e) => setField("sort_order", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card p-5 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content</p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
          <textarea
            className="input-base h-20 resize-none"
            placeholder="Brief overview shown on the assignments list…"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">Instructions</label>
            <div className="flex items-center gap-1">
              {htmlMode && (
                <button
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                    preview
                      ? "bg-navy-100 text-navy-700"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  <Eye size={11} />
                  Preview
                </button>
              )}
              <button
                type="button"
                onClick={() => { setHtmlMode((v) => !v); setPreview(false); }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  htmlMode
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Code2 size={11} />
                {htmlMode ? "HTML" : "Plain text"}
              </button>
            </div>
          </div>

          {htmlMode ? (
            preview ? (
              <div
                className="min-h-[200px] rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:text-navy-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: form.instructions }}
              />
            ) : (
              <div className="rounded-lg overflow-hidden border border-slate-200">
                <MonacoEditor
                  height={280}
                  language="html"
                  value={form.instructions}
                  onChange={(v) => setField("instructions", v ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "off",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 10, bottom: 10 },
                    folding: false,
                    glyphMargin: false,
                    lineDecorationsWidth: 8,
                    renderLineHighlight: "none",
                    overviewRulerLanes: 0,
                  }}
                />
              </div>
            )
          ) : (
            <textarea
              className="input-base h-40 resize-y"
              placeholder="Detailed instructions shown to students when they open the assignment…"
              value={form.instructions}
              onChange={(e) => setField("instructions", e.target.value)}
            />
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            {htmlMode
              ? "Write HTML. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;strong&gt;, etc."
              : "Switch to HTML mode for rich formatting."}
          </p>
        </div>
      </div>

      {/* Schedule */}
      <div className="card p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Schedule</p>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
          <input
            className="input-base max-w-xs"
            type="date"
            value={form.due_date}
            onChange={(e) => setField("due_date", e.target.value)}
          />
        </div>
      </div>

      <button onClick={onSave} disabled={saving} className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-60">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Changes
      </button>
    </div>
  );
}

// ── Build Tab ─────────────────────────────────────────────────────────────────

function BuildTab({ assignment, token, onMutate }: {
  assignment: Assignment;
  token: string;
  onMutate: () => void;
}) {
  const [sections, setSections] = useState<Section[]>(() =>
    (assignment.sections ?? []).map((s, i) => ({ ...s, sort_order: i }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSections((assignment.sections ?? []).map((s, i) => ({ ...s, sort_order: i })));
  }, [assignment.id]);

  function addSection() {
    const newSec: Section = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      points: 10,
      sort_order: sections.length,
    };
    setSections((prev) => [...prev, newSec]);
  }

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSection(idx: number, field: keyof Section, value: string | number) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy.map((s, i) => ({ ...s, sort_order: i }));
    });
  }

  async function saveSections() {
    setSaving(true);
    try {
      await api.patch(`/admin/assignments/${assignment.id}`, {
        sections: sections.map((s, i) => ({ ...s, sort_order: i })),
      }, token);
      toast.success("Sections saved");
      onMutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save sections");
    } finally {
      setSaving(false);
    }
  }

  const totalPoints = sections.reduce((s, sec) => s + (Number(sec.points) || 0), 0);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Define sections and allocate points. Max score is computed automatically from the total.
          </p>
          {sections.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {sections.length} section{sections.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-navy-700">{totalPoints} total pts</span>
            </p>
          )}
        </div>
        <button onClick={addSection} className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0">
          <Plus size={13} /> Add Section
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">No sections yet</p>
          <p className="text-xs text-slate-400 mt-1">Add sections to structure this assignment into gradeable parts.</p>
          <button onClick={addSection} className="btn-primary !py-2 !px-5 !text-xs mt-4">
            <Plus size={12} /> Add First Section
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sections.map((sec, idx) => (
              <div key={sec.id} className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-navy-100 text-navy-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    className="input-base flex-1 text-sm font-semibold"
                    placeholder="Section title…"
                    value={sec.title}
                    onChange={(e) => updateSection(idx, "title", e.target.value)}
                  />
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveSection(idx, -1)}
                      disabled={idx === 0}
                      className="btn-outline !py-1 !px-1.5 !text-xs disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => moveSection(idx, 1)}
                      disabled={idx === sections.length - 1}
                      className="btn-outline !py-1 !px-1.5 !text-xs disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      onClick={() => removeSection(idx)}
                      className="btn-outline !py-1 !px-1.5 !text-xs text-red-500 border-red-200 hover:bg-red-50"
                      title="Remove"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <textarea
                  className="input-base text-xs h-14 resize-none"
                  placeholder="Description or instructions for this section (optional)…"
                  value={sec.description}
                  onChange={(e) => updateSection(idx, "description", e.target.value)}
                />

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Points allocated:</label>
                  <input
                    className="input-base !w-24 text-sm text-center"
                    type="number"
                    min="0"
                    max="1000"
                    value={sec.points}
                    onChange={(e) => updateSection(idx, "points", parseInt(e.target.value) || 0)}
                  />
                  <span className="text-xs text-slate-400">pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-sm font-semibold text-navy-900">
              Total: <span className="text-gold-600">{totalPoints} pts</span>
            </p>
            <button onClick={saveSections} disabled={saving} className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Sections
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Submissions Tab ───────────────────────────────────────────────────────────

function SubmissionsTab({ assignment, token, onMutate }: {
  assignment: Assignment;
  token: string;
  onMutate: () => void;
}) {
  const { data: rawEntries, isLoading, mutate } = useSWR(
    token ? [`/admin/assignments/${assignment.id}/entries`, token] : null,
    ([url, t]) => api.get<any>(url, t)
  );

  const entries: any[] = (() => {
    const d = (rawEntries as any)?.data ?? rawEntries;
    return Array.isArray(d) ? d : [];
  })();

  async function releaseGrades() {
    if (!confirm("Release grades? Students will see their section scores and feedback.")) return;
    try {
      await api.post(`/admin/assignments/${assignment.id}/release-grades`, {}, token);
      toast.success("Grades released to students");
      onMutate();
    } catch {
      toast.error("Failed to release grades");
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Grades release banner */}
      <div className={cn(
        "card p-4 flex items-center justify-between gap-4",
        assignment.grades_released ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
      )}>
        <div className="flex items-center gap-2.5">
          {assignment.grades_released
            ? <Unlock size={16} className="text-emerald-600 flex-shrink-0" />
            : <Lock size={16} className="text-amber-600 flex-shrink-0" />}
          <div>
            <p className={cn("text-sm font-semibold", assignment.grades_released ? "text-emerald-800" : "text-amber-800")}>
              {assignment.grades_released ? "Grades are visible to students" : "Grades are hidden from students"}
            </p>
            <p className={cn("text-xs", assignment.grades_released ? "text-emerald-600" : "text-amber-600")}>
              {assignment.grades_released
                ? "Students can see their section scores and feedback."
                : "Grade all submissions first, then release when ready."}
            </p>
          </div>
        </div>
        {!assignment.grades_released && (
          <button
            onClick={releaseGrades}
            className="btn-primary !py-1.5 !px-4 !text-xs bg-amber-500 border-amber-500 hover:bg-amber-600 flex-shrink-0"
          >
            <Unlock size={12} /> Release Grades
          </button>
        )}
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">No submissions yet</p>
          <p className="text-xs text-slate-400 mt-1">Students who submit will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <EntryGradingCard
              key={entry.id}
              entry={entry}
              assignment={assignment}
              token={token}
              onMutate={mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entry Grading Card ────────────────────────────────────────────────────────

function EntryGradingCard({ entry, assignment, token, onMutate }: {
  entry: any;
  assignment: Assignment;
  token: string;
  onMutate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionGrades, setSectionGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState(entry.feedback ?? "");

  useEffect(() => {
    const init: Record<string, { grade: string; feedback: string }> = {};
    (entry.section_responses ?? []).forEach((r: any) => {
      init[r.section_id] = {
        grade:    r.grade != null ? String(r.grade) : "",
        feedback: r.feedback ?? "",
      };
    });
    setSectionGrades(init);
    setOverallFeedback(entry.feedback ?? "");
  }, [entry.id]);

  const name = entry.user?.profile
    ? `${entry.user.profile.first_name ?? ""} ${entry.user.profile.last_name ?? ""}`.trim() || entry.user.email
    : entry.user?.email ?? "Unknown";

  const totalGraded = Object.values(sectionGrades).reduce((sum, g) => sum + (parseFloat(g.grade) || 0), 0);

  async function saveGrades() {
    const sectionGradesList = assignment.sections.map((sec) => ({
      section_id: sec.id,
      grade: parseFloat(sectionGrades[sec.id]?.grade ?? "0") || 0,
      feedback: sectionGrades[sec.id]?.feedback || undefined,
    }));
    setSaving(true);
    try {
      await api.put(`/admin/assignments/${assignment.id}/entries/${entry.id}/grade`, {
        section_grades: sectionGradesList,
        overall_feedback: overallFeedback || undefined,
      }, token);
      toast.success("Grades saved");
      onMutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save grades");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-slate-50/60 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900">{name}</p>
          <p className="text-xs text-slate-400">{entry.user?.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {entry.grade != null ? (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {entry.grade}/{assignment.max_score} pts
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
          )}
          <span className="text-xs text-slate-400">
            {new Date(entry.submitted_at).toLocaleDateString("en-CA", { dateStyle: "medium" })}
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {assignment.sections.length === 0 ? (
            /* No sections — simple text response */
            <div className="p-4 space-y-3">
              {entry.text_content ? (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Response</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.text_content}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No text response submitted.</p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Feedback</label>
                <textarea
                  className="input-base text-sm h-16 resize-none"
                  placeholder="Feedback for the student…"
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                />
              </div>
              <button onClick={saveGrades} disabled={saving} className="btn-primary !py-1.5 !px-4 !text-xs">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Save
              </button>
            </div>
          ) : (
            /* Section-based grading */
            <div className="divide-y divide-slate-100">
              {assignment.sections.map((sec) => {
                const resp = (entry.section_responses ?? []).find((r: any) => r.section_id === sec.id);
                const g = sectionGrades[sec.id] ?? { grade: "", feedback: "" };

                return (
                  <div key={sec.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{sec.title}</p>
                        {sec.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0 flex items-center gap-1 mt-0.5">
                        <Star size={10} /> {sec.points} pts
                      </span>
                    </div>

                    {resp?.text_content ? (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{resp.text_content}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No response for this section.</p>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          className="input-base !w-20 text-center text-sm"
                          type="number"
                          min="0"
                          max={sec.points}
                          placeholder={`/${sec.points}`}
                          value={g.grade}
                          onChange={(e) => setSectionGrades((prev) => ({
                            ...prev,
                            [sec.id]: { ...prev[sec.id] ?? { feedback: "" }, grade: e.target.value },
                          }))}
                        />
                        <span className="text-xs text-slate-400">/ {sec.points}</span>
                      </div>
                      <input
                        className="input-base flex-1 text-xs"
                        placeholder="Section feedback (optional)…"
                        value={g.feedback}
                        onChange={(e) => setSectionGrades((prev) => ({
                          ...prev,
                          [sec.id]: { ...prev[sec.id] ?? { grade: "" }, feedback: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Overall feedback + save */}
              <div className="p-4 space-y-3 bg-slate-50/40">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Overall Feedback</label>
                  <textarea
                    className="input-base text-sm h-16 resize-none"
                    placeholder="General feedback for this student's submission…"
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy-900">
                    Total:{" "}
                    <span className="text-gold-600">{totalGraded}</span>
                    <span className="text-slate-400"> / {assignment.max_score} pts</span>
                  </p>
                  <button onClick={saveGrades} disabled={saving} className="btn-primary !py-1.5 !px-5 !text-xs">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Save Grades
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

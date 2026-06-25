"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Loader2, Save, Plus, Trash2, X, Check,
  BookOpen, Users, Settings, ChevronLeft, AlertCircle, RefreshCw,
  Globe, Archive, ArchiveRestore, UserPlus, UserMinus,
  DollarSign, Clock, Layers, Eye, EyeOff,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STATUSES = ["draft", "active", "archived"] as const;

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  price: number;
  status: string;
  level: string;
  duration_hours: number;
  certification_id?: string;
  cert_acronym?: string;
  cert_title?: string;
  module_count: number;
  enrollment_count: number;
  is_featured?: boolean;
  instructors?: { user_id: string; is_lead: boolean; first_name: string; last_name: string }[];
  content?: CourseContent;
};

type Tab = "overview" | "instructors" | "content";

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

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.accessToken)!;
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);

  const { data: courseRaw, isLoading, error, mutate } = useSWR(
    token && courseId ? [`/admin/courses/${courseId}`, token] : null,
    ([url, t]) => api.get<any>(url, t)
  );

  const { data: certsRaw } = useSWR(
    token ? ["/admin/certifications", token] : null,
    ([url, t]) => api.get<any>(url, t)
  );

  const { data: usersRaw } = useSWR(
    token ? ["/users?limit=200", token] : null,
    ([url, t]) => api.get<any>(url, t)
  );

  const course: Course = (() => {
    const d = (courseRaw as any)?.data ?? courseRaw;
    return d || {};
  })();

  const certs: any[] = (() => {
    const d = (certsRaw as any)?.data ?? certsRaw;
    return Array.isArray(d) ? d : [];
  })();

  const users: any[] = (() => {
    const d = (usersRaw as any)?.data?.data ?? (usersRaw as any)?.data ?? usersRaw;
    return Array.isArray(d) ? d : [];
  })();

  const professors = users.filter(
    (u: any) => u.role === "professor" || u.role === "admin" || u.role === "super_admin"
  );

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    price: "0",
    level: "beginner" as typeof LEVELS[number],
    status: "draft" as typeof STATUSES[number],
    duration_hours: "0",
    certification_id: "",
    is_featured: false,
  });

  const [contentForm, setContentForm] = useState<CourseContent>({
    overview_headline: "",
    overview_body: "",
    learning_outcomes: [],
    how_it_works_headline: "",
    how_it_works_steps: [],
    training_exam_prep_headline: "",
    training_exam_prep_body: "",
    training_exam_prep_items: [],
    related_course_slugs: [],
  });

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [savingContent, setSavingContent] = useState(false);
  const [recommendedCertIds, setRecommendedCertIds] = useState<string[]>([]);
  const [savingRecs, setSavingRecs] = useState(false);

  useEffect(() => {
    if (course.id) {
      setForm({
        title: course.title || "",
        subtitle: course.subtitle || "",
        description: course.description || "",
        price: String(course.price ?? 0),
        level: (course.level as typeof LEVELS[number]) || "beginner",
        status: (course.status as typeof STATUSES[number]) || "draft",
        duration_hours: String(course.duration_hours ?? 0),
        certification_id: course.certification_id || "",
        is_featured: course.is_featured ?? false,
      });

      setRecommendedCertIds((course as any).recommended_cert_ids ?? []);

      if (course.content) {
        setContentForm({
          overview_headline: course.content.overview_headline || "",
          overview_body: course.content.overview_body || "",
          learning_outcomes: course.content.learning_outcomes || [],
          how_it_works_headline: course.content.how_it_works_headline || "",
          how_it_works_steps: course.content.how_it_works_steps || [],
          training_exam_prep_headline: course.content.training_exam_prep_headline || "",
          training_exam_prep_body: course.content.training_exam_prep_body || "",
          training_exam_prep_items: course.content.training_exam_prep_items || [],
          related_course_slugs: course.content.related_course_slugs || [],
        });
      }
    }
  }, [course.id]);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/courses/${courseId}`, {
        title: form.title,
        subtitle: form.subtitle || undefined,
        description: form.description || undefined,
        price: parseFloat(form.price) || 0,
        level: form.level,
        status: form.status,
        duration_hours: parseFloat(form.duration_hours) || 0,
        certification_id: form.certification_id || null,
        is_featured: form.is_featured,
      }, token);
      toast.success("Course updated!");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update course");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    const next = course.status === "active" ? "archived" : "active";
    await toast.promise(
      api.patch(`/admin/courses/${courseId}`, { status: next }, token).then(mutate),
      { loading: "Updating…", success: "Updated", error: "Failed" }
    );
  }

  async function deleteCourse() {
    if (!confirm(`Delete course "${course.title}"? This cannot be undone.`)) return;
    await toast.promise(
      api.delete(`/admin/courses/${courseId}`, token).then(() => router.push("/courses?tab=manage")),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  async function assignInstructor(userId: string, isLead: boolean) {
    await toast.promise(
      api.post(`/admin/courses/${courseId}/teachers`, { user_id: userId, is_lead: isLead }, token)
        .then(() => { setAssigningId(null); mutate(); }),
      { loading: "Assigning…", success: "Assigned", error: "Failed" }
    );
  }

  async function removeInstructor(userId: string) {
    await toast.promise(
      api.delete(`/admin/courses/${courseId}/teachers/${userId}`, token).then(mutate),
      { loading: "Removing…", success: "Removed", error: "Failed" }
    );
  }

  async function handleSaveRecommendations() {
    setSavingRecs(true);
    try {
      await api.put(`/admin/courses/${courseId}/recommendations`, { certification_ids: recommendedCertIds }, token);
      toast.success("Recommendations saved!");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save recommendations");
    } finally {
      setSavingRecs(false);
    }
  }

  async function handleSaveContent(e: React.FormEvent) {
    e.preventDefault();
    setSavingContent(true);
    try {
      await api.patch(`/admin/courses/${courseId}`, { content: contentForm }, token);
      toast.success("Course content updated!");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update content");
    } finally {
      setSavingContent(false);
    }
  }

  function addLearningOutcome() {
    setContentForm((f) => ({
      ...f,
      learning_outcomes: [...(f.learning_outcomes || []), ""],
    }));
  }

  function removeLearningOutcome(idx: number) {
    setContentForm((f) => ({
      ...f,
      learning_outcomes: (f.learning_outcomes || []).filter((_, i) => i !== idx),
    }));
  }

  function updateLearningOutcome(idx: number, value: string) {
    setContentForm((f) => ({
      ...f,
      learning_outcomes: (f.learning_outcomes || []).map((item, i) => (i === idx ? value : item)),
    }));
  }

  function addStep() {
    setContentForm((f) => ({
      ...f,
      how_it_works_steps: [...(f.how_it_works_steps || []), { title: "", description: "" }],
    }));
  }

  function removeStep(idx: number) {
    setContentForm((f) => ({
      ...f,
      how_it_works_steps: (f.how_it_works_steps || []).filter((_, i) => i !== idx),
    }));
  }

  function updateStep(idx: number, field: "title" | "description", value: string) {
    setContentForm((f) => ({
      ...f,
      how_it_works_steps: (f.how_it_works_steps || []).map((step, i) =>
        i === idx ? { ...step, [field]: value } : step
      ),
    }));
  }

  function addPrepItem() {
    setContentForm((f) => ({
      ...f,
      training_exam_prep_items: [...(f.training_exam_prep_items || []), ""],
    }));
  }

  function removePrepItem(idx: number) {
    setContentForm((f) => ({
      ...f,
      training_exam_prep_items: (f.training_exam_prep_items || []).filter((_, i) => i !== idx),
    }));
  }

  function updatePrepItem(idx: number, value: string) {
    setContentForm((f) => ({
      ...f,
      training_exam_prep_items: (f.training_exam_prep_items || []).map((item, i) => (i === idx ? value : item)),
    }));
  }

  function setContentField(k: string, v: string) {
    setContentForm((f) => ({ ...f, [k]: v }));
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading course…</p>
        </div>
      </div>
    );
  }

  if (error || !course.id) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Course not found</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">The course you're looking for doesn't exist.</p>
          <Link href="/courses?tab=manage" className="btn-outline !py-1.5 !px-4 !text-xs mx-auto inline-block">
            <ChevronLeft size={12} /> Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const instructors = course.instructors ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/courses?tab=manage"
            className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2"
          >
            <ChevronLeft size={12} /> Back to Courses
          </Link>
          <h1 className="text-2xl font-display font-black text-navy-900">{course.title}</h1>
          <p className="text-slate-500 text-sm mt-1">/{course.slug}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={toggleStatus}
            className={cn(
              "btn-outline !py-2 !px-3 !text-xs",
              course.status === "active"
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            )}
            title={course.status === "active" ? "Archive" : "Activate"}
          >
            {course.status === "active" ? <Archive size={13} /> : <Globe size={13} />}
          </button>
          <button
            onClick={deleteCourse}
            className="btn-outline !py-2 !px-3 !text-xs text-red-500 border-red-200 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "overview"
              ? "border-gold-500 text-gold-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "content"
              ? "border-gold-500 text-gold-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <BookOpen size={13} /> Content
        </button>
        <Link
          href={`/courses/${courseId}/builder`}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            "border-transparent text-slate-500 hover:text-slate-700 hover:border-gold-300"
          )}
          title="Open course builder in new view"
        >
          <Layers size={13} /> Build
        </Link>
        <button
          onClick={() => setActiveTab("instructors")}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "instructors"
              ? "border-gold-500 text-gold-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Users size={13} /> Instructors ({instructors.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Identity Section */}
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Identity</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className="input-base"
                placeholder="AI Fundamentals for Professionals"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subtitle</label>
              <input
                className="input-base"
                placeholder="Short tagline for the course card"
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level</label>
                <select className="input-base" value={form.level} onChange={(e) => setField("level", e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select className="input-base" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-700">Featured on homepage</p>
                <p className="text-[11px] text-slate-400">Show this course in the Courses section of the marketing site</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_featured: !f.is_featured }))}
                className={cn(
                  "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none",
                  form.is_featured ? "bg-navy-700" : "bg-slate-300"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                  form.is_featured ? "translate-x-4" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Content</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                className="input-base h-24 resize-none"
                placeholder="What students will learn in this course…"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
            {certs.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Linked Certification <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  className="input-base"
                  value={form.certification_id}
                  onChange={(e) => setField("certification_id", e.target.value)}
                >
                  <option value="">— None —</option>
                  {certs.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Related Certifications (shown when not directly linked to a cert) */}
          {!form.certification_id && certs.length > 0 && (
            <div className="card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Related Certifications</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This course appears as "Recommended" on student dashboards for the selected certifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRecommendations}
                  disabled={savingRecs}
                  className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  {savingRecs ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
              </div>
              <div className="space-y-2">
                {certs.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={recommendedCertIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRecommendedCertIds((prev) => [...prev, c.id]);
                        } else {
                          setRecommendedCertIds((prev) => prev.filter((id) => id !== c.id));
                        }
                      }}
                      className="rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="font-semibold text-navy-800">{c.acronym}</span>
                      {" — "}
                      {c.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Settings Section */}
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Settings</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (USD)</label>
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="99.00"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration (hours)</label>
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="8"
                  value={form.duration_hours}
                  onChange={(e) => setField("duration_hours", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Modules</label>
                <div className="input-base flex items-center gap-2 text-slate-600">
                  <Layers size={13} />
                  <span className="text-sm font-medium">{course.module_count || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Section */}
          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Meta</p>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              {course.enrollment_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{course.enrollment_count} enrolled</span>
                </div>
              )}
              {course.cert_acronym && (
                <div className="flex items-center gap-1 text-gold-600 font-medium">
                  <span>→ {course.cert_acronym}</span>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
            </button>
            <Link href="/courses?tab=manage" className="btn-outline !py-2.5 !px-6 !text-sm">
              Cancel
            </Link>
          </div>
        </form>
      )}

      {/* Content Tab */}
      {activeTab === "content" && (
        <form onSubmit={handleSaveContent} className="space-y-6">
          {/* Overview Section */}
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Overview</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Headline</label>
              <input
                className="input-base"
                placeholder="What is this course about?"
                value={contentForm.overview_headline || ""}
                onChange={(e) => setContentField("overview_headline", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Body</label>
              <textarea
                className="input-base h-24 resize-none"
                placeholder="Detailed overview of the course…"
                value={contentForm.overview_body || ""}
                onChange={(e) => setContentField("overview_body", e.target.value)}
              />
            </div>
          </div>

          {/* What You'll Learn Section */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">What You'll Learn</p>
              <button
                type="button"
                onClick={addLearningOutcome}
                className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {(contentForm.learning_outcomes || []).length === 0 ? (
              <p className="text-xs text-slate-400">No learning outcomes yet.</p>
            ) : (
              <div className="space-y-2">
                {(contentForm.learning_outcomes || []).map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <input
                      className="input-base text-sm flex-1"
                      placeholder="e.g., Understand core AI concepts"
                      value={outcome}
                      onChange={(e) => updateLearningOutcome(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeLearningOutcome(idx)}
                      className="text-red-500 hover:text-red-700 mt-1.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How It Works Section */}
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-2">How It Works</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Headline</label>
              <input
                className="input-base"
                placeholder="How the course is structured"
                value={contentForm.how_it_works_headline || ""}
                onChange={(e) => setContentField("how_it_works_headline", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">Steps</label>
              <button
                type="button"
                onClick={addStep}
                className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"
              >
                <Plus size={12} /> Add Step
              </button>
            </div>
            {(contentForm.how_it_works_steps || []).length === 0 ? (
              <p className="text-xs text-slate-400">No steps yet.</p>
            ) : (
              <div className="space-y-3">
                {(contentForm.how_it_works_steps || []).map((step, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Step {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-red-500 hover:text-red-700 ml-auto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      className="input-base text-sm"
                      placeholder="Step title"
                      value={step.title}
                      onChange={(e) => updateStep(idx, "title", e.target.value)}
                    />
                    <textarea
                      className="input-base text-sm h-16 resize-none"
                      placeholder="Step description"
                      value={step.description}
                      onChange={(e) => updateStep(idx, "description", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Training & Exam Prep Section */}
          <div className="card p-6 space-y-5">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-2">Training & Exam Prep</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Headline</label>
              <input
                className="input-base"
                placeholder="Training and exam preparation details"
                value={contentForm.training_exam_prep_headline || ""}
                onChange={(e) => setContentField("training_exam_prep_headline", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Body</label>
              <textarea
                className="input-base h-20 resize-none"
                placeholder="Details about training and exam prep…"
                value={contentForm.training_exam_prep_body || ""}
                onChange={(e) => setContentField("training_exam_prep_body", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">Includes</label>
              <button
                type="button"
                onClick={addPrepItem}
                className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>
            {(contentForm.training_exam_prep_items || []).length === 0 ? (
              <p className="text-xs text-slate-400">No items yet.</p>
            ) : (
              <div className="space-y-2">
                {(contentForm.training_exam_prep_items || []).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <input
                      className="input-base text-sm flex-1"
                      placeholder="e.g., Practice exams, Study guides"
                      value={item}
                      onChange={(e) => updatePrepItem(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removePrepItem(idx)}
                      className="text-red-500 hover:text-red-700 mt-1.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* You May Also Like Section */}
          <div className="card p-6 space-y-5">
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-widest mb-1">You May Also Like</label>
            <p className="text-xs text-slate-500 mb-3">Enter course slugs separated by commas (e.g., ai-101, prompt-engineering)</p>
            <input
              className="input-base"
              placeholder="course-slug-1, course-slug-2"
              value={(contentForm.related_course_slugs || []).join(", ")}
              onChange={(e) => {
                const slugs = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0);
                setContentForm((f) => ({ ...f, related_course_slugs: slugs }));
              }}
            />
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={savingContent}
              className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60"
            >
              {savingContent ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="btn-outline !py-2.5 !px-6 !text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Instructors Tab */}
      {activeTab === "instructors" && (
        <div className="space-y-4">
          {/* Current Instructors */}
          <div className="card p-6">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">Assigned Instructors</p>
            {instructors.length === 0 ? (
              <p className="text-xs text-slate-400">No instructors assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {instructors.map((ins) => (
                  <div key={ins.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-[10px] font-bold text-navy-600">
                        {(ins.first_name?.charAt(0) || "") + (ins.last_name?.charAt(0) || "")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {ins.first_name} {ins.last_name}
                          {ins.is_lead && <span className="text-gold-600 font-bold ml-1">★ Lead</span>}
                        </p>
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
                ))}
              </div>
            )}
          </div>

          {/* Assign Instructor */}
          <div className="card p-6">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">Assign Instructor</p>
            <div className="space-y-3">
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
                    <React.Fragment key={p.id}>
                      <option value={`${p.id}|0`}>
                        {p.profile?.first_name} {p.profile?.last_name} ({p.role})
                      </option>
                      <option value={`${p.id}|1`}>
                        {p.profile?.first_name} {p.profile?.last_name} ({p.role}) ★ Lead
                      </option>
                    </React.Fragment>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import React from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  BookOpen, Plus, PlusCircle, Loader2, AlertCircle, RefreshCw,
  Users, Layers, Edit3, Archive, Globe, Trash2, DollarSign, Clock, ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STATUSES = ["draft", "active", "archived"] as const;

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-blue-50 text-blue-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced: "bg-purple-50 text-purple-700",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  active: "bg-emerald-50 text-emerald-700",
  archived: "bg-red-50 text-red-700",
};

type Course = {
  id: string; slug: string; title: string; subtitle?: string;
  description?: string; price: number; status: string; level: string;
  duration_hours: number; module_count: number; enrollment_count: number;
  certification_id?: string; cert_acronym?: string; cert_title?: string;
  is_featured: boolean;
  instructors?: { user_id: string; is_lead: boolean; first_name: string; last_name: string }[];
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fetcher(url: string, token: string) {
  return api.get<any>(url, token);
}

export default function AdminCoursesPage() {
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.accessToken)!;
  const activeTab = (searchParams.get("tab") as "manage" | "enrollments") || "manage";

  const { data: coursesRaw, mutate, isLoading, error } = useSWR(
    token ? ["/admin/courses", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: certsRaw } = useSWR(
    token ? ["/admin/certifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: usersRaw } = useSWR(
    token ? ["/users?limit=200", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const courses: Course[] = (() => {
    const d = (coursesRaw as any)?.data ?? coursesRaw;
    return Array.isArray(d) ? d : [];
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

  // ── Create form state ─────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", slug: "", subtitle: "", description: "",
    price: "0", level: "beginner" as typeof LEVELS[number],
    status: "draft" as typeof STATUSES[number],
    duration_hours: "0", certification_id: "",
  });

  function setField(k: string, v: string) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "title" && f.slug === slugify(f.title)) {
        next.slug = slugify(v);
      }
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/courses", {
        title: form.title,
        slug: form.slug,
        subtitle: form.subtitle || undefined,
        description: form.description || undefined,
        price: parseFloat(form.price) || 0,
        level: form.level,
        status: form.status,
        duration_hours: parseFloat(form.duration_hours) || 0,
        certification_id: form.certification_id || undefined,
      }, token);
      toast.success("Course created!");
      mutate();
      setCreateOpen(false);
      setForm({ title: "", slug: "", subtitle: "", description: "", price: "0", level: "beginner", status: "draft", duration_hours: "0", certification_id: "" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create course");
    } finally {
      setSaving(false);
    }
  }


  async function toggleStatus(course: Course) {
    const next = course.status === "active" ? "archived" : "active";
    await toast.promise(
      api.patch(`/admin/courses/${course.id}`, { status: next }, token).then(mutate),
      { loading: "Updating…", success: "Updated", error: "Failed" }
    );
  }

  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);

  async function toggleFeatured(course: Course) {
    setTogglingFeatured(course.id);
    try {
      await api.patch(`/admin/courses/${course.id}`, { is_featured: !course.is_featured }, token);
      mutate();
      toast.success(course.is_featured ? "Removed from homepage" : "Added to homepage");
    } catch {
      toast.error("Failed to update");
    } finally {
      setTogglingFeatured(null);
    }
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Delete course "${course.title}"? This cannot be undone.`)) return;
    await toast.promise(
      api.delete(`/admin/courses/${course.id}`, token).then(mutate),
      { loading: "Deleting…", success: "Deleted", error: "Failed" }
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">
            {activeTab === "manage" ? "Manage Courses" : "Enrollments"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeTab === "manage"
              ? "Create and manage prep courses."
              : "Track student course enrollments and progress."}
          </p>
        </div>
        {activeTab === "manage" && (
          <button
            onClick={() => setCreateOpen((v) => !v)}
            className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0"
          >
            <PlusCircle size={13} /> New Course
          </button>
        )}
      </div>

      {activeTab === "manage" ? (
        /* ── MANAGE COURSES VIEW ─────────────────────────────────── */
        <>
      {/* ── Create form ─────────────────────────────────────────── */}
      {createOpen && (
        <div className="card p-6 mb-6 border-navy-200 bg-navy-50/30 space-y-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">New Prep Course</p>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-base font-mono text-sm"
                  placeholder="ai-fundamentals"
                  value={form.slug}
                  onChange={(e) => setField("slug", slugify(e.target.value))}
                  required
                />
              </div>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                className="input-base h-20 resize-none"
                placeholder="What students will learn in this course…"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (USD)</label>
                <input
                  className="input-base"
                  type="number" min="0" step="0.01" placeholder="99.00"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration (hrs)</label>
                <input
                  className="input-base"
                  type="number" min="0" step="0.5" placeholder="8"
                  value={form.duration_hours}
                  onChange={(e) => setField("duration_hours", e.target.value)}
                />
              </div>
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

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create Course
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Course list ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading courses…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Could not reach the backend</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">Make sure the API server is running.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">No prep courses yet</p>
          <p className="text-slate-400 text-xs mt-1">Create the first course to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              certs={certs}
              professors={professors}
              token={token}
              onToggleStatus={() => toggleStatus(course)}
              onToggleFeatured={() => toggleFeatured(course)}
              togglingFeatured={togglingFeatured === course.id}
              onDelete={() => deleteCourse(course)}
              onMutate={mutate}
            />
          ))}
        </div>
      )}
        </>
      ) : (
        /* ── ENROLLMENTS TAB ────────────────────────────────────── */
        <EnrollmentsTab token={token} courses={courses} />
      )}
    </div>
  );
}

function EnrollmentsTab({ token, courses }: { token: string; courses: Course[] }) {
  const { data: enrollmentsRaw, isLoading, error, mutate } = useSWR(
    token ? ["/admin/courses/enrollments", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { shouldRetryOnError: true, errorRetryInterval: 3000 }
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const enrollments: any[] = (() => {
    const d = (enrollmentsRaw as any)?.data ?? enrollmentsRaw;
    return Array.isArray(d) ? d : [];
  })();

  async function handleDelete(enrollment: any) {
    const courseName = courses.find((c) => c.id === enrollment.course_id)?.title ?? "this course";
    const studentName = `${enrollment.first_name ?? ""} ${enrollment.last_name ?? ""}`.trim() || enrollment.email;
    if (!confirm(`Delete ${studentName}'s enrollment in "${courseName}"? This cannot be undone.`)) return;
    setDeletingId(enrollment.id);
    try {
      await api.delete(`/admin/courses/enrollments/${enrollment.id}`, token);
      toast.success("Enrollment deleted");
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete enrollment");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading enrollments…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Could not load enrollments</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">Make sure the API server is running.</p>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">No enrollments yet</p>
          <p className="text-slate-400 text-xs mt-1">Students will appear here when they enroll in courses.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Enrolled</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {enrollments.map((enrollment) => {
                  const course = courses.find((c) => c.id === enrollment.course_id);
                  const status = enrollment.completed_at ? "Completed" : "Active";
                  const statusColor = enrollment.completed_at ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
                  const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString();

                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{enrollment.first_name} {enrollment.last_name}</p>
                          <p className="text-xs text-slate-500">{enrollment.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{course?.title || "Unknown Course"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusColor)}>
                          {status}
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
                      <td className="px-4 py-3 text-xs text-slate-500">{enrolledDate}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled={deletingId === enrollment.id}
                          onClick={() => handleDelete(enrollment)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40"
                          title="Delete enrollment"
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
      )}
    </div>
  );
}

function CourseCard({
  course, certs, professors, token,
  onToggleStatus, onToggleFeatured, togglingFeatured, onDelete, onMutate,
}: {
  course: Course;
  certs: any[];
  professors: any[];
  token: string;
  onToggleStatus: () => void;
  onToggleFeatured: () => void;
  togglingFeatured: boolean;
  onDelete: () => void;
  onMutate: () => void;
}) {

  const instructors = course.instructors ?? [];

  return (
    <div className={cn("card overflow-hidden", course.status === "archived" && "opacity-60")}>
      {/* ── Course card row ─────────────────────────────────────── */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-navy-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-navy-900 text-sm">{course.title}</span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", LEVEL_COLORS[course.level] ?? "bg-slate-50 text-slate-500")}>
              {course.level}
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500")}>
              {course.status}
            </span>
            {course.is_featured && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200">
                Featured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
            <span className="font-mono text-[10px]">/{course.slug}</span>
            {course.cert_acronym && (
              <span className="text-gold-600 font-medium">→ {course.cert_acronym}</span>
            )}
            <span className="flex items-center gap-1"><DollarSign size={10} />${Number(course.price).toFixed(0)}</span>
            {course.duration_hours > 0 && (
              <span className="flex items-center gap-1"><Clock size={10} />{course.duration_hours}h</span>
            )}
            <span className="flex items-center gap-1"><Layers size={10} />{course.module_count} modules</span>
            <span className="flex items-center gap-1"><Users size={10} />{course.enrollment_count} enrolled</span>
          </div>
          {instructors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {instructors.map((ins) => (
                <span key={ins.user_id} className="text-[10px] bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">
                  {ins.first_name} {ins.last_name}{ins.is_lead ? " ★" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggleFeatured}
            disabled={togglingFeatured || course.status !== "active"}
            title={course.status !== "active" ? "Only active courses can be featured" : course.is_featured ? "Remove from homepage" : "Feature on homepage"}
            className={cn(
              "btn-outline !py-1.5 !px-3 !text-xs transition-colors disabled:opacity-50",
              course.is_featured
                ? "text-teal-700 border-teal-300 bg-teal-50 hover:bg-teal-100"
                : "text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50"
            )}
          >
            {togglingFeatured
              ? <Loader2 size={11} className="animate-spin" />
              : <Globe size={11} />}
            {course.is_featured ? "Featured" : "Feature"}
          </button>
          <a
            href={`${process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}/courses/${course.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline !py-1.5 !px-2.5 !text-xs"
            title="View on site"
          >
            <ExternalLink size={12} />
          </a>
          <Link
            href={`/courses/${course.id}`}
            className="btn-outline !py-1.5 !px-2.5 !text-xs"
            title="Edit"
          >
            <Edit3 size={12} />
          </Link>
          <button
            onClick={onToggleStatus}
            className={cn(
              "btn-outline !py-1.5 !px-2.5 !text-xs",
              course.status === "active"
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            )}
            title={course.status === "active" ? "Archive" : "Activate"}
          >
            {course.status === "active" ? <Archive size={12} /> : <Globe size={12} />}
          </button>
          <button
            onClick={onDelete}
            className="btn-outline !py-1.5 !px-2.5 !text-xs text-red-500 border-red-200 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

    </div>
  );
}

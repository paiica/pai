"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Loader2, BookOpen, Lock, Globe, Search, Download, ExternalLink, ChevronLeft, ChevronRight, Plus, Hammer, Users2, UsersRound, X, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import type { InstitutionCourse, InstitutionPerson, Paginated } from "@/types";

const APPROVAL_LABEL: Record<string, string> = {
  none: "Not submitted", pending: "Pending review", approved: "Approved", rejected: "Rejected",
};
const LIMIT = 20;
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

interface Term { id: string; name: string; }
interface Cohort { id: string; name: string; _count: { memberships: number }; }

function instructorName(i: { user: { email: string; profile: { first_name: string | null; last_name: string | null } | null } }) {
  return i.user.profile?.first_name ? `${i.user.profile.first_name} ${i.user.profile.last_name ?? ""}`.trim() : i.user.email;
}

export default function CoursesPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [managingInstructors, setManagingInstructors] = useState<InstitutionCourse | null>(null);
  const [enrollingCohort, setEnrollingCohort] = useState<InstitutionCourse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, mutate } = useSWR(
    accessToken && currentInstitutionId
      ? [`/institutions/${currentInstitutionId}/courses?page=${page}&limit=${LIMIT}${search ? `&search=${encodeURIComponent(search)}` : ""}`, accessToken]
      : null,
    ([url, token]) => api.get<Paginated<InstitutionCourse>>(url, token),
  );
  const courses = data?.data ?? [];
  const pages = data?.pages ?? 1;

  const { data: professorsRaw } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/professors?limit=200`, accessToken] : null,
    ([url, token]) => api.get<Paginated<InstitutionPerson>>(url, token),
  );
  const professors = (professorsRaw?.data ?? []).filter((p) => p.role === "professor" && p.status === "active");

  const { data: termsRaw } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/terms`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token).then((r) => r.data ?? r),
  );
  const terms: Term[] = Array.isArray(termsRaw) ? termsRaw : [];
  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function changeTerm(courseId: string, termId: string) {
    setSavingTerm(courseId);
    try {
      await api.patch(`/institution-courses/${courseId}`, { term_id: termId || null }, accessToken!);
      toast.success("Term updated");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update term");
    } finally { setSavingTerm(null); }
  }

  async function deleteCourse(courseId: string) {
    if (!confirm("Delete this course? This can't be undone.")) return;
    setDeleting(courseId);
    try {
      await api.delete(`/institution-courses/${courseId}`, accessToken!);
      toast.success("Course deleted");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete course");
    } finally { setDeleting(null); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadFile(
        `/institutions/${currentInstitutionId}/courses/export${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        accessToken!, `courses-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch {
      toast.error("Export failed");
    } finally { setExporting(false); }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-slate-500 text-sm">Every course attributed to your institution — private (institution-only) and public</p>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-60">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export CSV
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary !py-2 !px-3 !text-xs flex items-center gap-1.5">
            <Plus size={12} /> Create Course
          </button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" className="input-base !pl-9 text-sm" />
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
      ) : courses.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{search ? "No matches" : "No courses yet"}</p>
          {!search && <p className="text-slate-400 text-sm mt-1">Create one, or your professors can create courses from the professors app.</p>}
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Course</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Instructors</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Visibility</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Term</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Enrollments</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-navy-900">{c.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.instructors.length > 0 ? c.instructors.map(instructorName).join(", ") : (c.creator?.email ?? "—")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      {c.visibility === "private" ? <Lock size={12} /> : <Globe size={12} />}
                      {c.visibility}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {terms.length === 0 ? (c.term?.name ?? "—") : (
                      <select
                        value={c.term?.id ?? ""}
                        disabled={savingTerm === c.id}
                        onChange={(e) => changeTerm(c.id, e.target.value)}
                        className="input-base !py-1 !text-xs !w-auto"
                      >
                        <option value="">No term</option>
                        {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.visibility === "public" ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {APPROVAL_LABEL[c.approval_status]}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c._count.enrollments}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2.5">
                      {c.visibility === "public" && c.approval_status === "approved" && (
                        <a href={`${MARKETING_URL}/courses/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-navy-600 transition-colors" title="View public page">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => setEnrollingCohort(c)} className="text-slate-300 hover:text-navy-600 transition-colors" title="Enroll a cohort">
                        <UsersRound size={14} />
                      </button>
                      <button onClick={() => setManagingInstructors(c)} className="text-slate-300 hover:text-navy-600 transition-colors" title="Manage instructors">
                        <Users2 size={14} />
                      </button>
                      <Link href={`/courses/${c.id}/builder`} className="text-slate-300 hover:text-navy-600 transition-colors" title="Open builder">
                        <Hammer size={14} />
                      </Link>
                      <button onClick={() => deleteCourse(c.id)} disabled={deleting === c.id} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete course">
                        {deleting === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline !p-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-outline !p-2 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      )}

      {showCreate && (
        <CreateCourseModal
          institutionId={currentInstitutionId!}
          token={accessToken!}
          professors={professors}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); mutate(); }}
        />
      )}
      {managingInstructors && (
        <ManageInstructorsModal
          course={managingInstructors}
          institutionId={currentInstitutionId!}
          token={accessToken!}
          professors={professors}
          onClose={() => setManagingInstructors(null)}
          onChanged={() => mutate()}
        />
      )}
      {enrollingCohort && (
        <EnrollCohortModal
          course={enrollingCohort}
          institutionId={currentInstitutionId!}
          token={accessToken!}
          onClose={() => setEnrollingCohort(null)}
        />
      )}
    </div>
  );
}

function CreateCourseModal({ institutionId, token, professors, onClose, onCreated }: {
  institutionId: string; token: string; professors: InstitutionPerson[]; onClose: () => void; onCreated: () => void;
}) {
  const { data: termsRaw } = useSWR([`/institutions/${institutionId}/terms`, token], ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r));
  const terms: Term[] = Array.isArray(termsRaw) ? termsRaw : [];

  const [form, setForm] = useState({
    title: "", description: "", price: "0", level: "beginner", visibility: "private" as "private" | "public",
    term_id: "", instructor_user_id: "",
  });
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.instructor_user_id) { toast.error("Choose an instructor"); return; }
    setSaving(true);
    try {
      await api.post("/institution-courses", {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price) || 0,
        level: form.level,
        institution_id: institutionId,
        visibility: form.visibility,
        term_id: form.term_id || undefined,
        instructor_user_id: form.instructor_user_id,
      }, token);
      toast.success("Course created");
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create course");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-display font-black text-navy-900 text-lg">Create Course</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Title</label>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="input-base text-sm" placeholder="Introduction to Machine Learning" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="input-base text-sm" rows={3} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Instructor</label>
            {professors.length === 0 ? (
              <p className="text-xs text-amber-600">Invite a professor first — a course needs an assigned instructor.</p>
            ) : (
              <select value={form.instructor_user_id} onChange={(e) => setForm((p) => ({ ...p, instructor_user_id: e.target.value }))} className="input-base text-sm">
                <option value="">Select a professor…</option>
                {professors.map((p) => <option key={p.user_id} value={p.user_id}>{p.first_name ? `${p.first_name} ${p.last_name ?? ""}` : p.email}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Price (USD)</label>
              <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="input-base text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Level</label>
              <select value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} className="input-base text-sm">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Visibility</label>
              <select value={form.visibility} onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as "private" | "public" }))} className="input-base text-sm">
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
          {terms.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Term (optional)</label>
              <select value={form.term_id} onChange={(e) => setForm((p) => ({ ...p, term_id: e.target.value }))} className="input-base text-sm">
                <option value="">No term</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            {form.visibility === "private"
              ? "Private courses are immediately available to your institution's students — no PAII review needed."
              : "Public courses go through PAII's normal approval review before appearing in the marketplace."}
          </p>
          <button onClick={create} disabled={saving || professors.length === 0} className="btn-primary !py-2 !px-4 !text-xs w-full justify-center disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create Course
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageInstructorsModal({ course, institutionId, token, professors, onClose, onChanged }: {
  course: InstitutionCourse; institutionId: string; token: string; professors: InstitutionPerson[]; onClose: () => void; onChanged: () => void;
}) {
  const [instructors, setInstructors] = useState(course.instructors);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  const available = professors.filter((p) => !instructors.some((i) => i.user_id === p.user_id));

  async function add() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/institution-courses/${course.id}/instructors`, { user_id: selected }, token);
      const p = professors.find((p) => p.user_id === selected)!;
      setInstructors((prev) => [...prev, { user_id: p.user_id, is_lead: false, user: { email: p.email, profile: { first_name: p.first_name, last_name: p.last_name } } }]);
      setSelected("");
      toast.success("Instructor added");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add instructor");
    } finally { setBusy(false); }
  }

  async function remove(userId: string) {
    if (instructors.length <= 1) { toast.error("A course must have at least one instructor"); return; }
    setBusy(true);
    try {
      await api.delete(`/institution-courses/${course.id}/instructors/${userId}`, token);
      setInstructors((prev) => prev.filter((i) => i.user_id !== userId));
      toast.success("Instructor removed");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove instructor");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-display font-black text-navy-900 text-lg">{course.title}</h3>
            <p className="text-sm text-slate-500">Manage instructors</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl mb-4">
          {instructors.map((i) => (
            <div key={i.user_id} className="px-3 py-2.5 flex items-center justify-between text-sm">
              <span className="text-navy-900">{instructorName(i)} {i.is_lead && <span className="text-[10px] font-bold uppercase text-teal-600 ml-1">Lead</span>}</span>
              <button onClick={() => remove(i.user_id)} disabled={busy} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>

        {available.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input-base text-sm flex-1">
              <option value="">Add a professor…</option>
              {available.map((p) => <option key={p.user_id} value={p.user_id}>{p.first_name ? `${p.first_name} ${p.last_name ?? ""}` : p.email}</option>)}
            </select>
            <button onClick={add} disabled={busy || !selected} className="btn-primary !py-2 !px-3 !text-xs disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EnrollCohortModal({ course, institutionId, token, onClose }: {
  course: InstitutionCourse; institutionId: string; token: string; onClose: () => void;
}) {
  const { data: cohortsRaw } = useSWR([`/institutions/${institutionId}/cohorts`, token], ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r));
  const cohorts: Cohort[] = Array.isArray(cohortsRaw) ? cohortsRaw : [];
  const [selected, setSelected] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const isPaid = Number(course.price) > 0;

  async function enroll() {
    if (!selected) return;
    setEnrolling(true);
    try {
      const res: any = await api.post<any>(`/institution-courses/${course.id}/enroll-cohort`, { cohort_id: selected }, token);
      const result = res.data ?? res;
      toast.success(`Enrolled ${result.enrolled_count} student${result.enrolled_count === 1 ? "" : "s"}${result.skipped_already_enrolled ? ` (${result.skipped_already_enrolled} already enrolled)` : ""}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to enroll cohort");
    } finally { setEnrolling(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-display font-black text-navy-900 text-lg">{course.title}</h3>
            <p className="text-sm text-slate-500">Enroll a cohort</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {isPaid ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            This course has a price — enroll students individually through the paid invite flow instead of bulk cohort enrollment.
          </p>
        ) : cohorts.length === 0 ? (
          <p className="text-sm text-slate-400">No cohorts yet — create one on the Cohorts page first.</p>
        ) : (
          <div className="space-y-4">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input-base text-sm">
              <option value="">Select a cohort…</option>
              {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c._count.memberships} students)</option>)}
            </select>
            <button onClick={enroll} disabled={enrolling || !selected} className="btn-primary !py-2 !px-4 !text-xs w-full justify-center disabled:opacity-60 flex items-center gap-1.5">
              {enrolling ? <Loader2 size={12} className="animate-spin" /> : <UsersRound size={12} />} Enroll Cohort
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Users, Search, UserPlus, Mail, Phone, MapPin, Trash2, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

function parseEmails(text: string): string[] {
  return [...new Set(text.split(/[\s,;\n]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

type AddTab = "invite" | "bulk" | "existing";

function AddStudentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const token = useAuthStore((s) => s.accessToken)!;
  const [tab, setTab] = useState<AddTab>("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [existingEmail, setExistingEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<{ email: string; status: string }[] | null>(null);

  const bulkEmails = parseEmails(bulkText);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      const r = await api.post<any>("/prof/students/invite", { email: email.trim(), name: name.trim() || undefined }, token);
      setResults([r.data]);
      toast.success("Student added");
      onDone();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add student");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    if (bulkEmails.length === 0) { toast.error("Enter at least one email"); return; }
    setSaving(true);
    try {
      const r = await api.post<any>("/prof/students/bulk-invite", { emails: bulkEmails }, token);
      setResults(r.data.results);
      toast.success("Invitations sent");
      onDone();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send invitations");
    } finally {
      setSaving(false);
    }
  }

  async function handleExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!existingEmail.trim()) return;
    setSaving(true);
    try {
      const r = await api.post<any>("/prof/students/add-existing", { email: existingEmail.trim() }, token);
      setResults([r.data]);
      toast.success("Student added");
      onDone();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add student");
    } finally {
      setSaving(false);
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    invited: "invited (email sent)",
    added_existing: "already had an account, added",
    already_your_student: "already in your roster",
    added: "added",
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-display font-black text-navy-900 text-lg">Add Student</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {results ? (
          <div>
            <p className="font-semibold text-navy-900 mb-3 text-sm">Results</p>
            <ul className="space-y-2 mb-5">
              {results.map((r) => (
                <li key={r.email} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">{r.email}</span>
                  <span className="text-xs text-slate-400">{STATUS_LABEL[r.status] ?? r.status}</span>
                </li>
              ))}
            </ul>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-slate-200 mb-5">
              {([["invite", "Invite"], ["bulk", "Bulk Invite"], ["existing", "Add Existing"]] as [AddTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                    tab === key ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "invite" && (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Name (optional)</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="input-base text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className="input-base text-sm" />
                </div>
                <p className="text-xs text-slate-400">If they don't have a PAII account yet, we'll create one and email them a link to set a password.</p>
                <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {saving ? "Adding…" : "Send Invitation"}
                </button>
              </form>
            )}

            {tab === "bulk" && (
              <form onSubmit={handleBulk} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Student emails</label>
                  <textarea
                    className="input-base h-32 resize-none text-sm"
                    placeholder={"student1@email.com\nstudent2@email.com\nstudent3@email.com"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    One per line, or separated by commas/spaces. {bulkEmails.length > 0 && `${bulkEmails.length} email${bulkEmails.length !== 1 ? "s" : ""} detected.`}
                  </p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {saving ? "Sending…" : "Send Invitations"}
                </button>
              </form>
            )}

            {tab === "existing" && (
              <form onSubmit={handleExisting} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Student email</label>
                  <input type="email" required value={existingEmail} onChange={(e) => setExistingEmail(e.target.value)} placeholder="student@example.com" className="input-base text-sm" />
                </div>
                <p className="text-xs text-slate-400">Adds a student who already has a PAII account — they won't receive a new signup email.</p>
                <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {saving ? "Adding…" : "Add Student"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MyStudentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const { data: students, isLoading, mutate } = useSWR(
    token ? [`/prof/students${q ? `?q=${encodeURIComponent(q)}` : ""}`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  async function handleRemove(studentId: string) {
    if (!confirm("Remove this student from your roster? This does not delete their PAII account.")) return;
    setRemoving(studentId);
    try {
      await api.delete(`/prof/students/${studentId}`, token!);
      toast.success("Student removed");
      mutate();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove student");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">My Students</h1>
          <p className="text-slate-500 mt-1">{students?.length ?? 0} student{students?.length === 1 ? "" : "s"} in your roster</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <UserPlus size={15} /> Add Student
        </button>
      </div>

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="input-base !pl-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 animate-pulse h-20 bg-slate-100" />)}
        </div>
      ) : !students || students.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Users size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-navy-800">No students yet</p>
          <p className="text-sm mt-1">Add a student to start sharing courses with them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s: any) => {
            const name = `${s.first_name} ${s.last_name}`.trim() || s.email;
            const initials = `${s.first_name?.[0] ?? ""}${s.last_name?.[0] ?? ""}`.toUpperCase() || "?";
            return (
              <div key={s.id} className="card p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 text-navy-700 font-bold text-sm">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 truncate">{name}</p>
                  <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1"><Mail size={11} /> {s.email}</span>
                    {s.phone && <span className="flex items-center gap-1"><Phone size={11} /> {s.phone}</span>}
                    {s.country && <span className="flex items-center gap-1"><MapPin size={11} /> {s.country}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Joined your roster {formatDate(s.joined_at)}
                    {s.last_login_at && ` · Last active ${formatDate(s.last_login_at)}`}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="badge bg-navy-50 text-navy-700">{s.invitations_accepted}/{s.invitations_sent} courses accepted</span>
                  <button
                    onClick={() => handleRemove(s.id)}
                    disabled={removing === s.id}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40"
                    title="Remove from roster"
                  >
                    {removing === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onDone={() => mutate()} />}
    </div>
  );
}

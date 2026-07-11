"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Loader2, PlusCircle, Award, Globe, EyeOff, Clock, BookOpen, Pencil, AlertCircle, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const LEVELS   = ["pre_certificate", "foundation", "advanced", "specialist", "executive", "other"] as const;
const STATUSES = ["coming_soon", "active", "archived"] as const;

const LEVEL_ORDER: Record<string, number> = { pre_certificate: 0, foundation: 1, advanced: 2, specialist: 3, executive: 4, other: 5 };

type Cert = {
  id: string; acronym: string; title: string; level: string;
  status: string; badge_icon: string; price: number;
  duration_weeks: number; passing_score: number;
  _count?: { enrollments: number };
};

export default function CertificationsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? ["/admin/certifications", accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { shouldRetryOnError: true, errorRetryInterval: 3000 }
  );

  const certs: Cert[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const sorted = [...certs].sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9));

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    acronym: "", title: "",
    level: "foundation" as typeof LEVELS[number],
    status: "coming_soon" as typeof STATUSES[number],
    badge_icon: "🎓", price: "", description: "",
    long_description: "", duration_weeks: "12", passing_score: "70",
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.acronym || !form.title || !form.description) {
      toast.error("Acronym, title, and description are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/certifications", {
        ...form,
        price:          parseFloat(form.price) || 0,
        duration_weeks: parseInt(form.duration_weeks) || 12,
        passing_score:  parseInt(form.passing_score) || 70,
      }, accessToken!);
      toast.success("Certification created!");
      mutate();
      setCreateOpen(false);
      setForm({ acronym: "", title: "", level: "foundation", status: "coming_soon", badge_icon: "🎓", price: "", description: "", long_description: "", duration_weeks: "12", passing_score: "70" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create certification");
    } finally {
      setSaving(false);
    }
  }

  const levelLabel: Record<string, string> = {
    pre_certificate: "Pre-Certificate",
    foundation: "Foundation",
    advanced:   "Advanced",
    specialist: "Specialist",
    executive:  "Executive",
    other:      "Other",
  };

  const statusColors: Record<string, string> = {
    active:      "text-emerald-700 bg-emerald-50 border-emerald-200",
    coming_soon: "text-amber-700 bg-amber-50 border-amber-200",
    archived:    "text-slate-500 bg-slate-100 border-slate-200",
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Certifications</h1>
          <p className="text-slate-500 text-sm mt-1">All certification programs in the catalog.</p>
        </div>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0"
        >
          <PlusCircle size={13} /> New Certification
        </button>
      </div>

      {/* Create form */}
      {createOpen && (
        <div className="card p-6 mb-6 border-navy-200 bg-navy-50/30 space-y-6">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">New Certification Program</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Acronym <span className="text-red-500">*</span></label>
                  <input className="input-base" placeholder="CAIP" value={form.acronym} onChange={(e) => set("acronym", e.target.value.toUpperCase())} required maxLength={10} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Badge Icon</label>
                  <input className="input-base" placeholder="🎓" value={form.badge_icon} onChange={(e) => set("badge_icon", e.target.value)} maxLength={4} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Title <span className="text-red-500">*</span></label>
                <input className="input-base" placeholder="Certified AI Professional" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level</label>
                  <select className="input-base" value={form.level} onChange={(e) => set("level", e.target.value)}>
                    {LEVELS.map((l) => <option key={l} value={l}>{levelLabel[l] ?? l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <select className="input-base" value={form.status} onChange={(e) => set("status", e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content</p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Short Description <span className="text-red-500">*</span></label>
                <textarea className="input-base h-20 resize-none" placeholder="One to two sentences for the catalog card." value={form.description} onChange={(e) => set("description", e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Long Description</label>
                <textarea className="input-base h-28 resize-none" placeholder="Full description for the certification detail page." value={form.long_description} onChange={(e) => set("long_description", e.target.value)} />
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settings</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (USD)</label>
                  <input className="input-base" type="number" min="0" placeholder="499" value={form.price} onChange={(e) => set("price", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration (weeks)</label>
                  <input className="input-base" type="number" min="1" placeholder="12" value={form.duration_weeks} onChange={(e) => set("duration_weeks", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passing Score %</label>
                  <input className="input-base" type="number" min="1" max="100" placeholder="70" value={form.passing_score} onChange={(e) => set("passing_score", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />} Create
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Certification list */}
      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading certifications…</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-semibold">Could not reach the backend</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">Make sure the API server is running on port 4000.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <Award size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">No certifications yet</p>
          <p className="text-slate-400 text-xs mt-1">Create your first certification program above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((cert) => (
            <div key={cert.id} className="card px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-xl flex-shrink-0">
                {cert.badge_icon || "🎓"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-navy-900 text-sm">{cert.acronym}</span>
                  <span className="text-slate-400 text-sm truncate">{cert.title}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[cert.status] ?? statusColors.coming_soon}`}>
                    {cert.status === "active" ? <Globe size={9} /> : <EyeOff size={9} />}
                    {cert.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                  <span>{levelLabel[cert.level] ?? cert.level}</span>
                  {cert.duration_weeks > 0 && (
                    <span className="flex items-center gap-1"><Clock size={10} /> {cert.duration_weeks}w</span>
                  )}
                  <span className="flex items-center gap-1"><Award size={10} /> {cert.passing_score}% to pass</span>
                  {cert._count?.enrollments !== undefined && (
                    <span>{cert._count.enrollments} enrolled</span>
                  )}
                  <span>${cert.price.toLocaleString()}</span>
                </div>
              </div>
              <Link
                href={`/design/certifications/${cert.id}`}
                className="btn-outline !py-1.5 !px-3 !text-xs flex-shrink-0"
              >
                <Pencil size={11} /> Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

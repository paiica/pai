"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Camera, Loader2, Save, Plus, Trash2, Briefcase, GraduationCap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type EducationEntry = {
  id: string; institution: string; degree: string; field_of_study: string;
  start_year: string; end_year: string; is_current: boolean;
};

type ExperienceEntry = {
  id: string; title: string; company: string; location: string;
  start_date: string; end_date: string; is_current: boolean; description: string;
};

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

// ─── Photo ──────────────────────────────────────────────────────────────────

function PhotoCard({ profile, token, onSaved }: { profile: any; token: string; onSaved: () => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
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
      await api.patch("/users/me/profile", { avatar_url: fileUrl }, token);
      toast.success("Photo updated");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase();

  return (
    <div className="card p-6 flex items-center gap-5">
      <div className="relative flex-shrink-0">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xl font-bold">
            {initials || "?"}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center border-2 border-white hover:bg-navy-700 transition-colors disabled:opacity-60"
          title="Change photo"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
      </div>
      <div>
        <p className="text-sm font-bold text-navy-900">Profile Photo</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Shown to students in the "Your Instructors" section on your course and certification pages.
        </p>
      </div>
    </div>
  );
}

// ─── About ──────────────────────────────────────────────────────────────────

function AboutCard({ profile, token, onSaved }: { profile: any; token: string; onSaved: () => void }) {
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [yearsExp, setYearsExp] = useState(profile?.years_experience != null ? String(profile.years_experience) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBio(profile?.bio ?? "");
    setJobTitle(profile?.job_title ?? "");
    setCompany(profile?.company ?? "");
    setYearsExp(profile?.years_experience != null ? String(profile.years_experience) : "");
  }, [profile?.updated_at]);

  async function save() {
    setSaving(true);
    try {
      await api.patch("/users/me/profile", {
        bio: bio || null,
        job_title: jobTitle || null,
        company: company || null,
        years_experience: yearsExp ? parseInt(yearsExp, 10) : null,
      }, token);
      toast.success("Profile saved");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">About</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job Title</label>
          <input className="input-base" placeholder="e.g., Senior AI Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company / Organization</label>
          <input className="input-base" placeholder="e.g., PAII" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Years of Experience</label>
        <input className="input-base w-40" type="number" min="0" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bio</label>
        <textarea
          className="input-base h-32 resize-none"
          placeholder="Tell students about your background, expertise, and what you bring to this course…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
      </button>
    </div>
  );
}

// ─── Experience ─────────────────────────────────────────────────────────────

function ExperienceCard({ profile, token, onSaved }: { profile: any; token: string; onSaved: () => void }) {
  const [entries, setEntries] = useState<ExperienceEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEntries(safeArray<ExperienceEntry>(profile?.experience_entries));
  }, [profile?.updated_at]);

  function addEntry() {
    setEntries((e) => [...e, { id: uid(), title: "", company: "", location: "", start_date: "", end_date: "", is_current: false, description: "" }]);
  }
  function updateEntry(id: string, patch: Partial<ExperienceEntry>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeEntry(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch("/users/me/profile", { experience_entries: entries }, token);
      toast.success("Experience saved");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-slate-400" />
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Experience</p>
        </div>
        <button onClick={addEntry} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"><Plus size={12} /> Add</button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">No experience added yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="p-4 bg-slate-50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Entry</span>
                <button onClick={() => removeEntry(e.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input className="input-base text-sm" placeholder="Title" value={e.title} onChange={(ev) => updateEntry(e.id, { title: ev.target.value })} />
                <input className="input-base text-sm" placeholder="Company" value={e.company} onChange={(ev) => updateEntry(e.id, { company: ev.target.value })} />
              </div>
              <input className="input-base text-sm" placeholder="Location (optional)" value={e.location} onChange={(ev) => updateEntry(e.id, { location: ev.target.value })} />
              <div className="grid grid-cols-2 gap-2.5 items-center">
                <input className="input-base text-sm" placeholder="Start (e.g. 2019)" value={e.start_date} onChange={(ev) => updateEntry(e.id, { start_date: ev.target.value })} />
                <input className="input-base text-sm" placeholder="End (e.g. 2023)" value={e.end_date} onChange={(ev) => updateEntry(e.id, { end_date: ev.target.value })} disabled={e.is_current} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={e.is_current} onChange={(ev) => updateEntry(e.id, { is_current: ev.target.checked, end_date: ev.target.checked ? "" : e.end_date })} className="rounded" />
                <span className="text-xs text-slate-600">I currently work here</span>
              </label>
              <textarea className="input-base text-sm h-16 resize-none" placeholder="Brief description (optional)" value={e.description} onChange={(ev) => updateEntry(e.id, { description: ev.target.value })} />
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Experience
      </button>
    </div>
  );
}

// ─── Education ──────────────────────────────────────────────────────────────

function EducationCard({ profile, token, onSaved }: { profile: any; token: string; onSaved: () => void }) {
  const [entries, setEntries] = useState<EducationEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEntries(safeArray<EducationEntry>(profile?.education_entries));
  }, [profile?.updated_at]);

  function addEntry() {
    setEntries((e) => [...e, { id: uid(), institution: "", degree: "", field_of_study: "", start_year: "", end_year: "", is_current: false }]);
  }
  function updateEntry(id: string, patch: Partial<EducationEntry>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeEntry(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch("/users/me/profile", { education_entries: entries }, token);
      toast.success("Education saved");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-slate-400" />
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Education</p>
        </div>
        <button onClick={addEntry} className="btn-outline !py-1 !px-2.5 !text-xs flex items-center gap-1"><Plus size={12} /> Add</button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">No education added yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="p-4 bg-slate-50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Entry</span>
                <button onClick={() => removeEntry(e.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
              </div>
              <input className="input-base text-sm" placeholder="Institution" value={e.institution} onChange={(ev) => updateEntry(e.id, { institution: ev.target.value })} />
              <div className="grid grid-cols-2 gap-2.5">
                <input className="input-base text-sm" placeholder="Degree (e.g. PhD)" value={e.degree} onChange={(ev) => updateEntry(e.id, { degree: ev.target.value })} />
                <input className="input-base text-sm" placeholder="Field of Study" value={e.field_of_study} onChange={(ev) => updateEntry(e.id, { field_of_study: ev.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input className="input-base text-sm" placeholder="Start year" value={e.start_year} onChange={(ev) => updateEntry(e.id, { start_year: ev.target.value })} />
                <input className="input-base text-sm" placeholder="End year" value={e.end_year} onChange={(ev) => updateEntry(e.id, { end_year: ev.target.value })} disabled={e.is_current} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={e.is_current} onChange={(ev) => updateEntry(e.id, { is_current: ev.target.checked, end_year: ev.target.checked ? "" : e.end_year })} className="rounded" />
                <span className="text-xs text-slate-600">Currently studying here</span>
              </label>
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Education
      </button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProfProfilePage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { data: profile, mutate } = useSWR(
    token ? ["/users/me/profile", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  if (!profile) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-24 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-black text-navy-900">My Profile</h1>
        <p className="text-slate-500 mt-1">
          This is what students see when they click your name on a course or certification page.
        </p>
      </div>

      <PhotoCard profile={profile} token={token} onSaved={() => mutate()} />
      <AboutCard profile={profile} token={token} onSaved={() => mutate()} />
      <ExperienceCard profile={profile} token={token} onSaved={() => mutate()} />
      <EducationCard profile={profile} token={token} onSaved={() => mutate()} />
    </div>
  );
}

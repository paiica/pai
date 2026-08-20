"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, Save, X, Briefcase } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type CareerProfile = {
  id: string;
  role_title: string;
  summary: string;
  responsibilities: string[];
  related_cert_acronyms: string[];
  is_published: boolean;
};

function listToText(r: string[]) { return (r ?? []).join(", "); }
function textToList(s: string): string[] { return s.split(",").map((x) => x.trim()).filter(Boolean); }

function ProfileRow({ item, token, onMutate }: { item: CareerProfile; token: string; onMutate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [roleTitle, setRoleTitle] = useState(item.role_title);
  const [summary, setSummary] = useState(item.summary);
  const [responsibilities, setResponsibilities] = useState(listToText(item.responsibilities));
  const [relatedCerts, setRelatedCerts] = useState(listToText(item.related_cert_acronyms));

  async function save() {
    try {
      await api.patch(`/career-profiles/${item.id}`, { role_title: roleTitle, summary, responsibilities: textToList(responsibilities), related_cert_acronyms: textToList(relatedCerts) }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function togglePublished() {
    try {
      await api.patch(`/career-profiles/${item.id}`, { is_published: !item.is_published }, token);
      onMutate();
    } catch { toast.error("Failed to update"); }
  }

  async function remove() {
    if (!confirm(`Delete "${item.role_title}"?`)) return;
    try {
      await api.delete(`/career-profiles/${item.id}`, token);
      toast.success("Deleted");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div className={`card p-3 mb-2 transition-colors ${!item.is_published ? "opacity-50" : ""}`}>
      {editing ? (
        <div className="space-y-2">
          <input className="input-base !py-1.5 text-sm" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Role title (e.g. AI Product Manager)" />
          <textarea className="input-base !py-1.5 text-sm resize-none h-16" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary" />
          <input className="input-base !py-1.5 text-xs" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} placeholder="Responsibilities, comma-separated" />
          <input className="input-base !py-1.5 text-xs" value={relatedCerts} onChange={(e) => setRelatedCerts(e.target.value)} placeholder="Related certification acronyms, comma-separated (e.g. CAIP, CAIM)" />
          <div className="flex gap-2">
            <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
            <button onClick={() => { setEditing(false); setRoleTitle(item.role_title); setSummary(item.summary); setResponsibilities(listToText(item.responsibilities)); setRelatedCerts(listToText(item.related_cert_acronyms)); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy-900 text-sm">{item.role_title}</p>
              {item.related_cert_acronyms.map((a) => (
                <span key={a} className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.summary}</p>
          </div>
          <button onClick={togglePublished} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors flex-shrink-0 ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {item.is_published ? <Eye size={11} /> : <EyeOff size={11} />}
            {item.is_published ? "Published" : "Hidden"}
          </button>
          <button onClick={() => setEditing(true)} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex-shrink-0">Edit</button>
          <button onClick={remove} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  );
}

function AddForm({ adding, onAdd, onCancel }: { adding: boolean; onAdd: (v: { role_title: string; summary: string; responsibilities: string[]; related_cert_acronyms: string[] }) => void; onCancel: () => void }) {
  const [roleTitle, setRoleTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [relatedCerts, setRelatedCerts] = useState("");

  return (
    <div className="card p-4 border-2 border-dashed border-slate-200 mt-2 space-y-2">
      <input className="input-base !py-1.5 text-sm" placeholder="Role title (e.g. AI Product Manager)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
      <textarea className="input-base !py-1.5 text-sm resize-none h-16" placeholder="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <input className="input-base !py-1.5 text-xs" placeholder="Responsibilities, comma-separated" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
      <input className="input-base !py-1.5 text-xs" placeholder="Related certification acronyms, comma-separated (e.g. CAIP, CAIM)" value={relatedCerts} onChange={(e) => setRelatedCerts(e.target.value)} />
      <div className="flex gap-2">
        <button
          onClick={() => { if (!roleTitle || !summary) { toast.error("Role title and summary are required"); return; } onAdd({ role_title: roleTitle, summary, responsibilities: textToList(responsibilities), related_cert_acronyms: textToList(relatedCerts) }); setRoleTitle(""); setSummary(""); setResponsibilities(""); setRelatedCerts(""); }}
          disabled={adding}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add Role"}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
      </div>
    </div>
  );
}

// Empty by default — per-role career deep-dive cards for the Careers in AI
// page. related_cert_acronyms should reference real Certification.acronym
// values (cross-check against /certifications before publishing).
export default function CareerProfilesManager() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/career-profiles", accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    }
  );

  const items: CareerProfile[] = data?.data ?? data ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  async function addItem(v: { role_title: string; summary: string; responsibilities: string[]; related_cert_acronyms: string[] }) {
    setAdding(true);
    try {
      await api.post("/career-profiles", v, accessToken!);
      toast.success("Added");
      setShowAdd(false);
      mutate();
    } catch { toast.error("Failed to add"); }
    setAdding(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest flex items-center gap-1.5">
            <Briefcase size={13} className="text-slate-400" /> Career Profiles
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">New roles start hidden — publish once the content is reviewed.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-outline !py-1.5 !px-3 !text-xs">
          <Plus size={12} /> Add Role
        </button>
      </div>

      {showAdd && <AddForm adding={adding} onAdd={addItem} onCancel={() => setShowAdd(false)} />}

      {isLoading ? (
        <div className="p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load career profiles.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No career profiles yet — add one above.</p>
      ) : (
        <div className="mt-4">
          {items.map((item) => <ProfileRow key={item.id} item={item} token={accessToken!} onMutate={mutate} />)}
        </div>
      )}
    </div>
  );
}

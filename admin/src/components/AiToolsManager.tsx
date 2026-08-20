"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, Save, X, Wrench } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Tool = {
  id: string;
  name: string;
  category: string;
  description: string;
  website_url: string;
  pricing_summary: string;
  is_published: boolean;
};

function ToolRow({ item, token, onMutate }: { item: Tool; token: string; onMutate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [description, setDescription] = useState(item.description);
  const [websiteUrl, setWebsiteUrl] = useState(item.website_url);
  const [pricingSummary, setPricingSummary] = useState(item.pricing_summary);

  async function save() {
    try {
      await api.patch(`/ai-tools/${item.id}`, { name, category, description, website_url: websiteUrl, pricing_summary: pricingSummary }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function togglePublished() {
    try {
      await api.patch(`/ai-tools/${item.id}`, { is_published: !item.is_published }, token);
      onMutate();
    } catch { toast.error("Failed to update"); }
  }

  async function remove() {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/ai-tools/${item.id}`, token);
      toast.success("Deleted");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div className={`card p-3 mb-2 transition-colors ${!item.is_published ? "opacity-50" : ""}`}>
      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className="input-base !py-1.5 text-sm flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tool name" />
            <input className="input-base !py-1.5 text-xs flex-1" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
          </div>
          <textarea className="input-base !py-1.5 text-sm resize-none h-16" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input className="input-base !py-1.5 text-xs" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Website URL" />
          <input className="input-base !py-1.5 text-xs" value={pricingSummary} onChange={(e) => setPricingSummary(e.target.value)} placeholder="Pricing summary (e.g. Free tier + $20/mo Pro)" />
          <div className="flex gap-2">
            <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
            <button onClick={() => { setEditing(false); setName(item.name); setCategory(item.category); setDescription(item.description); setWebsiteUrl(item.website_url); setPricingSummary(item.pricing_summary); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy-900 text-sm">{item.name}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{item.category}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
            {item.pricing_summary && <p className="text-[11px] text-slate-400 mt-1">{item.pricing_summary}</p>}
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

function AddForm({ adding, onAdd, onCancel }: { adding: boolean; onAdd: (v: { name: string; category: string; description: string; website_url: string; pricing_summary: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pricingSummary, setPricingSummary] = useState("");

  return (
    <div className="card p-4 border-2 border-dashed border-slate-200 mt-2 space-y-2">
      <div className="flex gap-2">
        <input className="input-base !py-1.5 text-sm flex-1" placeholder="Tool name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input-base !py-1.5 text-xs flex-1" placeholder="Category (e.g. Writing, Coding, Image)" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <textarea className="input-base !py-1.5 text-sm resize-none h-16" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="input-base !py-1.5 text-xs" placeholder="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
      <input className="input-base !py-1.5 text-xs" placeholder="Pricing summary" value={pricingSummary} onChange={(e) => setPricingSummary(e.target.value)} />
      <div className="flex gap-2">
        <button
          onClick={() => { if (!name || !category || !description) { toast.error("Name, category, and description are required"); return; } onAdd({ name, category, description, website_url: websiteUrl, pricing_summary: pricingSummary }); setName(""); setCategory(""); setDescription(""); setWebsiteUrl(""); setPricingSummary(""); }}
          disabled={adding}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add Tool"}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
      </div>
    </div>
  );
}

// Empty by default (new listings default to unpublished) — PAII adds real
// tools with real pricing here as they're vetted; nothing is seeded or
// invented. Same one-screen-per-page consolidation as FaqManager/GlossaryManager.
export default function AiToolsManager() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/ai-tools", accessToken] : null,
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

  const items: Tool[] = data?.data ?? data ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  async function addItem(v: { name: string; category: string; description: string; website_url: string; pricing_summary: string }) {
    setAdding(true);
    try {
      await api.post("/ai-tools", v, accessToken!);
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
            <Wrench size={13} className="text-slate-400" /> AI Tools Directory
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">New tools start hidden — publish once pricing/details are verified.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-outline !py-1.5 !px-3 !text-xs">
          <Plus size={12} /> Add Tool
        </button>
      </div>

      {showAdd && <AddForm adding={adding} onAdd={addItem} onCancel={() => setShowAdd(false)} />}

      {isLoading ? (
        <div className="p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load AI tools.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No tools yet — add one above.</p>
      ) : (
        <div className="mt-4">
          {items.map((item) => <ToolRow key={item.id} item={item} token={accessToken!} onMutate={mutate} />)}
        </div>
      )}
    </div>
  );
}

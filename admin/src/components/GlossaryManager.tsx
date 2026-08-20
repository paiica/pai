"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, Save, X, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Term = {
  id: string;
  term: string;
  slug: string;
  category: string;
  definition: string;
  example: string;
  related_terms: string[];
  is_published: boolean;
};

function relatedToText(r: string[]) { return (r ?? []).join(", "); }
function textToRelated(s: string): string[] { return s.split(",").map((x) => x.trim()).filter(Boolean); }

function TermRow({ item, token, onMutate, existingCategories }: { item: Term; token: string; onMutate: () => void; existingCategories: string[] }) {
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(item.term);
  const [category, setCategory] = useState(item.category);
  const [customCategory, setCustomCategory] = useState(!existingCategories.includes(item.category));
  const [definition, setDefinition] = useState(item.definition);
  const [example, setExample] = useState(item.example);
  const [related, setRelated] = useState(relatedToText(item.related_terms));

  async function save() {
    try {
      await api.patch(`/glossary/${item.id}`, { term, category, definition, example, related_terms: textToRelated(related) }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function togglePublished() {
    try {
      await api.patch(`/glossary/${item.id}`, { is_published: !item.is_published }, token);
      onMutate();
    } catch { toast.error("Failed to update"); }
  }

  async function remove() {
    if (!confirm(`Delete "${item.term}"?`)) return;
    try {
      await api.delete(`/glossary/${item.id}`, token);
      toast.success("Deleted");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div className={`card p-3 mb-2 transition-colors ${!item.is_published ? "opacity-50" : ""}`}>
      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className="input-base !py-1.5 text-sm flex-1" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term" />
            {customCategory ? (
              <div className="flex items-center gap-1 flex-1">
                <input className="input-base !py-1.5 text-xs flex-1" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="New category" />
                {existingCategories.length > 0 && (
                  <button type="button" onClick={() => setCustomCategory(false)} className="text-[11px] text-slate-400 hover:text-navy-700 flex-shrink-0 whitespace-nowrap">Choose existing</button>
                )}
              </div>
            ) : (
              <select
                className="input-base !py-1.5 text-xs flex-1"
                value={category}
                onChange={(e) => { if (e.target.value === "__new__") { setCustomCategory(true); setCategory(""); } else setCategory(e.target.value); }}
              >
                {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ New category…</option>
              </select>
            )}
          </div>
          <textarea className="input-base !py-1.5 text-sm resize-none h-16" value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Definition" />
          <input className="input-base !py-1.5 text-xs" value={example} onChange={(e) => setExample(e.target.value)} placeholder="Example (optional)" />
          <input className="input-base !py-1.5 text-xs" value={related} onChange={(e) => setRelated(e.target.value)} placeholder="Related term slugs, comma-separated (e.g. machine-learning, neural-network)" />
          <div className="flex gap-2">
            <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
            <button onClick={() => { setEditing(false); setTerm(item.term); setCategory(item.category); setDefinition(item.definition); setExample(item.example); setRelated(relatedToText(item.related_terms)); setCustomCategory(!existingCategories.includes(item.category)); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy-900 text-sm">{item.term}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{item.category}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.definition}</p>
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

function AddForm({ existingCategories, adding, onAdd, onCancel }: { existingCategories: string[]; adding: boolean; onAdd: (v: { term: string; category: string; definition: string; example: string }) => void; onCancel: () => void }) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [customCategory, setCustomCategory] = useState(existingCategories.length === 0);

  return (
    <div className="card p-4 border-2 border-dashed border-slate-200 mt-2 space-y-2">
      <div className="flex gap-2">
        <input className="input-base !py-1.5 text-sm flex-1" placeholder="Term (e.g. Prompt Engineering)" value={term} onChange={(e) => setTerm(e.target.value)} />
        {customCategory ? (
          <div className="flex items-center gap-1 flex-1">
            <input className="input-base !py-1.5 text-xs flex-1" placeholder="New category" value={category} onChange={(e) => setCategory(e.target.value)} />
            {existingCategories.length > 0 && (
              <button type="button" onClick={() => { setCustomCategory(false); setCategory(""); }} className="text-[11px] text-slate-400 hover:text-navy-700 flex-shrink-0 whitespace-nowrap">Choose existing</button>
            )}
          </div>
        ) : (
          <select
            className="input-base !py-1.5 text-xs flex-1"
            value={category}
            onChange={(e) => { if (e.target.value === "__new__") { setCustomCategory(true); setCategory(""); } else setCategory(e.target.value); }}
          >
            <option value="">Choose a category…</option>
            {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">+ New category…</option>
          </select>
        )}
      </div>
      <textarea className="input-base !py-1.5 text-sm resize-none h-16" placeholder="Definition" value={definition} onChange={(e) => setDefinition(e.target.value)} />
      <input className="input-base !py-1.5 text-xs" placeholder="Example (optional)" value={example} onChange={(e) => setExample(e.target.value)} />
      <div className="flex gap-2">
        <button
          onClick={() => { if (!term || !category || !definition) { toast.error("Term, category, and definition are required"); return; } onAdd({ term, category, definition, example }); setTerm(""); setCategory(""); setDefinition(""); setExample(""); }}
          disabled={adding}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add Term"}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
      </div>
    </div>
  );
}

// Embedded directly in the Pages editor for the "glossary" page, same
// consolidation pattern as FaqManager — one screen per page, not a separate
// Design nav destination. No drag-reorder needed here: display order on the
// public site is always alphabetical by term.
export default function GlossaryManager() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/glossary", accessToken] : null,
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

  const items: Term[] = data?.data ?? data ?? [];
  const existingCategories = Array.from(new Set(items.map((i) => i.category)));

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  async function addItem(v: { term: string; category: string; definition: string; example: string }) {
    setAdding(true);
    try {
      await api.post("/glossary", v, accessToken!);
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
            <BookOpen size={13} className="text-slate-400" /> Glossary Terms
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Shown alphabetically in the glossary browser below the hero on this page.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-outline !py-1.5 !px-3 !text-xs">
          <Plus size={12} /> Add Term
        </button>
      </div>

      {showAdd && <AddForm existingCategories={existingCategories} adding={adding} onAdd={addItem} onCancel={() => setShowAdd(false)} />}

      {isLoading ? (
        <div className="p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load glossary terms.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No terms yet — add one above.</p>
      ) : (
        <div className="mt-4">
          {items.map((item) => <TermRow key={item.id} item={item} token={accessToken!} onMutate={mutate} existingCategories={existingCategories} />)}
        </div>
      )}
    </div>
  );
}

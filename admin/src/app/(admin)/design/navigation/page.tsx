"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save, X, ExternalLink, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type NavItem = {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  open_new_tab: boolean;
  children?: NavItem[];
};

function ItemRow({ item, token, onMutate, isChild = false }: { item: NavItem; token: string; onMutate: () => void; isChild?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [href, setHref] = useState(item.href);
  const [openNewTab, setOpenNewTab] = useState(item.open_new_tab);

  async function save() {
    try {
      await api.patch(`/navigation/${item.id}`, { label, href, open_new_tab: openNewTab }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function toggleVisible() {
    try {
      await api.patch(`/navigation/${item.id}`, { is_visible: !item.is_visible }, token);
      onMutate();
    } catch { toast.error("Failed to update"); }
  }

  async function remove() {
    if (!confirm(`Delete "${item.label}"?`)) return;
    try {
      await api.delete(`/navigation/${item.id}`, token);
      toast.success("Deleted");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div className={`${isChild ? "ml-6 border-l-2 border-slate-100 pl-3" : ""}`}>
      <div className={`card p-3 flex items-center gap-3 mb-2 ${!item.is_visible ? "opacity-50" : ""}`}>
        {isChild && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}

        {editing ? (
          <>
            <input className="input-base !py-1.5 text-sm flex-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
            <input className="input-base !py-1.5 text-sm flex-1" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/path or https://..." />
            <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={openNewTab} onChange={(e) => setOpenNewTab(e.target.checked)} className="rounded" />
              New tab
            </label>
            <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
            <button onClick={() => { setEditing(false); setLabel(item.label); setHref(item.href); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-navy-900 text-sm">{item.label}</span>
              <span className="ml-2 text-xs text-slate-400 truncate">{item.href}</span>
              {item.open_new_tab && <ExternalLink size={10} className="inline ml-1 text-slate-400" />}
            </div>
            <button onClick={toggleVisible} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${item.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {item.is_visible ? <Eye size={11} /> : <EyeOff size={11} />}
              {item.is_visible ? "Visible" : "Hidden"}
            </button>
            <button onClick={() => setEditing(true)} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg text-xs font-medium">Edit</button>
            <button onClick={remove} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
          </>
        )}
      </div>

      {(item.children ?? []).map((child) => (
        <ItemRow key={child.id} item={child} token={token} onMutate={onMutate} isChild />
      ))}
    </div>
  );
}

export default function NavigationPage() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/navigation", accessToken] : null,
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

  const items: NavItem[] = data?.data ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [showAddChild, setShowAddChild] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");
  const [newTab, setNewTab] = useState(false);
  const [adding, setAdding] = useState(false);

  async function addItem(parentId?: string) {
    if (!newLabel || !newHref) { toast.error("Label and URL are required"); return; }
    setAdding(true);
    try {
      await api.post("/navigation", {
        label: newLabel,
        href: newHref,
        open_new_tab: newTab,
        sort_order: items.length + 1,
        ...(parentId ? { parent_id: parentId } : {}),
      }, accessToken!);
      toast.success("Added");
      setNewLabel(""); setNewHref(""); setNewTab(false);
      setShowAdd(false); setShowAddChild(null);
      mutate();
    } catch { toast.error("Failed to add"); }
    setAdding(false);
  }

  function AddForm({ parentId }: { parentId?: string }) {
    return (
      <div className="card p-4 border-2 border-dashed border-slate-200 mt-2">
        <div className="flex flex-wrap gap-2">
          <input className="input-base !py-1.5 text-sm flex-1 min-w-[120px]" placeholder="Label (e.g. Blog)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <input className="input-base !py-1.5 text-sm flex-1 min-w-[120px]" placeholder="/path or https://..." value={newHref} onChange={(e) => setNewHref(e.target.value)} />
          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer self-center">
            <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
            New tab
          </label>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => addItem(parentId)} disabled={adding} className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60">
            {adding ? <><span className="animate-spin">⏳</span> Adding…</> : "Add Item"}
          </button>
          <button onClick={() => { setShowAdd(false); setShowAddChild(null); setNewLabel(""); setNewHref(""); }} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Navigation Menu</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the header menu items on the marketing site.</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setShowAddChild(null); }} className="btn-primary !py-2 !px-4 !text-sm">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {showAdd && <AddForm />}

      {isLoading ? (
        <div className="card p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : error ? (
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load navigation items.</p>
          <p className="text-slate-400 text-xs mt-1 font-mono">{error?.message}</p>
          <p className="text-slate-400 text-xs mt-1">If this says "Unauthorized", sign out and sign back in.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">No navigation items found.</div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id}>
              <ItemRow item={item} token={accessToken!} onMutate={mutate} />
              <button
                onClick={() => { setShowAddChild(showAddChild === item.id ? null : item.id); setShowAdd(false); setNewLabel(""); setNewHref(""); }}
                className="ml-9 text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1 mb-3"
              >
                <Plus size={11} /> Add sub-item under "{item.label}"
              </button>
              {showAddChild === item.id && (
                <div className="ml-9">
                  <AddForm parentId={item.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6">
        Changes are live on the marketing site immediately after the next page load.
      </p>
    </div>
  );
}

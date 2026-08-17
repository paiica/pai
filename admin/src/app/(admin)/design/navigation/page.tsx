"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save, X, ExternalLink, ChevronRight, Languages, Sparkles, Loader2 } from "lucide-react";
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
  translations?: Record<string, Record<string, any>>;
};

type Language = { code: string; name: string; native_name: string; is_rtl: boolean };

// Compact per-language label editor for a single nav item — deliberately not
// the full tab-strip+panel pattern used on dedicated detail pages, since a
// nav item is just one field (label). Shows one row per enabled non-English
// language with an inline input + save, plus a "Translate" button that
// re-translates from the English label via AI.
function NavItemTranslations({ item, token, languages, refreshTokens }: {
  item: NavItem; token: string; languages: Language[]; refreshTokens: () => Promise<boolean>;
}) {
  const nonEnglish = languages.filter((l) => l.code !== "en");
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    nonEnglish.forEach((l) => { init[l.code] = item.translations?.[l.code]?.label ?? ""; });
    return init;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);

  if (nonEnglish.length === 0) return null;

  async function saveLabel(locale: string) {
    setSaving(locale);
    try {
      let t = token;
      const fields = { label: drafts[locale] ?? "" };
      try {
        await api.patch(`/translations/nav_item/${item.id}?locale=${locale}`, { fields }, t);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          t = useAuthStore.getState().accessToken!;
          await api.patch(`/translations/nav_item/${item.id}?locale=${locale}`, { fields }, t);
        } else throw err;
      }
      toast.success("Translation saved");
    } catch { toast.error("Failed to save translation"); }
    finally { setSaving(null); }
  }

  async function translate(locale: string) {
    setTranslating(locale);
    try {
      let t = token;
      let res: any;
      try {
        res = await api.post<any>(`/translations/nav_item/${item.id}?locale=${locale}`, {}, t);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          t = useAuthStore.getState().accessToken!;
          res = await api.post<any>(`/translations/nav_item/${item.id}?locale=${locale}`, {}, t);
        } else throw err;
      }
      const updated = res?.data ?? res;
      const label = updated?.translations?.[locale]?.label ?? "";
      setDrafts((prev) => ({ ...prev, [locale]: label }));
      toast.success("Translated with AI — review and save");
    } catch { toast.error("Translation failed"); }
    finally { setTranslating(null); }
  }

  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
      {nonEnglish.map((lang) => (
        <div key={lang.code} className="flex items-center gap-1.5" dir={lang.is_rtl ? "rtl" : "ltr"}>
          <span className="text-[10px] font-semibold text-slate-400 w-16 flex-shrink-0 uppercase tracking-wider">{lang.code}</span>
          <input
            className="input-base !py-1 !text-xs flex-1"
            value={drafts[lang.code] ?? ""}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [lang.code]: e.target.value }))}
            placeholder={`${lang.native_name} label`}
          />
          <button onClick={() => translate(lang.code)} disabled={translating === lang.code} title="Re-translate from English"
            className="p-1.5 text-navy-500 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0">
            {translating === lang.code ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          </button>
          <button onClick={() => saveLabel(lang.code)} disabled={saving === lang.code} title="Save translation"
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0">
            {saving === lang.code ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          </button>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ item, token, onMutate, isChild = false, languages, refreshTokens }: {
  item: NavItem; token: string; onMutate: () => void; isChild?: boolean; languages: Language[]; refreshTokens: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [href, setHref] = useState(item.href);
  const [openNewTab, setOpenNewTab] = useState(item.open_new_tab);
  const [showTranslations, setShowTranslations] = useState(false);

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
      <div className={`card p-3 mb-2 ${!item.is_visible ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-3">
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
              {languages.length > 1 && (
                <button onClick={() => setShowTranslations((v) => !v)} title="Translations"
                  className={`p-1.5 rounded-lg transition-colors ${showTranslations ? "text-navy-700 bg-navy-50" : "text-slate-400 hover:text-navy-700 hover:bg-slate-50"}`}>
                  <Languages size={13} />
                </button>
              )}
              <button onClick={toggleVisible} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${item.is_visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {item.is_visible ? <Eye size={11} /> : <EyeOff size={11} />}
                {item.is_visible ? "Visible" : "Hidden"}
              </button>
              <button onClick={() => setEditing(true)} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg text-xs font-medium">Edit</button>
              <button onClick={remove} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
            </>
          )}
        </div>

        {showTranslations && !editing && (
          <NavItemTranslations item={item} token={token} languages={languages} refreshTokens={refreshTokens} />
        )}
      </div>

      {(item.children ?? []).map((child) => (
        <ItemRow key={child.id} item={child} token={token} onMutate={onMutate} isChild languages={languages} refreshTokens={refreshTokens} />
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

  const { data: languagesData } = useSWR<Language[]>(
    accessToken ? ["/languages", accessToken] : null,
    ([url, token]: [string, string]) => api.get<any>(url, token).then((r: any) => r.data ?? r)
  );
  const languages = languagesData ?? [];

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
              <ItemRow item={item} token={accessToken!} onMutate={mutate} languages={languages} refreshTokens={refreshTokens} />
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

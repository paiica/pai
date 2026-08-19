"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, GripVertical, Save, X, ExternalLink, ChevronRight, Languages, Sparkles, Loader2, Info } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Cert = {
  id: string; slug: string; title: string;
  level: "pre_certificate" | "foundation" | "advanced" | "executive" | "specialist" | "other";
  status: "active" | "coming_soon";
};

// Mirrors marketing-site/src/components/layout/CertificationsMegaMenu.tsx —
// keep in sync if that grouping ever changes, since this panel exists purely
// to show admins what's actually live there.
const LEVEL_TO_CATEGORY: Record<Cert["level"], string> = {
  pre_certificate: "Foundational", foundation: "Foundational",
  advanced: "Advanced", specialist: "Specialized", executive: "Executive", other: "Other",
};
const CATEGORY_ORDER = ["Foundational", "Advanced", "Specialized", "Executive", "Other"];

// Read-only — the left side of the Certifications dropdown (the actual
// certifications) is generated live from certification data, grouped by
// Level, not from editable nav sub-items. The sub-items you add below
// become the "Certification Resources" column next to it, which IS editable.
function CertificationsMegaMenuPreview({ token }: { token: string }) {
  const { data } = useSWR<Cert[]>(
    ["/courses/catalog", token],
    ([url, t]: [string, string]) => api.get<any>(url, t).then((r: any) => r.data ?? r)
  );
  const certs = data ?? [];
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, certs: certs.filter((c) => LEVEL_TO_CATEGORY[c.level] === cat) }))
    .filter((g) => g.certs.length > 0);

  return (
    <div className="ml-9 mb-3 card p-4 bg-slate-50/60 border-dashed">
      <div className="flex items-start gap-2 mb-3">
        <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          The certifications side of this dropdown is generated automatically from your certification catalog,
          grouped by each certification's <span className="font-semibold text-slate-600">Level</span> — change a
          certification's category by editing its Level in Certifications, not here. The sub-items you add below
          form the separate "Certification Resources" column next to it, which you fully control.
        </p>
      </div>
      {!data ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-xs text-slate-400">No active or coming-soon certifications yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{g.cat}</p>
              {g.certs.map((c) => (
                <p key={c.id} className="text-xs text-navy-800 leading-relaxed">
                  {c.title}{c.status === "coming_soon" && <span className="text-teal-600 font-semibold"> · Coming Soon</span>}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type NavItem = {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  open_new_tab: boolean;
  group_label?: string;
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

function ItemRow({
  item, token, onMutate, isChild = false, languages, refreshTokens,
  isDragging, isDragOver, onDragStart, onDragEnter, onDrop, onDragEnd,
  expanded = true, onToggleExpand, siblingGroups = [],
}: {
  item: NavItem; token: string; onMutate: () => void; isChild?: boolean; languages: Language[]; refreshTokens: () => Promise<boolean>;
  isDragging: boolean; isDragOver: boolean;
  onDragStart: () => void; onDragEnter: () => void; onDrop: () => void; onDragEnd: () => void;
  expanded?: boolean; onToggleExpand?: () => void; siblingGroups?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [href, setHref] = useState(item.href);
  const [openNewTab, setOpenNewTab] = useState(item.open_new_tab);
  const [groupLabel, setGroupLabel] = useState(item.group_label ?? "");
  const [customGroup, setCustomGroup] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Sub-items reorder among their own siblings only, scoped to this parent's
  // children array — independent drag state from the top-level list, which
  // NavigationPage manages for the parent rows themselves.
  const [draggedChildIdx, setDraggedChildIdx] = useState<number | null>(null);
  const [dragOverChildIdx, setDragOverChildIdx] = useState<number | null>(null);

  async function reorderChildren(from: number, to: number) {
    const children = item.children ?? [];
    if (from === to) return;
    const reordered = [...children];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setReordering(true);
    try {
      await Promise.all(reordered.map((c, i) => api.patch(`/navigation/${c.id}`, { sort_order: i + 1 }, token)));
      onMutate();
    } catch { toast.error("Failed to reorder"); }
    finally { setReordering(false); }
  }

  async function save() {
    try {
      await api.patch(`/navigation/${item.id}`, { label, href, open_new_tab: openNewTab, ...(isChild ? { group_label: groupLabel } : {}) }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  // Renames a whole mega-menu column in one action — group_label is stored
  // per-item (there's no separate "column" row), so renaming means patching
  // every item currently in that column to the new name, same batch pattern
  // as reordering. Empty newName ungroups every item in the column instead.
  async function renameGroup(oldName: string, newName: string) {
    const members = (item.children ?? []).filter((c) => c.group_label === oldName);
    if (members.length === 0) return;
    try {
      await Promise.all(members.map((c) => api.patch(`/navigation/${c.id}`, { group_label: newName }, token)));
      toast.success(newName ? "Column renamed" : "Column removed");
      onMutate();
    } catch { toast.error("Failed to rename column"); }
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
    <div
      className={`${isChild ? "ml-6 border-l-2 border-slate-100 pl-3" : ""} transition-opacity ${isDragging ? "opacity-40" : ""}`}
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); onDragStart(); }}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
    >
      <div className={`card p-3 mb-2 transition-colors ${!item.is_visible ? "opacity-50" : ""} ${isDragOver && !isDragging ? "!border-navy-300 !bg-navy-50/40" : ""}`}>
        <div className="flex items-center gap-3">
          <div
            className={`text-slate-300 flex-shrink-0 ${reordering ? "cursor-wait" : "cursor-grab active:cursor-grabbing"}`}
            title="Drag to reorder"
            aria-hidden="true"
          >
            <GripVertical size={15} />
          </div>
          {isChild && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
          {!isChild && (item.children?.length ?? 0) > 0 && (
            <button onClick={onToggleExpand} title={expanded ? "Collapse" : "Expand"} className="p-0.5 text-slate-400 hover:text-navy-700 flex-shrink-0">
              <ChevronRight size={14} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          )}

          {editing ? (
            <>
              <input className="input-base !py-1.5 text-sm flex-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
              <input className="input-base !py-1.5 text-sm flex-1" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/path or https://..." />
              {isChild && (customGroup || siblingGroups.length === 0 ? (
                <div className="flex items-center gap-1 flex-1">
                  <input className="input-base !py-1.5 text-sm flex-1" value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)}
                    placeholder="New column name (e.g. Explore by Topic)" />
                  {siblingGroups.length > 0 && (
                    <button type="button" onClick={() => setCustomGroup(false)} className="text-[11px] text-slate-400 hover:text-navy-700 flex-shrink-0 whitespace-nowrap">
                      Choose existing
                    </button>
                  )}
                </div>
              ) : (
                <select
                  className="input-base !py-1.5 text-sm flex-1"
                  value={groupLabel}
                  title="Groups this item into a mega-menu column alongside siblings in the same column"
                  onChange={(e) => {
                    if (e.target.value === "__new__") { setCustomGroup(true); setGroupLabel(""); }
                    else setGroupLabel(e.target.value);
                  }}
                >
                  <option value="">No column (ungrouped)</option>
                  {siblingGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                  <option value="__new__">+ New column…</option>
                </select>
              ))}
              <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap cursor-pointer">
                <input type="checkbox" checked={openNewTab} onChange={(e) => setOpenNewTab(e.target.checked)} className="rounded" />
                New tab
              </label>
              <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
              <button onClick={() => { setEditing(false); setLabel(item.label); setHref(item.href); setGroupLabel(item.group_label ?? ""); setCustomGroup(false); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-navy-900 text-sm">{item.label}</span>
                <span className="ml-2 text-xs text-slate-400 truncate">{item.href}</span>
                {item.open_new_tab && <ExternalLink size={10} className="inline ml-1 text-slate-400" />}
                {isChild && item.group_label && (
                  <span className="ml-2 text-[10px] font-semibold text-navy-500 bg-navy-50 px-1.5 py-0.5 rounded-full">{item.group_label}</span>
                )}
                {!isChild && (item.children?.length ?? 0) > 0 && (
                  <span className="ml-2 text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{item.children!.length} sub-items</span>
                )}
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

      {expanded && (item.children ?? []).map((child, idx) => {
        const children = item.children ?? [];
        // A column header renders once, right before the first item of each
        // run of same-group_label items — not a separate grouped data
        // structure, so drag-reorder can keep using the flat array's real
        // index throughout, unchanged.
        const prevGroup = idx > 0 ? children[idx - 1].group_label : null;
        const showHeader = !!child.group_label && child.group_label !== prevGroup;
        return (
          <div key={child.id}>
            {showHeader && (
              <div className="ml-9 mb-1.5 mt-3 flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-navy-600">{child.group_label}</p>
                <button
                  onClick={() => {
                    const next = window.prompt(`Rename column "${child.group_label}" to:`, child.group_label);
                    if (next !== null && next.trim() && next.trim() !== child.group_label) renameGroup(child.group_label!, next.trim());
                  }}
                  className="text-[10px] text-slate-400 hover:text-navy-700 font-medium"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    const count = children.filter((c) => c.group_label === child.group_label).length;
                    if (confirm(`Ungroup all ${count} items from "${child.group_label}"? They stay as sub-items, just no longer columned together.`)) {
                      renameGroup(child.group_label!, "");
                    }
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-600 font-medium"
                >
                  Ungroup
                </button>
              </div>
            )}
            <ItemRow
              item={child}
              token={token}
              onMutate={onMutate}
              isChild
              languages={languages}
              refreshTokens={refreshTokens}
              isDragging={draggedChildIdx === idx}
              isDragOver={dragOverChildIdx === idx}
              onDragStart={() => setDraggedChildIdx(idx)}
              onDragEnter={() => { if (draggedChildIdx !== null) setDragOverChildIdx(idx); }}
              onDrop={() => { if (draggedChildIdx !== null) reorderChildren(draggedChildIdx, idx); }}
              onDragEnd={() => { setDraggedChildIdx(null); setDragOverChildIdx(null); }}
              siblingGroups={Array.from(new Set(children.map((c) => c.group_label).filter((g): g is string => !!g)))}
            />
          </div>
        );
      })}
    </div>
  );
}

// Module-scope, not declared inside NavigationPage's body — a component
// defined inline in a render function gets a brand-new function identity
// every render, so React treats it as a different component type and
// remounts its <input> elements on every keystroke (losing focus after each
// character typed). Declaring it here once, with the field values/setters
// passed as props, keeps its identity stable across NavigationPage renders.
function AddForm({
  newLabel, setNewLabel, newHref, setNewHref, newTab, setNewTab,
  newGroup, setNewGroup, showGroup, existingGroups,
  adding, onAdd, onCancel,
}: {
  newLabel: string; setNewLabel: (v: string) => void;
  newHref: string; setNewHref: (v: string) => void;
  newTab: boolean; setNewTab: (v: boolean) => void;
  newGroup: string; setNewGroup: (v: string) => void; showGroup: boolean; existingGroups: string[];
  adding: boolean; onAdd: () => void; onCancel: () => void;
}) {
  // Picking from existing columns (not free-typing) avoids a typo silently
  // creating a near-duplicate column instead of joining the intended one —
  // "custom" mode is only for genuinely adding a brand-new column.
  const [customGroup, setCustomGroup] = useState(existingGroups.length === 0);

  return (
    <div className="card p-4 border-2 border-dashed border-slate-200 mt-2">
      <div className="flex flex-wrap gap-2">
        <input className="input-base !py-1.5 text-sm flex-1 min-w-[120px]" placeholder="Label (e.g. Blog)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <input className="input-base !py-1.5 text-sm flex-1 min-w-[120px]" placeholder="/path or https://..." value={newHref} onChange={(e) => setNewHref(e.target.value)} />
        {showGroup && (customGroup ? (
          <div className="flex items-center gap-1 flex-1 min-w-[160px]">
            <input className="input-base !py-1.5 text-sm flex-1" placeholder="New column name (e.g. Explore by Topic)"
              value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
            {existingGroups.length > 0 && (
              <button type="button" onClick={() => { setCustomGroup(false); setNewGroup(""); }}
                className="text-[11px] text-slate-400 hover:text-navy-700 flex-shrink-0 whitespace-nowrap">
                Choose existing
              </button>
            )}
          </div>
        ) : (
          <select
            className="input-base !py-1.5 text-sm flex-1 min-w-[160px]"
            value={newGroup}
            onChange={(e) => {
              if (e.target.value === "__new__") { setCustomGroup(true); setNewGroup(""); }
              else setNewGroup(e.target.value);
            }}
          >
            <option value="">No column (ungrouped)</option>
            {existingGroups.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value="__new__">+ New column…</option>
          </select>
        ))}
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer self-center">
          <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
          New tab
        </label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onAdd} disabled={adding} className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60">
          {adding ? <><span className="animate-spin">⏳</span> Adding…</> : "Add Item"}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
      </div>
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
  const [newGroup, setNewGroup] = useState("");
  const [adding, setAdding] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Collapsed by default — with items like Learning carrying 20+ sub-items,
  // always rendering every child flat made the page unusably long to scroll.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function addItem(parentId?: string) {
    if (!newLabel || !newHref) { toast.error("Label and URL are required"); return; }
    setAdding(true);
    try {
      await api.post("/navigation", {
        label: newLabel,
        href: newHref,
        open_new_tab: newTab,
        sort_order: items.length + 1,
        ...(parentId ? { parent_id: parentId, group_label: newGroup } : {}),
      }, accessToken!);
      toast.success("Added");
      setNewLabel(""); setNewHref(""); setNewTab(false); setNewGroup("");
      setShowAdd(false); setShowAddChild(null);
      mutate();
    } catch { toast.error("Failed to add"); }
    setAdding(false);
  }

  function cancelAdd() {
    setShowAdd(false); setShowAddChild(null); setNewLabel(""); setNewHref(""); setNewGroup("");
  }

  async function reorderTopLevel(from: number, to: number) {
    if (from === to) return;
    const reordered = [...items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    try {
      await Promise.all(reordered.map((it, i) => api.patch(`/navigation/${it.id}`, { sort_order: i + 1 }, accessToken!)));
      mutate();
    } catch { toast.error("Failed to reorder"); }
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

      {showAdd && (
        <AddForm
          newLabel={newLabel} setNewLabel={setNewLabel}
          newHref={newHref} setNewHref={setNewHref}
          newTab={newTab} setNewTab={setNewTab}
          newGroup={newGroup} setNewGroup={setNewGroup} showGroup={false} existingGroups={[]}
          adding={adding} onAdd={() => addItem()} onCancel={cancelAdd}
        />
      )}

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
          {items.map((item, idx) => {
            const isCertifications = item.href === "/certifications";
            const hasChildren = (item.children?.length ?? 0) > 0;
            const isExpanded = !hasChildren || expandedIds.has(item.id);
            const existingGroups = Array.from(new Set((item.children ?? []).map((c) => c.group_label).filter((g): g is string => !!g)));
            return (
            <div key={item.id}>
              <ItemRow
                item={item}
                token={accessToken!}
                onMutate={mutate}
                languages={languages}
                refreshTokens={refreshTokens}
                isDragging={draggedIdx === idx}
                isDragOver={dragOverIdx === idx}
                onDragStart={() => setDraggedIdx(idx)}
                onDragEnter={() => { if (draggedIdx !== null) setDragOverIdx(idx); }}
                onDrop={() => { if (draggedIdx !== null) reorderTopLevel(draggedIdx, idx); }}
                onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                expanded={isExpanded}
                onToggleExpand={() => toggleExpanded(item.id)}
              />
              {isExpanded && isCertifications && <CertificationsMegaMenuPreview token={accessToken!} />}
              {isExpanded && (
              <button
                onClick={() => { setShowAddChild(showAddChild === item.id ? null : item.id); setShowAdd(false); setNewLabel(""); setNewHref(""); }}
                className="ml-9 text-xs text-slate-400 hover:text-navy-700 flex items-center gap-1 mb-3"
              >
                <Plus size={11} /> Add sub-item under "{item.label}"
                {isCertifications && <span className="text-slate-300">(adds to Certification Resources)</span>}
              </button>
              )}
              {isExpanded && showAddChild === item.id && (
                <div className="ml-9">
                  <AddForm
                    newLabel={newLabel} setNewLabel={setNewLabel}
                    newHref={newHref} setNewHref={setNewHref}
                    newTab={newTab} setNewTab={setNewTab}
                    newGroup={newGroup} setNewGroup={setNewGroup} showGroup={!isCertifications} existingGroups={existingGroups}
                    adding={adding} onAdd={() => addItem(item.id)} onCancel={cancelAdd}
                  />
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6">
        Changes are live on the marketing site immediately after the next page load.
      </p>
    </div>
  );
}

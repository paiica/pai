"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Plus, Trash2, Edit3, Check, X, Loader2, Wrench,
  ToggleLeft, ToggleRight, GripVertical, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Feature = { title: string; description: string };
type Step    = { title: string; description: string };

const EMPTY_FORM = {
  slug: "", title: "", tagline: "", offered_by: "", tool_type: "course",
  price: "0", member_price: "", billing_type: "one_time",
  short_description: "", overview: "", thumbnail_url: "", badge_text: "",
  cta_label: "Add To Cart", cta_url: "", status: "draft", sort_order: "0",
  course_id: "", certification_id: "",
};

const TOOL_TYPES = [
  { value: "course",       label: "Course" },
  { value: "bundle",       label: "Bundle (group of courses)" },
  { value: "subscription", label: "Subscription" },
  { value: "external",     label: "External / Link" },
];

const BILLING_TYPES = [
  { value: "one_time", label: "One-time purchase" },
  { value: "monthly",  label: "Monthly subscription" },
  { value: "annual",   label: "Annual subscription" },
  { value: "free",     label: "Free" },
];

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-50 text-emerald-700",
  draft:    "bg-slate-100 text-slate-500",
  archived: "bg-red-50 text-red-500",
};

export default function OnlineToolsAdminPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  const { data: raw, mutate } = useSWR(
    token ? ["/online-tools/admin/all", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: coursesRaw } = useSWR(
    token ? ["/prep-courses", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: certsRaw } = useSWR(
    token ? ["/admin/certifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const tools: any[]   = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const courses: any[] = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw?.data ?? []);
  const certs: any[]   = Array.isArray(certsRaw) ? certsRaw : (certsRaw?.data ?? []);

  const [showForm, setShowForm]     = useState(false);
  const [editId,   setEditId]       = useState<string | null>(null);
  const [form,     setForm]         = useState(EMPTY_FORM);
  const [features, setFeatures]     = useState<Feature[]>([]);
  const [steps,    setSteps]        = useState<Step[]>([]);
  const [saving,   setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<"info" | "content" | "settings">("info");

  function f(k: keyof typeof EMPTY_FORM, v: string) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setFeatures([]);
    setSteps([]);
    setEditId(null);
    setActiveTab("info");
    setShowForm(true);
  }

  function startEdit(t: any) {
    setForm({
      slug:              t.slug,
      title:             t.title,
      tagline:           t.tagline ?? "",
      offered_by:        t.offered_by ?? "",
      tool_type:         t.tool_type ?? "course",
      price:             String(t.price ?? 0),
      member_price:      t.member_price != null ? String(t.member_price) : "",
      billing_type:      t.billing_type ?? "one_time",
      short_description: t.short_description ?? "",
      overview:          t.overview ?? "",
      thumbnail_url:     t.thumbnail_url ?? "",
      badge_text:        t.badge_text ?? "",
      cta_label:         t.cta_label ?? "Add To Cart",
      cta_url:           t.cta_url ?? "",
      status:            t.status ?? "draft",
      sort_order:        String(t.sort_order ?? 0),
      course_id:         t.course_id ?? "",
      certification_id:  t.certification_id ?? "",
    });
    setFeatures(Array.isArray(t.features) ? t.features : []);
    setSteps(Array.isArray(t.how_it_works) ? t.how_it_works : []);
    setEditId(t.id);
    setActiveTab("info");
    setShowForm(true);
  }

  function cancel() { setShowForm(false); setEditId(null); }

  async function save() {
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error("Slug and title are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:      Number(form.price) || 0,
        member_price: form.member_price ? Number(form.member_price) : undefined,
        sort_order: Number(form.sort_order) || 0,
        course_id:         form.course_id || undefined,
        certification_id:  form.certification_id || undefined,
        cta_url:           form.cta_url || undefined,
        features,
        how_it_works: steps,
      };
      if (editId) {
        await api.patch(`/online-tools/${editId}`, payload, token);
        toast.success("Tool updated");
      } else {
        await api.post("/online-tools", payload, token);
        toast.success("Tool created");
      }
      mutate();
      cancel();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(tool: any) {
    const next = tool.status === "active" ? "draft" : "active";
    try {
      await api.patch(`/online-tools/${tool.id}`, { status: next }, token);
      mutate();
    } catch { toast.error("Failed to update"); }
  }

  async function del(id: string) {
    if (!confirm("Delete this tool?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/online-tools/${id}`, token);
      toast.success("Deleted");
      mutate();
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  }

  // Features helpers
  function addFeature() { setFeatures(p => [...p, { title: "", description: "" }]); }
  function updateFeature(i: number, k: keyof Feature, v: string) {
    setFeatures(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f));
  }
  function removeFeature(i: number) { setFeatures(p => p.filter((_, idx) => idx !== i)); }

  // How it works helpers
  function addStep() { setSteps(p => [...p, { title: "", description: "" }]); }
  function updateStep(i: number, k: keyof Step, v: string) {
    setSteps(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  }
  function removeStep(i: number) { setSteps(p => p.filter((_, idx) => idx !== i)); }

  const tabs = [
    { id: "info",     label: "Info & Pricing" },
    { id: "content",  label: "Content" },
    { id: "settings", label: "Settings" },
  ] as const;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 mb-0.5">Online Tools</h1>
          <p className="text-slate-500 text-sm">Manage tools visible in the student portal â€” courses, bundles, subscriptions, and external resources.</p>
        </div>
        <button onClick={startNew} className="btn-primary"><Plus size={14} /> New Tool</button>
      </div>

      {/* â”€â”€ Form â”€â”€ */}
      {showForm && (
        <div className="card mb-6 border-2 border-navy-200 overflow-hidden">
          <div className="px-5 pt-4 pb-0 border-b border-slate-100">
            <p className="font-semibold text-navy-900 text-sm mb-3">{editId ? "Edit Tool" : "New Tool"}</p>
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-navy-900 text-navy-900"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* â”€â”€ TAB: Info & Pricing â”€â”€ */}
            {activeTab === "info" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Title *</label>
                    <input value={form.title} onChange={e => { f("title", e.target.value); if (!editId) f("slug", slugify(e.target.value)); }} className="input-base text-sm" placeholder="PMIstandards+â„¢ Monthly Subscription" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Slug *</label>
                    <input value={form.slug} onChange={e => f("slug", e.target.value)} className="input-base text-sm font-mono" placeholder="pmistandards-monthly" disabled={!!editId} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Tool Type</label>
                    <select value={form.tool_type} onChange={e => f("tool_type", e.target.value)} className="input-base text-sm">
                      {TOOL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Offered By</label>
                    <input value={form.offered_by} onChange={e => f("offered_by", e.target.value)} className="input-base text-sm" placeholder="PMI" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Price (USD)</label>
                    <input type="number" min={0} step={0.01} value={form.price} onChange={e => f("price", e.target.value)} className="input-base text-sm" placeholder="8.00" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Member Price (USD, blank = same)</label>
                    <input type="number" min={0} step={0.01} value={form.member_price} onChange={e => f("member_price", e.target.value)} className="input-base text-sm" placeholder="0.00 (free for members)" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Billing Type</label>
                    <select value={form.billing_type} onChange={e => f("billing_type", e.target.value)} className="input-base text-sm">
                      {BILLING_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Badge Text</label>
                    <input value={form.badge_text} onChange={e => f("badge_text", e.target.value)} className="input-base text-sm" placeholder="Free for Members" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Tagline</label>
                    <input value={form.tagline} onChange={e => f("tagline", e.target.value)} className="input-base text-sm" placeholder="Auto-renews monthly" />
                  </div>
                </div>
              </>
            )}

            {/* â”€â”€ TAB: Content â”€â”€ */}
            {activeTab === "content" && (
              <>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Thumbnail URL</label>
                    <input value={form.thumbnail_url} onChange={e => f("thumbnail_url", e.target.value)} className="input-base text-sm" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Short Description (card preview)</label>
                    <textarea rows={2} value={form.short_description} onChange={e => f("short_description", e.target.value)} className="input-base text-sm resize-none" placeholder="Provides quick access to the PMBOKÂ® Guide..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Overview (detail page)</label>
                    <textarea rows={5} value={form.overview} onChange={e => f("overview", e.target.value)} className="input-base text-sm resize-none" placeholder="Full description shown on the tool detail page..." />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label mb-0">What You'll Access (features)</label>
                    <button onClick={addFeature} className="text-xs text-navy-600 font-semibold hover:text-navy-900 flex items-center gap-1"><Plus size={12} /> Add</button>
                  </div>
                  <div className="space-y-2">
                    {features.map((feat, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            value={feat.title}
                            onChange={e => updateFeature(i, "title", e.target.value)}
                            className="input-base text-sm !py-1.5"
                            placeholder="Feature title"
                          />
                          <input
                            value={feat.description}
                            onChange={e => updateFeature(i, "description", e.target.value)}
                            className="input-base text-sm !py-1.5"
                            placeholder="Feature description"
                          />
                        </div>
                        <button onClick={() => removeFeature(i)} className="p-1.5 text-slate-400 hover:text-red-500 mt-0.5"><X size={14} /></button>
                      </div>
                    ))}
                    {features.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No features yet â€” click Add to list what students get access to.</p>
                    )}
                  </div>
                </div>

                {/* How it works */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label mb-0">How It Works (steps)</label>
                    <button onClick={addStep} className="text-xs text-navy-600 font-semibold hover:text-navy-900 flex items-center gap-1"><Plus size={12} /> Add Step</button>
                  </div>
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">{i + 1}</span>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            value={step.title}
                            onChange={e => updateStep(i, "title", e.target.value)}
                            className="input-base text-sm !py-1.5"
                            placeholder="Step title"
                          />
                          <input
                            value={step.description}
                            onChange={e => updateStep(i, "description", e.target.value)}
                            className="input-base text-sm !py-1.5"
                            placeholder="Step description"
                          />
                        </div>
                        <button onClick={() => removeStep(i)} className="p-1.5 text-slate-400 hover:text-red-500 mt-0.5"><X size={14} /></button>
                      </div>
                    ))}
                    {steps.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No steps yet â€” click Add Step to explain how the tool works.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* â”€â”€ TAB: Settings â”€â”€ */}
            {activeTab === "settings" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">CTA Button Label</label>
                    <input value={form.cta_label} onChange={e => f("cta_label", e.target.value)} className="input-base text-sm" placeholder="Add To Cart" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">CTA URL (for external / subscription)</label>
                    <input value={form.cta_url} onChange={e => f("cta_url", e.target.value)} className="input-base text-sm" placeholder="https://external-site.com/signup" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Link to Prep Course (optional)</label>
                    <select
                      value={form.course_id}
                      onChange={e => setForm(p => ({ ...p, course_id: e.target.value, certification_id: "" }))}
                      className="input-base text-sm"
                      disabled={!!form.certification_id}
                    >
                      <option value="">â€” None â€”</option>
                      {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Link to Certification (optional)</label>
                    <select
                      value={form.certification_id}
                      onChange={e => setForm(p => ({ ...p, certification_id: e.target.value, course_id: "" }))}
                      className="input-base text-sm"
                      disabled={!!form.course_id}
                    >
                      <option value="">â€” None â€”</option>
                      {certs.map((c: any) => <option key={c.id} value={c.id}>{c.acronym} â€” {c.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Status</label>
                    <select value={form.status} onChange={e => f("status", e.target.value)} className="input-base text-sm">
                      <option value="draft">Draft (hidden from students)</option>
                      <option value="active">Active (visible to students)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Sort Order</label>
                    <input type="number" min={0} value={form.sort_order} onChange={e => f("sort_order", e.target.value)} className="input-base text-sm" placeholder="0" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Form actions */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
            <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {editId ? "Update Tool" : "Create Tool"}
            </button>
            <button onClick={cancel} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
            <div className="flex-1" />
            <div className="flex gap-1.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn("text-xs px-3 py-1 rounded-lg transition-colors", activeTab === tab.id ? "bg-navy-900 text-white" : "text-slate-400 hover:text-slate-700")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ List â”€â”€ */}
      {tools.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No online tools yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a tool to make it available in the student portal.</p>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tool</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tools.map((tool) => (
                <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-navy-900">{tool.title}</p>
                      {tool.tagline && <p className="text-xs text-slate-400">{tool.tagline}</p>}
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tool.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{tool.tool_type}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">
                    {Number(tool.price) === 0 ? "Free" : `$${Number(tool.price).toFixed(2)}`}
                    {tool.billing_type !== "one_time" && tool.billing_type !== "free" && (
                      <span className="text-slate-400"> /{tool.billing_type === "monthly" ? "mo" : "yr"}</span>
                    )}
                    {tool.member_price != null && <div className="text-emerald-600">${Number(tool.member_price).toFixed(2)} members</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {tool.course_title ? `Course: ${tool.course_title}` :
                     tool.cert_acronym  ? `Cert: ${tool.cert_acronym}` : "â€”"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(tool)}>
                      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[tool.status] ?? STATUS_COLORS.draft)}>
                        {tool.status === "active"
                          ? <><ToggleRight size={12} /> Active</>
                          : <><ToggleLeft size={12} /> {tool.status}</>}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(tool)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-navy-700"><Edit3 size={13} /></button>
                      <button onClick={() => del(tool.id)} disabled={deletingId === tool.id} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40">
                        {deletingId === tool.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

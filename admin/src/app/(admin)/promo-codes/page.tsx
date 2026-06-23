"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Edit3, Check, X, Tag, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

const EMPTY_FORM = {
  code: "", description: "", discount_type: "percentage", discount_value: "", max_uses: "",
  expires_at: "", is_active: true, course_id: "", certification_id: "",
};

export default function PromoCodesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { data: raw, mutate } = useSWR(
    token ? ["/promo-codes", token] : null,
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

  const codes: any[] = Array.isArray(raw) ? raw : [];
  const courses: any[] = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw?.data ?? []);
  const certs: any[] = Array.isArray(certsRaw) ? certsRaw : (certsRaw?.data ?? []);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function startEdit(c: any) {
    setForm({
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      max_uses: c.max_uses ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
      is_active: c.is_active,
      course_id: c.course_id ?? "",
      certification_id: c.certification_id ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.code.trim() || !form.discount_value) { toast.error("Code and discount value are required"); return; }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined,
        is_active: form.is_active,
        course_id: form.course_id || undefined,
        certification_id: form.certification_id || undefined,
      };
      if (editId) {
        await api.patch(`/promo-codes/${editId}`, payload, token);
        toast.success("Promo code updated");
      } else {
        await api.post("/promo-codes", payload, token);
        toast.success("Promo code created");
      }
      mutate();
      setShowForm(false);
      setEditId(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: any) {
    try {
      await api.patch(`/promo-codes/${c.id}`, { is_active: !c.is_active }, token);
      mutate();
    } catch { toast.error("Failed to update"); }
  }

  async function del(id: string) {
    if (!confirm("Delete this promo code?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/promo-codes/${id}`, token);
      toast.success("Deleted");
      mutate();
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  }

  function scopeLabel(c: any) {
    if (c.course_id && c.course_title) return `Course: ${c.course_title}`;
    if (c.certification_id && c.certification_acronym) return `Cert: ${c.certification_acronym}`;
    return "All items";
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900 mb-0.5">Promo Codes</h1>
          <p className="text-slate-500 text-sm">Create discount codes for courses and certifications.</p>
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus size={14} /> New Code
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-6 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">{editId ? "Edit Promo Code" : "New Promo Code"}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="input-base text-sm font-mono"
                placeholder="SAVE20"
                disabled={!!editId}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="input-base text-sm" placeholder="Summer sale 20% off" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Discount Type</label>
              <select value={form.discount_type} onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value }))} className="input-base text-sm">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Discount Value {form.discount_type === "percentage" ? "(%)" : "($)"} *
              </label>
              <input type="number" min={0} max={form.discount_type === "percentage" ? 100 : undefined} value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} className="input-base text-sm" placeholder={form.discount_type === "percentage" ? "20" : "50"} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Max Uses (blank = unlimited)</label>
              <input type="number" min={1} value={form.max_uses} onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))} className="input-base text-sm" placeholder="100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Expires At (optional)</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))} className="input-base text-sm" />
            </div>

            {/* Scope — restrict to a specific course */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Restrict to Course (optional)</label>
              <select
                value={form.course_id}
                onChange={(e) => setForm((p) => ({ ...p, course_id: e.target.value, certification_id: "" }))}
                className="input-base text-sm"
                disabled={!!form.certification_id}
              >
                <option value="">— All courses —</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Scope — restrict to a specific certification */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Restrict to Certification (optional)</label>
              <select
                value={form.certification_id}
                onChange={(e) => setForm((p) => ({ ...p, certification_id: e.target.value, course_id: "" }))}
                className="input-base text-sm"
                disabled={!!form.course_id}
              >
                <option value="">— All certifications —</option>
                {certs.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-700">Active (can be used by students)</span>
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {editId ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {codes.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No promo codes yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a promo code to offer discounts to students.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Discount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-mono font-bold text-navy-900">{c.code}</span>
                      {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy-800">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      c.course_id ? "bg-blue-50 text-blue-700" :
                      c.certification_id ? "bg-purple-50 text-purple-700" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {scopeLabel(c)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c)}>
                      {c.is_active
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><ToggleRight size={14} /> Active</span>
                        : <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-semibold"><ToggleLeft size={14} /> Inactive</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-navy-700"><Edit3 size={13} /></button>
                      <button onClick={() => del(c.id)} disabled={deletingId === c.id} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40">
                        {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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

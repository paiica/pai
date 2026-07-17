"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Tag, Plus, Search, ToggleLeft, ToggleRight, Trash2,
  ChevronLeft, ChevronRight, ExternalLink, Loader2, X, Check, Edit3,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── General promo code form ──────────────────────────────────────────────────

const EMPTY_GENERAL = {
  code: "", description: "", discount_type: "percentage", discount_value: "",
  max_uses: "", expires_at: "", is_active: true, course_id: "", certification_id: "",
};

function GeneralCodesTab() {
  const { accessToken } = useAuthStore();

  const { data: raw, mutate } = useSWR(
    accessToken ? ["/promo-codes", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r)
  );
  const { data: coursesRaw } = useSWR(
    accessToken ? ["/prep-courses", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r)
  );
  const { data: certsRaw } = useSWR(
    accessToken ? ["/admin/certifications", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r)
  );

  const codes: any[] = Array.isArray(raw) ? raw : [];
  const courses: any[] = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw?.data ?? []);
  const certs: any[] = Array.isArray(certsRaw) ? certsRaw : (certsRaw?.data ?? []);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_GENERAL);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startNew() { setForm(EMPTY_GENERAL); setEditId(null); setShowForm(true); }
  function startEdit(c: any) {
    setForm({
      code: c.code, description: c.description ?? "",
      discount_type: c.discount_type, discount_value: String(c.discount_value),
      max_uses: c.max_uses ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
      is_active: c.is_active, course_id: c.course_id ?? "", certification_id: c.certification_id ?? "",
    });
    setEditId(c.id); setShowForm(true);
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
        await api.patch(`/promo-codes/${editId}`, payload, accessToken!);
        toast.success("Promo code updated");
      } else {
        await api.post("/promo-codes", payload, accessToken!);
        toast.success("Promo code created");
      }
      mutate(); setShowForm(false); setEditId(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  async function toggle(c: any) {
    try {
      await api.patch(`/promo-codes/${c.id}`, { is_active: !c.is_active }, accessToken!);
      mutate();
    } catch { toast.error("Failed to update"); }
  }

  async function del(id: string) {
    if (!confirm("Delete this promo code?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/promo-codes/${id}`, accessToken!);
      toast.success("Deleted"); mutate();
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  }

  function scopeLabel(c: any) {
    if (c.course_id && c.course_title) return `Course: ${c.course_title}`;
    if (c.certification_id && c.certification_acronym) return `Cert: ${c.certification_acronym}`;
    return "All items";
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={startNew} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> New Code
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">{editId ? "Edit Promo Code" : "New General Promo Code"}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Code *</label>
              <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="input-base text-sm font-mono" placeholder="SAVE20" disabled={!!editId} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="input-base text-sm" placeholder="Summer sale 20% off" />
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
                Value {form.discount_type === "percentage" ? "(%)" : "($)"} *
              </label>
              <input type="number" min={0} max={form.discount_type === "percentage" ? 100 : undefined}
                value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                className="input-base text-sm" placeholder={form.discount_type === "percentage" ? "20" : "50"} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Max Uses (blank = unlimited)</label>
              <input type="number" min={1} value={form.max_uses}
                onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))}
                className="input-base text-sm" placeholder="100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Expires At (optional)</label>
              <input type="date" value={form.expires_at}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                className="input-base text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Restrict to Course (optional)</label>
              <select value={form.course_id}
                onChange={(e) => setForm((p) => ({ ...p, course_id: e.target.value, certification_id: "" }))}
                className="input-base text-sm" disabled={!!form.certification_id}>
                <option value="">— All courses —</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Restrict to Certification (optional)</label>
              <select value={form.certification_id}
                onChange={(e) => setForm((p) => ({ ...p, certification_id: e.target.value, course_id: "" }))}
                className="input-base text-sm" disabled={!!form.course_id}>
                <option value="">— All certifications —</option>
                {certs.map((c: any) => <option key={c.id} value={c.id}>{c.acronym} — {c.title}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-700">Active</span>
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {editId ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
          </div>
        </div>
      )}

      {codes.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No general promo codes yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a code to offer discounts to students.</p>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Discount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Applies To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Uses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-navy-900">{c.code}</span>
                    {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
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
                    {c.used_count ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""}
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
                      <button onClick={() => del(c.id)} disabled={deletingId === c.id}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40">
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

// ─── Affiliate promo code form ────────────────────────────────────────────────

const EMPTY_AFFILIATE = {
  code: "", discount_type: "percentage", discount_value: "",
  description: "", expires_at: "", max_uses: "", affiliate_id: "",
};

function AffiliateCodesTab() {
  const { accessToken } = useAuthStore();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [affiliateFilter, setAffiliateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_AFFILIATE);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: codesData, mutate } = useSWR(
    accessToken
      ? `/admin/affiliates/promo-codes?page=${page}&limit=25&status=${statusFilter}&search=${searchQ}&affiliateId=${affiliateFilter}`
      : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const { data: repsData } = useSWR(
    accessToken ? "/admin/affiliates?page=1&limit=200" : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const codes: any[] = codesData?.data?.data ?? codesData?.data ?? [];
  const total: number = codesData?.data?.total ?? 0;
  const totalPages: number = codesData?.data?.totalPages ?? 1;
  const reps: any[] = repsData?.data?.data ?? repsData?.data ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQ(searchInput);
    setPage(1);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.affiliate_id) { toast.error("Select a sales rep"); return; }
    if (!form.code.trim() || !form.discount_value) { toast.error("Code and discount value are required"); return; }
    setSaving(true);
    try {
      await api.post(`/admin/affiliates/${form.affiliate_id}/promo-codes`, {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        description: form.description || undefined,
        expires_at: form.expires_at || undefined,
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      }, accessToken!);
      toast.success("Promo code created");
      setForm(EMPTY_AFFILIATE);
      setShowForm(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create");
    } finally { setSaving(false); }
  }

  async function handleToggle(code: any) {
    try {
      await api.patch(`/admin/affiliates/promo-codes/${code.id}`, { is_active: !code.is_active }, accessToken!);
      mutate();
    } catch { toast.error("Failed to update"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promo code?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/affiliates/promo-codes/${id}`, accessToken!);
      toast.success("Deleted"); mutate();
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Code"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">New Affiliate Promo Code</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Assign to Sales Rep *
              </label>
              <select required className="input-base" value={form.affiliate_id}
                onChange={(e) => setForm((f) => ({ ...f, affiliate_id: e.target.value }))}>
                <option value="">— Select a rep —</option>
                {reps.filter((r) => r.status === "approved").map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.email}
                    {r.referral_code ? ` (${r.referral_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Code *</label>
                <input required className="input-base font-mono uppercase" placeholder="SAVE20REP"
                  value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Type</label>
                <select className="input-base" value={form.discount_type}
                  onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
                  <option value="percentage">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">
                  Value {form.discount_type === "percentage" ? "(%)" : "($)"} *
                </label>
                <input required type="number" min="0" className="input-base"
                  value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Max Uses</label>
                <input type="number" min="1" className="input-base" placeholder="Unlimited"
                  value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Expires At</label>
                <input type="date" className="input-base"
                  value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
                <input className="input-base" placeholder="Optional"
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? "Creating…" : "Create Code"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline !text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input-base pl-9 !text-sm" placeholder="Search by code or description…"
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="btn-outline !py-2 !px-3 !text-sm">Search</button>
        </form>
        <select className="input-base !text-sm sm:w-44" value={affiliateFilter}
          onChange={(e) => { setAffiliateFilter(e.target.value); setPage(1); }}>
          <option value="">All Reps</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.email}
            </option>
          ))}
        </select>
        <select className="input-base !text-sm sm:w-36" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {codes.length === 0 ? (
        <div className="card p-16 text-center">
          <Tag size={28} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500 mb-1">No affiliate codes yet</p>
          <p className="text-sm text-slate-400">Create a code and assign it to a sales rep.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">{total} code{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sales Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Uses</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-navy-900">{c.code}</span>
                      {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.affiliate_user_id ? (
                        <Link href={`/affiliates/${c.affiliate_user_id}`}
                          className="flex items-center gap-1 text-navy-700 hover:text-navy-900 font-medium text-sm">
                          {c.affiliate_name || "Unknown"}
                          <ExternalLink size={11} className="opacity-50" />
                        </Link>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy-800">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.uses_count ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {c.expires_at ? formatDate(c.expires_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(c)} className="flex items-center gap-1 text-xs font-semibold">
                        {c.is_active
                          ? <span className="flex items-center gap-1 text-emerald-600"><ToggleRight size={15} /> Active</span>
                          : <span className="flex items-center gap-1 text-slate-400"><ToggleLeft size={15} /> Inactive</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40">
                        {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-ghost !p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-ghost !p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

type Tab = "general" | "affiliate";

export default function PromoCodesPage() {
  const [tab, setTab] = useState<Tab>("general");

  const TABS: { key: Tab; label: string; description: string }[] = [
    { key: "general",   label: "General Codes",   description: "Discount codes for any student — can be scoped to a course or certification" },
    { key: "affiliate", label: "Affiliate Codes",  description: "Codes assigned to sales reps that track referral commissions" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-black text-navy-900">Promo Codes</h1>
        <p className="text-slate-500 text-sm mt-0.5">{TABS.find((t) => t.key === tab)?.description}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === key ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "general"   && <GeneralCodesTab />}
      {tab === "affiliate" && <AffiliateCodesTab />}
    </div>
  );
}

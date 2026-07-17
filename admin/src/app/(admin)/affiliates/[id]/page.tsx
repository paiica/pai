"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, CheckCircle, Ban, DollarSign, Package, Tag,
  Save, Trash2, Plus, BarChart3, Users2, Search,
  ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  approved:  "bg-emerald-50 text-emerald-700",
  suspended: "bg-red-50 text-red-600",
};

const COMMISSION_BADGE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700",
  approved:  "bg-blue-50 text-blue-700",
  paid:      "bg-emerald-50 text-emerald-700",
};

const LEAD_BADGE: Record<string, string> = {
  new:        "bg-blue-50 text-blue-700",
  contacted:  "bg-amber-50 text-amber-700",
  purchased:  "bg-emerald-50 text-emerald-700",
  lost:       "bg-red-50 text-red-600",
};

type Tab = "overview" | "leads" | "products" | "promo-codes" | "commissions";

export default function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [commissionRate, setCommissionRate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  // Leads state
  const [leadPage, setLeadPage] = useState(1);
  const [leadStatus, setLeadStatus] = useState("");
  const [leadSearch, setLeadSearchInput] = useState("");
  const [leadSearchQ, setLeadSearchQ] = useState("");

  // Promo code form
  const [promoForm, setPromoForm] = useState({
    code: "", discount_type: "percentage", discount_value: "10",
    description: "", expires_at: "", max_uses: "",
  });

  const { data: repData, mutate } = useSWR(
    accessToken && id ? `/admin/affiliates/${id}` : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const { data: productsData } = useSWR(
    accessToken ? "/admin/affiliates/products" : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const { data: commissionsData, mutate: mutateCommissions } = useSWR(
    accessToken && id ? `/admin/affiliates/${id}/commissions` : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const { data: leadsData, mutate: mutateLeads } = useSWR(
    accessToken && id
      ? `/admin/affiliates/${id}/leads?page=${leadPage}&limit=25&status=${leadStatus}&search=${leadSearchQ}`
      : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const rep = repData?.data ?? repData ?? null;
  const productsRaw = productsData?.data ?? productsData ?? {};
  const availableCerts: any[] = productsRaw?.certifications ?? [];
  const availableCourses: any[] = productsRaw?.courses ?? [];
  const commissions: any[] = commissionsData?.data ?? commissionsData ?? [];
  const leads: any[] = leadsData?.data?.data ?? leadsData?.data ?? [];
  const leadTotal: number = leadsData?.data?.total ?? 0;
  const leadTotalPages: number = leadsData?.data?.totalPages ?? 1;

  const assignedCertIds = new Set((rep?.products ?? []).filter((p: any) => p.certification_id).map((p: any) => p.certification_id));
  const assignedCourseIds = new Set((rep?.products ?? []).filter((p: any) => p.course_id).map((p: any) => p.course_id));
  const unassignedCerts = availableCerts.filter((c) => !assignedCertIds.has(c.id));
  const unassignedCourses = availableCourses.filter((c) => !assignedCourseIds.has(c.id));

  async function handleApprove() {
    setActing(true);
    try {
      await api.patch(`/admin/affiliates/${id}/approve`, {}, accessToken!);
      toast.success("Affiliate approved");
      mutate();
    } catch { toast.error("Failed to approve"); }
    setActing(false);
  }

  async function handleSuspend() {
    setActing(true);
    try {
      await api.patch(`/admin/affiliates/${id}/suspend`, {}, accessToken!);
      toast.success("Affiliate suspended");
      mutate();
    } catch { toast.error("Failed to suspend"); }
    setActing(false);
  }

  async function handleSaveRate() {
    if (!commissionRate) return;
    setSaving(true);
    try {
      await api.patch(`/admin/affiliates/${id}/commission-rate`, { rate: parseFloat(commissionRate) }, accessToken!);
      toast.success("Commission rate updated");
      mutate();
      setCommissionRate("");
    } catch { toast.error("Failed to update rate"); }
    setSaving(false);
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await api.patch(`/admin/affiliates/${id}/notes`, { notes }, accessToken!);
      toast.success("Notes saved");
    } catch { toast.error("Failed to save notes"); }
    setSaving(false);
  }

  async function handleAssignProduct(dto: { certification_id?: string; course_id?: string }) {
    try {
      await api.post(`/admin/affiliates/${id}/products`, dto, accessToken!);
      toast.success("Product assigned");
      mutate();
    } catch { toast.error("Failed to assign product"); }
  }

  async function handleRemoveProduct(assignmentId: string) {
    try {
      await api.delete(`/admin/affiliates/${id}/products/${assignmentId}`, accessToken!);
      toast.success("Product removed");
      mutate();
    } catch { toast.error("Failed to remove product"); }
  }

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/admin/affiliates/${id}/promo-codes`, {
        code: promoForm.code,
        discount_type: promoForm.discount_type,
        discount_value: parseFloat(promoForm.discount_value),
        description: promoForm.description || undefined,
        expires_at: promoForm.expires_at || undefined,
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : undefined,
      }, accessToken!);
      toast.success("Promo code created");
      setPromoForm({ code: "", discount_type: "percentage", discount_value: "10", description: "", expires_at: "", max_uses: "" });
      mutate();
    } catch { toast.error("Failed to create promo code"); }
  }

  async function handleTogglePromo(promoId: string, isActive: boolean) {
    try {
      await api.patch(`/admin/affiliates/promo-codes/${promoId}`, { is_active: !isActive }, accessToken!);
      mutate();
    } catch { toast.error("Failed to update promo code"); }
  }

  async function handleDeletePromo(promoId: string) {
    if (!confirm("Delete this promo code?")) return;
    try {
      await api.delete(`/admin/affiliates/promo-codes/${promoId}`, accessToken!);
      toast.success("Promo code deleted");
      mutate();
    } catch { toast.error("Failed to delete promo code"); }
  }

  async function handleApproveCommission(commissionId: string) {
    try {
      await api.patch(`/admin/affiliates/commissions/${commissionId}/approve`, {}, accessToken!);
      toast.success("Commission approved");
      mutateCommissions();
    } catch { toast.error("Failed to approve commission"); }
  }

  async function handleMarkPaid(commissionId: string) {
    try {
      await api.patch(`/admin/affiliates/commissions/${commissionId}/paid`, {}, accessToken!);
      toast.success("Commission marked as paid");
      mutateCommissions();
    } catch { toast.error("Failed to mark as paid"); }
  }

  if (!rep) return <div className="p-8 text-center text-slate-400">Loading…</div>;

  const name = rep.first_name && rep.last_name ? `${rep.first_name} ${rep.last_name}` : rep.email;
  const initials = (rep.first_name?.[0] ?? rep.email[0]).toUpperCase();

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview",    label: "Overview",    icon: BarChart3  },
    { key: "leads",       label: "Leads",       icon: Users2     },
    { key: "products",    label: "Products",    icon: Package    },
    { key: "promo-codes", label: "Promo Codes", icon: Tag        },
    { key: "commissions", label: "Commissions", icon: DollarSign },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/affiliates" className="btn-ghost !p-1.5"><ArrowLeft size={16} /></Link>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Affiliates</span>
      </div>

      {/* Header card */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 bg-navy-800 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-lg font-display font-black text-navy-900">{name}</h1>
            <span className={`badge capitalize ${STATUS_BADGE[rep.status] ?? "bg-slate-100 text-slate-500"}`}>
              {rep.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">{rep.email}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            {rep.referral_code && (
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{rep.referral_code}</span>
            )}
            <span>{rep.commission_rate}% commission</span>
            <span>{rep.lead_count} leads</span>
            <span>{rep.commission_count} commissions</span>
            <span>Joined {formatDate(rep.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {rep.status !== "approved" && (
            <button onClick={handleApprove} disabled={acting}
              className="btn-primary !py-2 !px-4 !text-sm !bg-emerald-500 hover:!bg-emerald-400 flex items-center gap-1.5 disabled:opacity-50">
              <CheckCircle size={14} /> Approve
            </button>
          )}
          {rep.status === "approved" && (
            <button onClick={handleSuspend} disabled={acting}
              className="btn-outline !py-2 !px-4 !text-sm !text-red-600 !border-red-200 flex items-center gap-1.5 disabled:opacity-50">
              <Ban size={14} /> Suspend
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === key ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-navy-900 text-sm">Commission Rate</h2>
            <div className="flex gap-2">
              <input type="number" min="0" max="100" step="0.5" className="input-base"
                placeholder={`Current: ${rep.commission_rate}%`}
                value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
              <button onClick={handleSaveRate} disabled={saving || !commissionRate}
                className="btn-primary flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                <Save size={14} /> Save
              </button>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-navy-900 text-sm">Payout Info</h2>
            {rep.payout_method ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Method:</span> {rep.payout_method}</p>
                <p><span className="font-medium">Details:</span> {rep.payout_details ?? "—"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No payout info provided yet.</p>
            )}
          </div>

          <div className="card p-5 space-y-3 lg:col-span-2">
            <h2 className="font-semibold text-navy-900 text-sm">Admin Notes</h2>
            <textarea className="input-base" rows={4} placeholder="Internal notes about this affiliate…"
              value={notes || rep.notes || ""} onChange={(e) => setNotes(e.target.value)} />
            <button onClick={handleSaveNotes} disabled={saving}
              className="btn-outline flex items-center gap-1.5 !text-sm disabled:opacity-50">
              <Save size={13} /> Save Notes
            </button>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h2 className="font-semibold text-navy-900 text-sm mb-4">Performance</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Leads",       value: rep.lead_count ?? 0 },
                { label: "Commissions", value: rep.commission_count ?? 0 },
                { label: "Invites",     value: rep.invite_count ?? 0 },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-display font-black text-navy-900">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Leads ── */}
      {tab === "leads" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={(e) => { e.preventDefault(); setLeadSearchQ(leadSearch); setLeadPage(1); }}
              className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input-base pl-9 !text-sm" placeholder="Search by name or email…"
                  value={leadSearch} onChange={(e) => setLeadSearchInput(e.target.value)} />
              </div>
              <button type="submit" className="btn-outline !py-2 !px-3 !text-sm">Search</button>
            </form>
            <select className="input-base !text-sm sm:w-40"
              value={leadStatus}
              onChange={(e) => { setLeadStatus(e.target.value); setLeadPage(1); mutateLeads(); }}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="purchased">Purchased</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{leadTotal} lead{leadTotal !== 1 ? "s" : ""}</p>
            </div>

            {leads.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users2 size={20} className="text-slate-400" />
                </div>
                <p className="font-semibold text-slate-500 mb-1">No leads yet</p>
                <p className="text-sm text-slate-400">Leads appear here when this rep refers someone.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name / Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {leads.map((l: any) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{l.name ?? "—"}</p>
                            <p className="text-xs text-slate-400">{l.email}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">{l.product_name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs capitalize">{l.source ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`badge capitalize ${LEAD_BADGE[l.status] ?? "bg-slate-100 text-slate-500"}`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(l.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {leadTotalPages > 1 && (
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Page {leadPage} of {leadTotalPages}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setLeadPage((p) => Math.max(1, p - 1))} disabled={leadPage === 1}
                        className="btn-ghost !p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
                      <button onClick={() => setLeadPage((p) => Math.min(leadTotalPages, p + 1))} disabled={leadPage === leadTotalPages}
                        className="btn-ghost !p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Products ── */}
      {tab === "products" && (
        <div className="space-y-4">
          {(unassignedCerts.length > 0 || unassignedCourses.length > 0) && (
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add Product</p>
              {unassignedCerts.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {unassignedCerts.map((c: any) => (
                      <button key={c.id} onClick={() => handleAssignProduct({ certification_id: c.id })}
                        className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
                        <Plus size={11} /> {c.acronym} – {c.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {unassignedCourses.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prep Courses</p>
                  <div className="flex flex-wrap gap-2">
                    {unassignedCourses.map((c: any) => (
                      <button key={c.id} onClick={() => handleAssignProduct({ course_id: c.id })}
                        className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
                        <Plus size={11} /> {c.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(rep.products?.length ?? 0) === 0 ? (
            <div className="card p-10 text-center text-slate-400 text-sm">No products assigned yet.</div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {(rep.products ?? []).map((p: any) => (
                <div key={p.assignment_id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        p.type === "certification" ? "bg-navy-100 text-navy-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {p.type === "certification" ? "Cert" : "Course"}
                      </span>
                      <p className="font-semibold text-slate-800 text-sm">{p.title}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      ${p.price?.toFixed(2) ?? "—"} · {p.commission_override != null
                        ? `${p.commission_override}% commission (override)`
                        : `${rep.commission_rate}% commission (default)`}
                    </p>
                  </div>
                  <button onClick={() => handleRemoveProduct(p.assignment_id)}
                    className="btn-ghost !p-1.5 !text-red-500 hover:!bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Promo Codes ── */}
      {tab === "promo-codes" && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="font-semibold text-navy-900 text-sm mb-4">Create Promo Code for {name}</p>
            <form onSubmit={handleCreatePromo} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Code *</label>
                  <input required className="input-base font-mono uppercase" placeholder="SAVE20REP"
                    value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Type</label>
                  <select className="input-base" value={promoForm.discount_type}
                    onChange={(e) => setPromoForm((f) => ({ ...f, discount_type: e.target.value }))}>
                    <option value="percentage">Percent (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Value *</label>
                  <input required type="number" min="0" className="input-base"
                    value={promoForm.discount_value} onChange={(e) => setPromoForm((f) => ({ ...f, discount_value: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Uses</label>
                  <input type="number" min="1" className="input-base" placeholder="Unlimited"
                    value={promoForm.max_uses} onChange={(e) => setPromoForm((f) => ({ ...f, max_uses: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Expires At</label>
                  <input type="date" className="input-base"
                    value={promoForm.expires_at} onChange={(e) => setPromoForm((f) => ({ ...f, expires_at: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                  <input className="input-base" placeholder="Optional"
                    value={promoForm.description} onChange={(e) => setPromoForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn-primary flex items-center gap-1.5">
                <Plus size={14} /> Create Code
              </button>
            </form>
          </div>

          {(rep.promo_codes?.length ?? 0) === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-sm">No promo codes yet.</div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {(rep.promo_codes ?? []).map((c: any) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-navy-900">{c.code}</span>
                      <span className={`badge text-[10px] ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {c.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.discount_type === "percentage" ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                      {c.max_uses ? ` · ${c.uses_count}/${c.max_uses} uses` : " · unlimited uses"}
                      {c.expires_at ? ` · expires ${formatDate(c.expires_at)}` : ""}
                    </p>
                    {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleTogglePromo(c.id, c.is_active)}
                      className="btn-ghost !p-1.5 text-slate-400" title={c.is_active ? "Deactivate" : "Activate"}>
                      {c.is_active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => handleDeletePromo(c.id)}
                      className="btn-ghost !p-1.5 !text-red-400 hover:!bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Commissions ── */}
      {tab === "commissions" && (
        <div className="card overflow-hidden">
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No commissions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sale</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {commissions.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.lead?.name ?? c.lead?.email ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{c.product?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-800">${Number(c.sale_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-gold-700">${Number(c.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize ${COMMISSION_BADGE[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {c.status === "pending" && (
                            <button onClick={() => handleApproveCommission(c.id)}
                              className="btn-outline !py-1 !px-2 !text-xs">Approve</button>
                          )}
                          {c.status === "approved" && (
                            <button onClick={() => handleMarkPaid(c.id)}
                              className="btn-outline !py-1 !px-2 !text-xs !text-emerald-600 !border-emerald-200">Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Building2, Plus, Loader2, Check, X, UserPlus, Users2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Organization {
  id: string;
  name: string;
  contact_email: string;
  seats_purchased: number;
  notes: string | null;
  created_at: string;
  admins: { user: { email: string } }[];
  _count: { enrollments: number };
  price_per_seat: string | null;
  renewal_period_months: number;
  subscription_expires_at: string | null;
}

const EMPTY_ORG = { name: "", contact_email: "", seats_purchased: "", price_per_seat: "", renewal_period_months: "12" };
const EMPTY_ADMIN = { email: "", first_name: "", last_name: "" };

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const label = daysLeft < 0 ? "Expired" : daysLeft <= 30 ? `${daysLeft}d left` : null;
  if (!label) return null;
  const cls = daysLeft < 0 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${cls}`}>{label}</span>;
}

// Local date (not UTC) so the <input type="date"> shows the same calendar
// day an admin picked, regardless of timezone offset from the stored UTC ISO string.
function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function OrganizationsPage() {
  const { accessToken } = useAuthStore();

  const { data: raw, mutate } = useSWR(
    accessToken ? ["/admin/organizations", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r)
  );
  const orgs: Organization[] = Array.isArray(raw) ? raw : [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ORG);
  const [saving, setSaving] = useState(false);

  const [adminModalOrg, setAdminModalOrg] = useState<Organization | null>(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [provisioning, setProvisioning] = useState(false);

  async function createOrg() {
    if (!form.name.trim()) { toast.error("Organization name is required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/organizations", {
        name: form.name.trim(),
        contact_email: form.contact_email.trim(),
        seats_purchased: form.seats_purchased ? Number(form.seats_purchased) : 0,
        price_per_seat: form.price_per_seat ? Number(form.price_per_seat) : undefined,
        renewal_period_months: form.renewal_period_months ? Number(form.renewal_period_months) : 12,
      }, accessToken!);
      toast.success("Organization created");
      mutate(); setShowForm(false); setForm(EMPTY_ORG);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create organization");
    } finally { setSaving(false); }
  }

  async function updateSeats(org: Organization, seats: number) {
    try {
      await api.patch(`/admin/organizations/${org.id}`, { seats_purchased: seats }, accessToken!);
      toast.success("Seats updated");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update seats");
    }
  }

  async function updatePricePerSeat(org: Organization, price: number | null) {
    try {
      await api.patch(`/admin/organizations/${org.id}`, { price_per_seat: price }, accessToken!);
      toast.success("Price per seat updated");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update price");
    }
  }

  async function updateExpiry(org: Organization, expiresAt: string | null) {
    try {
      await api.patch(`/admin/organizations/${org.id}`, { subscription_expires_at: expiresAt }, accessToken!);
      toast.success(expiresAt ? "Expiration date updated" : "Expiration cleared — no expiration enforced");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update expiration date");
    }
  }

  async function provisionAdmin() {
    if (!adminModalOrg) return;
    if (!adminForm.email.trim() || !adminForm.first_name.trim() || !adminForm.last_name.trim()) {
      toast.error("Email, first name, and last name are required");
      return;
    }
    setProvisioning(true);
    try {
      const res = await api.post<{ id: string; email: string; message: string }>(`/admin/organizations/${adminModalOrg.id}/admins`, {
        email: adminForm.email.trim(),
        first_name: adminForm.first_name.trim(),
        last_name: adminForm.last_name.trim(),
      }, accessToken!);
      // Show the backend's actual message — it differs depending on whether
      // this was a brand-new account (gets a set-password email) or an
      // existing account (just granted access, no email — they already have
      // a password). A generic "email sent" toast here would be misleading
      // for the existing-user case.
      toast.success(res.message ?? "Org admin provisioned");
      setAdminModalOrg(null); setAdminForm(EMPTY_ADMIN);
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to provision org admin");
    } finally { setProvisioning(false); }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Organizations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Corporate/group accounts — seats, employees, and org admins</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Organization"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">New Organization</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="input-base text-sm" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Contact Email</label>
              <input value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                className="input-base text-sm" placeholder="hr@acme.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Seats Purchased</label>
              <input type="number" min={0} value={form.seats_purchased} onChange={(e) => setForm((p) => ({ ...p, seats_purchased: e.target.value }))}
                className="input-base text-sm" placeholder="25" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Price / Seat (USD)</label>
              <input type="number" min={0} step="0.01" value={form.price_per_seat} onChange={(e) => setForm((p) => ({ ...p, price_per_seat: e.target.value }))}
                className="input-base text-sm" placeholder="Leave blank to disable self-service billing" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Renewal Period (months)</label>
              <input type="number" min={1} value={form.renewal_period_months} onChange={(e) => setForm((p) => ({ ...p, renewal_period_months: e.target.value }))}
                className="input-base text-sm" placeholder="12" />
            </div>
          </div>
          <button onClick={createOrg} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Create
          </button>
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No organizations yet</p>
          <p className="text-slate-400 text-sm mt-1">Create one after a corporate deal closes.</p>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Org Admins</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Seats</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Price / Seat</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Enrollments</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/organizations/${org.id}`} className="font-bold text-navy-900 hover:text-teal-600 transition-colors">
                      {org.name}
                    </Link>
                    {org.contact_email && <p className="text-xs text-slate-400 mt-0.5">{org.contact_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {org.admins.length === 0 ? (
                      <span className="text-xs text-slate-400">None yet</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {org.admins.map((a) => <span key={a.user.email} className="text-xs text-slate-600">{a.user.email}</span>)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      defaultValue={org.seats_purchased}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (n !== org.seats_purchased && !Number.isNaN(n)) updateSeats(org, n);
                      }}
                      className="input-base !py-1.5 !px-2 !text-sm w-20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      $
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={org.price_per_seat ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const n = raw === "" ? null : Number(raw);
                          const current = org.price_per_seat === null ? null : Number(org.price_per_seat);
                          if (n !== current && !(n !== null && Number.isNaN(n))) updatePricePerSeat(org, n);
                        }}
                        className="input-base !py-1.5 !px-2 !text-sm w-20"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        key={org.subscription_expires_at ?? "none"}
                        type="date"
                        defaultValue={toDateInputValue(org.subscription_expires_at)}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          const newIso = raw ? new Date(`${raw}T00:00:00`).toISOString() : null;
                          const current = org.subscription_expires_at ? toDateInputValue(org.subscription_expires_at) : "";
                          if (raw !== current) updateExpiry(org, newIso);
                        }}
                        className="input-base !py-1.5 !px-2 !text-xs w-[136px]"
                      />
                      {org.subscription_expires_at && (
                        <button
                          onClick={() => updateExpiry(org, null)}
                          title="Clear expiration — no expiration enforced"
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    {expiryBadge(org.subscription_expires_at) && (
                      <div className="mt-1">{expiryBadge(org.subscription_expires_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Users2 size={13} className="text-slate-400" />
                      {org._count.enrollments}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setAdminModalOrg(org); setAdminForm(EMPTY_ADMIN); }}
                      className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5 ml-auto"
                    >
                      <UserPlus size={12} /> Add Org Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Provision org admin modal ─────────────────────────────────────────── */}
      {adminModalOrg && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Add Org Admin</h3>
            <p className="text-sm text-slate-500 mb-5">For {adminModalOrg.name}</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Email *</label>
                <input value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))}
                  className="input-base text-sm" placeholder="admin@acme.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">First Name *</label>
                  <input value={adminForm.first_name} onChange={(e) => setAdminForm((p) => ({ ...p, first_name: e.target.value }))}
                    className="input-base text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Last Name *</label>
                  <input value={adminForm.last_name} onChange={(e) => setAdminForm((p) => ({ ...p, last_name: e.target.value }))}
                    className="input-base text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdminModalOrg(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={provisionAdmin} disabled={provisioning}
                className="btn-primary flex-1 justify-center disabled:opacity-60">
                {provisioning && <Loader2 size={15} className="animate-spin" />} Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

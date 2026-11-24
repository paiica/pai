"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  GraduationCap, Plus, Loader2, Check, X, UserPlus, Users2, BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Institution {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  contact_email: string | null;
  website: string | null;
  created_at: string;
  domains: { id: string; domain: string }[];
  _count: { memberships: number; courses: number };
}

const EMPTY_INSTITUTION = { name: "", code: "", contact_email: "", website: "" };
const EMPTY_OWNER = { email: "", first_name: "", last_name: "" };

export default function InstitutionsPage() {
  const { accessToken } = useAuthStore();

  const { data: raw, mutate } = useSWR(
    accessToken ? ["/admin/institutions", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r)
  );
  const institutions: Institution[] = Array.isArray(raw) ? raw : [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_INSTITUTION);
  const [saving, setSaving] = useState(false);

  const [ownerModalInst, setOwnerModalInst] = useState<Institution | null>(null);
  const [ownerForm, setOwnerForm] = useState(EMPTY_OWNER);
  const [provisioning, setProvisioning] = useState(false);

  const [domainModalInst, setDomainModalInst] = useState<Institution | null>(null);
  const [domainValue, setDomainValue] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);

  async function createInstitution() {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/institutions", {
        name: form.name.trim(),
        code: form.code.trim(),
        contact_email: form.contact_email.trim() || undefined,
        website: form.website.trim() || undefined,
      }, accessToken!);
      toast.success("Institution created");
      mutate(); setShowForm(false); setForm(EMPTY_INSTITUTION);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create institution");
    } finally { setSaving(false); }
  }

  async function provisionOwner() {
    if (!ownerModalInst) return;
    if (!ownerForm.email.trim() || !ownerForm.first_name.trim() || !ownerForm.last_name.trim()) {
      toast.error("Email, first name, and last name are required");
      return;
    }
    setProvisioning(true);
    try {
      const res = await api.post<{ id: string; email: string; message: string }>(`/admin/institutions/${ownerModalInst.id}/owner`, {
        email: ownerForm.email.trim(),
        first_name: ownerForm.first_name.trim(),
        last_name: ownerForm.last_name.trim(),
      }, accessToken!);
      toast.success(res.message ?? "Institution owner provisioned");
      setOwnerModalInst(null); setOwnerForm(EMPTY_OWNER);
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to provision institution owner");
    } finally { setProvisioning(false); }
  }

  async function addDomain() {
    if (!domainModalInst || !domainValue.trim()) return;
    setAddingDomain(true);
    try {
      await api.post(`/admin/institutions/${domainModalInst.id}/domains`, { domain: domainValue.trim() }, accessToken!);
      toast.success("Domain added and verified");
      setDomainValue("");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add domain");
    } finally { setAddingDomain(false); }
  }

  async function removeDomain(institutionId: string, domainId: string) {
    try {
      await api.delete(`/admin/institutions/${institutionId}/domains/${domainId}`, accessToken!);
      toast.success("Domain removed");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove domain");
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Institutions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Universities & colleges — academia.paii.ca tenants, domains, and owners</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Institution"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">New Institution</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="input-base text-sm" placeholder="University of Niagara Falls Canada" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Code *</label>
              <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="input-base text-sm" placeholder="UNFC" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Contact Email</label>
              <input value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                className="input-base text-sm" placeholder="admin@unfc.ca" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Website</label>
              <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                className="input-base text-sm" placeholder="https://unfc.ca" />
            </div>
          </div>
          <button onClick={createInstitution} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Create
          </button>
        </div>
      )}

      {institutions.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No institutions yet</p>
          <p className="text-slate-400 text-sm mt-1">Create one after onboarding a university/college.</p>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Institution</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Domains</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Members</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Courses</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/institutions/${inst.id}`} className="font-bold text-navy-900 hover:text-teal-600 transition-colors">
                      {inst.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">{inst.code}{inst.contact_email ? ` · ${inst.contact_email}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {inst.domains.length === 0 ? (
                        <span className="text-xs text-slate-400">None yet</span>
                      ) : (
                        inst.domains.map((d) => (
                          <span key={d.id} className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {d.domain}
                            <button onClick={() => removeDomain(inst.id, d.id)} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
                          </span>
                        ))
                      )}
                      <button
                        onClick={() => { setDomainModalInst(inst); setDomainValue(""); }}
                        className="text-[11px] font-semibold text-navy-600 hover:text-navy-800"
                      >
                        + Add
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Users2 size={13} className="text-slate-400" />
                      {inst._count.memberships}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen size={13} className="text-slate-400" />
                      {inst._count.courses}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setOwnerModalInst(inst); setOwnerForm(EMPTY_OWNER); }}
                      className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5 ml-auto"
                    >
                      <UserPlus size={12} /> Add Owner
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Provision owner modal ─────────────────────────────────────────────── */}
      {ownerModalInst && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Add Institution Owner</h3>
            <p className="text-sm text-slate-500 mb-5">For {ownerModalInst.name}</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Email *</label>
                <input value={ownerForm.email} onChange={(e) => setOwnerForm((p) => ({ ...p, email: e.target.value }))}
                  className="input-base text-sm" placeholder="admin@unfc.ca" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">First Name *</label>
                  <input value={ownerForm.first_name} onChange={(e) => setOwnerForm((p) => ({ ...p, first_name: e.target.value }))}
                    className="input-base text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Last Name *</label>
                  <input value={ownerForm.last_name} onChange={(e) => setOwnerForm((p) => ({ ...p, last_name: e.target.value }))}
                    className="input-base text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOwnerModalInst(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={provisionOwner} disabled={provisioning}
                className="btn-primary flex-1 justify-center disabled:opacity-60">
                {provisioning && <Loader2 size={15} className="animate-spin" />} Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add domain modal ──────────────────────────────────────────────────── */}
      {domainModalInst && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Add Domain</h3>
            <p className="text-sm text-slate-500 mb-5">For {domainModalInst.name} — manually verified, students registering with this domain auto-join.</p>
            <input value={domainValue} onChange={(e) => setDomainValue(e.target.value)}
              className="input-base text-sm mb-5" placeholder="unfc.ca" />
            <div className="flex gap-3">
              <button onClick={() => setDomainModalInst(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={addDomain} disabled={addingDomain}
                className="btn-primary flex-1 justify-center disabled:opacity-60">
                {addingDomain && <Loader2 size={15} className="animate-spin" />} Add & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

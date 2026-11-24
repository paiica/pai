"use client";

import { useState } from "react";
import useSWR from "swr";
import { Package as PackageIcon, Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Package {
  id: string;
  name: string;
  tier: "starter" | "professional" | "enterprise";
  monthly_price: string | null;
  student_limit: number | null;
  professor_limit: number | null;
  course_limit: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

const EMPTY = { name: "", tier: "starter" as Package["tier"], monthly_price: "", student_limit: "", professor_limit: "", course_limit: "", features: "" };

const TIER_LABEL: Record<Package["tier"], string> = { starter: "Starter", professional: "Professional", enterprise: "Enterprise" };

function limitLabel(n: number | null) {
  return n == null ? "Unlimited" : String(n);
}

export default function PackagesPage() {
  const { accessToken } = useAuthStore();

  const { data: raw, mutate } = useSWR(
    accessToken ? ["/admin/packages", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r)
  );
  const packages: Package[] = Array.isArray(raw) ? raw : [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function createPackage() {
    if (!form.name.trim()) { toast.error("Package name is required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/packages", {
        name: form.name.trim(),
        tier: form.tier,
        monthly_price: form.monthly_price ? Number(form.monthly_price) : null,
        student_limit: form.student_limit ? Number(form.student_limit) : null,
        professor_limit: form.professor_limit ? Number(form.professor_limit) : null,
        course_limit: form.course_limit ? Number(form.course_limit) : null,
        features: form.features.split(",").map((f) => f.trim().toUpperCase()).filter(Boolean),
      }, accessToken!);
      toast.success("Package created");
      mutate(); setShowForm(false); setForm(EMPTY);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create package");
    } finally { setSaving(false); }
  }

  async function updateField(pkg: Package, field: string, value: any) {
    try {
      await api.patch(`/admin/packages/${pkg.id}`, { [field]: value }, accessToken!);
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update package");
    }
  }

  async function togglePriceActive(pkg: Package) {
    await updateField(pkg, "is_active", !pkg.is_active);
    toast.success(pkg.is_active ? "Package deactivated" : "Package activated");
  }

  async function deletePackage(pkg: Package) {
    if (!confirm(`Delete "${pkg.name}"? Only allowed if no institution has ever subscribed to it.`)) return;
    try {
      await api.delete(`/admin/packages/${pkg.id}`, accessToken!);
      toast.success("Package deleted");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete package");
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Packages</h1>
          <p className="text-slate-500 text-sm mt-0.5">Academic Cloud subscription tiers — pricing, limits, and features for institutions</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Package"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-navy-200">
          <p className="font-semibold text-navy-900 text-sm mb-4">New Package</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-base text-sm" placeholder="Professional" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Tier</label>
              <select value={form.tier} onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value as Package["tier"] }))} className="input-base text-sm">
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Monthly Price (USD)</label>
              <input type="number" min={0} step="0.01" value={form.monthly_price} onChange={(e) => setForm((p) => ({ ...p, monthly_price: e.target.value }))} className="input-base text-sm" placeholder="Leave blank for custom/contact-us" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Student Limit</label>
              <input type="number" min={0} value={form.student_limit} onChange={(e) => setForm((p) => ({ ...p, student_limit: e.target.value }))} className="input-base text-sm" placeholder="Leave blank for unlimited" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Professor Limit</label>
              <input type="number" min={0} value={form.professor_limit} onChange={(e) => setForm((p) => ({ ...p, professor_limit: e.target.value }))} className="input-base text-sm" placeholder="Leave blank for unlimited" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Course Limit</label>
              <input type="number" min={0} value={form.course_limit} onChange={(e) => setForm((p) => ({ ...p, course_limit: e.target.value }))} className="input-base text-sm" placeholder="Leave blank for unlimited" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Features (comma-separated)</label>
              <input value={form.features} onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))} className="input-base text-sm" placeholder="PRIVATE_COURSES, CERTIFICATES, ANALYTICS" />
            </div>
          </div>
          <button onClick={createPackage} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Create
          </button>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="card p-12 text-center">
          <PackageIcon size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No packages yet</p>
          <p className="text-slate-400 text-sm mt-1">Create Starter/Professional/Enterprise tiers for institutions to subscribe to.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`card p-5 ${!pkg.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">{TIER_LABEL[pkg.tier]}</span>
                <button onClick={() => deletePackage(pkg)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="font-display font-black text-navy-900 text-lg mb-1">{pkg.name}</h3>
              <p className="text-2xl font-display font-black text-navy-900 mb-4">
                {pkg.monthly_price != null ? `$${Number(pkg.monthly_price).toFixed(0)}/mo` : "Contact us"}
              </p>
              <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                <p>Students: {limitLabel(pkg.student_limit)}</p>
                <p>Professors: {limitLabel(pkg.professor_limit)}</p>
                <p>Courses: {limitLabel(pkg.course_limit)}</p>
              </div>
              {pkg.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {pkg.features.map((f) => (
                    <span key={f} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              )}
              <button onClick={() => togglePriceActive(pkg)} className="btn-outline !py-1.5 !px-3 !text-xs w-full justify-center">
                {pkg.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

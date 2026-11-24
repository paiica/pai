"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2, Save, ShieldCheck, Check, X, ExternalLink, ImagePlus, Plus, Trash2, RefreshCw, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { uploadFile } from "@/lib/upload";

interface Domain {
  id: string; domain: string; verification_method: string; verified_at: string | null; verification_token: string | null;
}

interface InstitutionSettings {
  id: string; name: string; code: string; slug: string; logo_url: string | null; description: string | null; website: string | null;
  domains: Domain[];
}

interface SsoConfig {
  provider: string; issuer_url: string; client_id: string; is_enabled: boolean; has_client_secret: boolean;
}

export default function SettingsPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();

  const { data, isLoading, mutate } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/settings`, accessToken] : null,
    ([url, token]) => api.get<InstitutionSettings>(url, token),
  );

  const [form, setForm] = useState({ name: "", logo_url: "", description: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setForm({ name: data.name, logo_url: data.logo_url ?? "", description: data.description ?? "", website: data.website ?? "" });
  }, [data]);

  async function save(overrides?: Partial<typeof form>) {
    const values = { ...form, ...overrides };
    setSaving(true);
    try {
      await api.patch(`/institutions/${currentInstitutionId}/settings`, {
        name: values.name.trim(),
        logo_url: values.logo_url.trim() || null,
        description: values.description.trim() || null,
        website: values.website.trim() || null,
      }, accessToken!);
      toast.success("Settings saved");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save settings");
    } finally { setSaving(false); }
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { url } = await uploadFile(file, "logo", accessToken!);
      setForm((p) => ({ ...p, logo_url: url }));
      await save({ logo_url: url });
    } catch (err: any) {
      toast.error(err.message ?? "Logo upload failed");
    } finally { setUploadingLogo(false); }
  }

  if (isLoading || !data) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={28} /></div>;
  }

  const storefrontUrl = `${process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}/institutions/${data.slug}`;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-navy-900 text-sm">Institution Profile</p>
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1">
            <ExternalLink size={12} /> View public page
          </a>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Logo</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.logo_url ? <img src={form.logo_url} alt="Institution logo" className="w-full h-full object-contain" /> : <ImagePlus size={20} className="text-slate-300" />}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-60 flex items-center gap-1.5">
                {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : null}
                {form.logo_url ? "Replace logo" : "Upload logo"}
              </button>
              <p className="text-[11px] text-slate-400 mt-1">PNG or JPG, square works best</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Name</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-base text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Website</label>
          <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className="input-base text-sm" placeholder="https://…" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="input-base text-sm" rows={3} />
        </div>
        <button onClick={() => save()} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
        </button>
      </div>

      <DomainsCard domains={data.domains} onChanged={mutate} />

      <SsoSection institutionCode={data.code} />
    </div>
  );
}

function DomainsCard({ domains, onChanged }: { domains: Domain[]; onChanged: () => void }) {
  const { accessToken, currentInstitutionId } = useAuthStore();
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function addDomain() {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      await api.post(`/institutions/${currentInstitutionId}/domains`, { domain: newDomain.trim() }, accessToken!);
      toast.success("Domain added — publish the TXT record below, then verify");
      setNewDomain("");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add domain");
    } finally { setAdding(false); }
  }

  async function verify(domainId: string) {
    setVerifying(domainId);
    try {
      await api.post(`/institutions/${currentInstitutionId}/domains/${domainId}/verify`, {}, accessToken!);
      toast.success("Domain verified");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Verification failed");
    } finally { setVerifying(null); }
  }

  async function remove(domainId: string) {
    if (!confirm("Remove this domain? Students will no longer auto-join with it.")) return;
    setRemoving(domainId);
    try {
      await api.delete(`/institutions/${currentInstitutionId}/domains/${domainId}`, accessToken!);
      toast.success("Domain removed");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove domain");
    } finally { setRemoving(null); }
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    toast.success("Copied");
  }

  return (
    <div className="card p-5">
      <p className="font-semibold text-navy-900 text-sm mb-1">Email Domains</p>
      <p className="text-xs text-slate-400 mb-4">Students registering with a verified domain join your institution automatically. Add a domain and prove you control it with a DNS TXT record.</p>

      {domains.length > 0 && (
        <div className="space-y-3 mb-4">
          {domains.map((d) => (
            <div key={d.id} className="border border-slate-100 rounded-xl px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-navy-900 truncate">{d.domain}</span>
                  {d.verified_at ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">Verified</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">Pending verification</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {!d.verified_at && d.verification_method === "dns" && (
                    <button onClick={() => verify(d.id)} disabled={verifying === d.id} className="text-slate-400 hover:text-navy-600 transition-colors" title="Check DNS and verify">
                      {verifying === d.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    </button>
                  )}
                  <button onClick={() => remove(d.id)} disabled={removing === d.id} className="text-slate-300 hover:text-red-500 transition-colors" title="Remove domain">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {!d.verified_at && d.verification_method === "dns" && d.verification_token && (
                <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2.5 text-xs">
                  <p className="text-slate-500 mb-2">Add this TXT record at your DNS provider, then click verify:</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
                    <span className="text-slate-400">Type</span><span className="text-navy-800">TXT</span>
                    <span className="text-slate-400">Name</span><span className="text-navy-800 break-all">_paii-verify.{d.domain}</span>
                    <span className="text-slate-400">Value</span>
                    <span className="text-navy-800 break-all flex items-center gap-1.5">
                      {d.verification_token}
                      <button onClick={() => copyToken(d.verification_token!)} className="text-slate-400 hover:text-navy-600"><Copy size={11} /></button>
                    </span>
                  </div>
                  <p className="text-slate-400 mt-2">DNS changes can take a few minutes to propagate.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="youruniversity.edu" className="input-base text-sm flex-1" />
        <button onClick={addDomain} disabled={adding || !newDomain.trim()} className="btn-primary !py-2 !px-3 !text-xs disabled:opacity-60 flex items-center gap-1.5">
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
        </button>
      </div>
    </div>
  );
}

function SsoSection({ institutionCode }: { institutionCode: string }) {
  const { accessToken, currentInstitutionId } = useAuthStore();

  const { data: sso, mutate } = useSWR(
    accessToken && currentInstitutionId ? [`/sso/institutions/${currentInstitutionId}/config`, accessToken] : null,
    ([url, token]) => api.get<SsoConfig | null>(url, token),
  );

  const [form, setForm] = useState({ issuer_url: "", client_id: "", client_secret: "", is_enabled: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sso) setForm({ issuer_url: sso.issuer_url, client_id: sso.client_id, client_secret: "", is_enabled: sso.is_enabled });
  }, [sso]);

  async function save() {
    if (!form.issuer_url.trim() || !form.client_id.trim()) { toast.error("Issuer URL and Client ID are required"); return; }
    if (!sso?.has_client_secret && !form.client_secret.trim()) { toast.error("Client Secret is required"); return; }
    setSaving(true);
    try {
      await api.put(`/sso/institutions/${currentInstitutionId}/config`, {
        issuer_url: form.issuer_url.trim(),
        client_id: form.client_id.trim(),
        client_secret: form.client_secret.trim() || undefined,
        is_enabled: form.is_enabled,
      }, accessToken!);
      toast.success("SSO settings saved");
      setForm((p) => ({ ...p, client_secret: "" }));
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save SSO settings");
    } finally { setSaving(false); }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-teal-600" />
        <p className="font-semibold text-navy-900 text-sm">Single Sign-On (OIDC)</p>
      </div>
      <p className="text-xs text-slate-400">
        Let your students/staff sign in with your own identity provider (Google Workspace, Microsoft Entra ID, Okta, etc.)
        instead of a PAII password. Your institution code for the SSO login screen is <span className="font-mono font-semibold text-navy-700">{institutionCode}</span>.
      </p>

      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Issuer URL</label>
        <input value={form.issuer_url} onChange={(e) => setForm((p) => ({ ...p, issuer_url: e.target.value }))} className="input-base text-sm" placeholder="https://accounts.google.com" />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Client ID</label>
        <input value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))} className="input-base text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">
          Client Secret {sso?.has_client_secret && <span className="text-slate-400 normal-case font-normal">(already set — leave blank to keep it)</span>}
        </label>
        <input type="password" value={form.client_secret} onChange={(e) => setForm((p) => ({ ...p, client_secret: e.target.value }))} className="input-base text-sm" placeholder={sso?.has_client_secret ? "••••••••" : ""} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((p) => ({ ...p, is_enabled: e.target.checked }))} />
        Enabled — students can sign in via SSO
      </label>

      {sso && (
        <p className="text-xs flex items-center gap-1.5">
          {sso.is_enabled ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-slate-400" />}
          <span className={sso.is_enabled ? "text-emerald-700" : "text-slate-400"}>{sso.is_enabled ? "SSO is live" : "SSO is configured but not enabled"}</span>
        </p>
      )}

      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
      </button>
    </div>
  );
}

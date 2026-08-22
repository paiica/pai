"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Save, Loader2, Palette, Upload, Eye, Copy, Check, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Same presign-free upload endpoint the main Settings page's branding fields
// use, reused here for the certificate logo/seal.
async function uploadImage(file: File, token: string, refreshTokens: () => Promise<boolean>): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  let activeToken = token;
  let res = await fetch(`${API_BASE}/uploads/content-image?purpose=branding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${activeToken}` },
    body: formData,
  });
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (!refreshed) throw new Error("Session expired — please sign in again");
    activeToken = useAuthStore.getState().accessToken!;
    res = await fetch(`${API_BASE}/uploads/content-image?purpose=branding`, {
      method: "POST",
      headers: { Authorization: `Bearer ${activeToken}` },
      body: formData,
    });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message ?? "Upload failed");
  const url = json?.data?.url ?? json?.url;
  if (!url) throw new Error("Upload succeeded but no URL was returned");
  return url;
}

const VARIABLES: [string, string][] = [
  ["{{STUDENT_NAME}}",        "Student's full name"],
  ["{{CERT_TITLE}}",          "Full certification/program title"],
  ["{{CERT_ACRONYM}}",        "Acronym (e.g. CAIP) — blank for programs"],
  ["{{CERT_NUMBER}}",         "Unique certificate number"],
  ["{{ISSUE_DATE}}",          "Date certificate was issued"],
  ["{{EXPIRY_DATE}}",         "Certificate expiry date"],
  ["{{EXAM_SCORE}}",          "Exam score percentage — blank for programs"],
  ["{{VERIFICATION_URL}}",    "Public verification link"],
  ["{{QR_CODE_URL}}",         "QR code image src (verification)"],
  ["{{LOGO_URL}}",            "Logo — set below, CORS-safe by default"],
  ["{{SEAL_URL}}",            "Official seal — set below, CORS-safe by default"],
  ["{{SIGNATORY_NAME}}",          "Signatory's cursive signature text — set below"],
  ["{{SIGNATORY_FULL_TITLE}}",    "Signatory's printed name — set below"],
  ["{{SIGNATORY_ROLE}}",          "Signatory's role/title — set below"],
];

const SAMPLE_TOKENS: Record<string, string> = {
  STUDENT_NAME: "Jane Smith",
  CERT_TITLE: "Certified AI Professional",
  CERT_ACRONYM: "CAIP",
  CERT_NUMBER: "PAII-CAIP-2025-SAMPLE",
  ISSUE_DATE: "June 19, 2025",
  EXPIRY_DATE: "June 19, 2027",
  EXAM_SCORE: "91.5",
  VERIFICATION_URL: "https://paii.ca/verify?id=PAII-SAMPLE",
  QR_CODE_URL: "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://paii.ca/verify?id=PAII-SAMPLE",
};

export default function CertificateTemplatePage() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, mutate } = useSWR(
    accessToken ? ["/site-settings", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t)
  );

  const [logoUrl,   setLogoUrl]   = useState("");
  const [sealUrl,   setSealUrl]   = useState("");
  const [sigName,   setSigName]   = useState("");
  const [sigTitle,  setSigTitle]  = useState("");
  const [sigRole,   setSigRole]   = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [defaultTemplateHtml, setDefaultTemplateHtml] = useState(""); // as-loaded, for Reset
  const [preview, setPreview] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const sealFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setLogoUrl(data.certificate_logo_url ?? "");
      setSealUrl(data.certificate_seal_url ?? "");
      setSigName(data.certificate_signatory_name ?? "");
      setSigTitle(data.certificate_signatory_full_title ?? "");
      setSigRole(data.certificate_signatory_role ?? "");
      setTemplateHtml(data.certificate_default_template_html ?? "");
      setDefaultTemplateHtml(data.certificate_default_template_html ?? "");
    }
  }, [data]);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void,
    label: string,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, accessToken, refreshTokens);
      setUrl(url);
      toast.success(`${label} uploaded — click Save to publish it`);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      certificate_logo_url: logoUrl,
      certificate_seal_url: sealUrl,
      certificate_signatory_name: sigName,
      certificate_signatory_full_title: sigTitle,
      certificate_signatory_role: sigRole,
      certificate_default_template_html: templateHtml,
    };
    try {
      let token = accessToken!;
      try {
        await api.patch<any>("/site-settings", body, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) { toast.error("Session expired — please sign in again"); return; }
          token = useAuthStore.getState().accessToken!;
          await api.patch<any>("/site-settings", body, token);
        } else {
          throw err;
        }
      }
      await mutate();
      toast.success("Certificate template saved — applies to every certificate that doesn't have its own custom template");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const previewHtml = (() => {
    let html = templateHtml;
    for (const [key, value] of Object.entries(SAMPLE_TOKENS)) {
      html = html.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), value);
    }
    return html
      .replace(/\{\{\s*LOGO_URL\s*\}\}/gi, logoUrl || "/paii-icon.png")
      .replace(/\{\{\s*SEAL_URL\s*\}\}/gi, sealUrl || "/paii-seal.png")
      .replace(/\{\{\s*SIGNATORY_NAME\s*\}\}/gi, sigName || "Signatory Name")
      .replace(/\{\{\s*SIGNATORY_FULL_TITLE\s*\}\}/gi, sigTitle || "Full Title")
      .replace(/\{\{\s*SIGNATORY_ROLE\s*\}\}/gi, sigRole || "Role");
  })();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={20} className="text-navy-600" />
          <h1 className="text-2xl font-display font-black text-navy-900">Certificate Template</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Central logo, seal, signature, and default template for every certificate on the site — accredited certifications,
          program completion certificates, and course-completion certificates. A certification or program can still override
          this with its own custom template in its own editor; leaving that field blank uses this default.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo & Seal */}
        <div className="card p-6">
          <h2 className="font-semibold text-navy-900 mb-5">Logo & Seal</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Certificate Logo</label>
              <div className="flex items-center gap-2">
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/paii-icon.png (default — same-origin, CORS-safe)" className="input-base flex-1" />
                <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleUpload(e, setLogoUrl, setUploadingLogo, "Logo")} />
                <button type="button" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-navy-700 transition-colors disabled:opacity-50">
                  {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Upload
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Leave blank to use the built-in default. Uploaded images may not appear in PNG downloads if hosted somewhere without CORS headers — PDF/print is unaffected either way.
              </p>
              {logoUrl && (
                <div className="mt-3 flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <img src={logoUrl} alt="Logo" style={{ height: 48 }} className="w-auto object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Seal</label>
              <div className="flex items-center gap-2">
                <input type="url" value={sealUrl} onChange={(e) => setSealUrl(e.target.value)}
                  placeholder="/paii-seal.png (default — same-origin, CORS-safe)" className="input-base flex-1" />
                <input ref={sealFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleUpload(e, setSealUrl, setUploadingSeal, "Seal")} />
                <button type="button" onClick={() => sealFileRef.current?.click()} disabled={uploadingSeal}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-navy-700 transition-colors disabled:opacity-50">
                  {uploadingSeal ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Upload
                </button>
              </div>
              {sealUrl && (
                <div className="mt-3 flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <img src={sealUrl} alt="Seal" style={{ height: 80 }} className="w-auto object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signatory */}
        <div className="card p-6">
          <h2 className="font-semibold text-navy-900 mb-1.5">Signatory</h2>
          <p className="text-xs text-slate-400 mb-5">Shown in the signature block on every certificate. Change these once here instead of editing every template.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Signature (cursive display name)</label>
              <input type="text" value={sigName} onChange={(e) => setSigName(e.target.value)}
                placeholder="Zahid Hussain" className="input-base" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Printed Name (with honorific)</label>
                <input type="text" value={sigTitle} onChange={(e) => setSigTitle(e.target.value)}
                  placeholder="Dr. Zahid Hussain" className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
                <input type="text" value={sigRole} onChange={(e) => setSigRole(e.target.value)}
                  placeholder="Managing Director" className="input-base" />
              </div>
            </div>
          </div>
        </div>

        {/* Default template */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="font-semibold text-navy-900">Default Template</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { if (confirm("Reset to the last-saved default template? Unsaved edits will be lost.")) setTemplateHtml(defaultTemplateHtml); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                disabled={!templateHtml.trim()}
                className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye size={13} /> {preview ? "Edit" : "Preview"}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Used for every certificate that doesn't have its own custom template. Size the sheet for A4 landscape (<code className="font-mono">297mm x 210mm</code>) so PNG/PDF exports come out as a single full page.
          </p>

          {/* Variable reference */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Placeholders</p>
            <div className="grid grid-cols-2 gap-2">
              {VARIABLES.map(([variable, desc]) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(variable);
                    setCopiedVar(variable);
                    setTimeout(() => setCopiedVar(null), 1500);
                  }}
                  className="flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-navy-300 hover:bg-navy-50 transition-colors group"
                >
                  <div>
                    <code className="text-[11px] font-mono font-bold text-navy-700">{variable}</code>
                    <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <span className="text-slate-300 group-hover:text-navy-400 flex-shrink-0">
                    {copiedVar === variable ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {preview && templateHtml ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
              <div className="bg-slate-200 px-3 py-1.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Preview — sample data</span>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full"
                style={{ height: "600px", border: "none" }}
                title="Certificate preview"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          ) : (
            <textarea
              className="input-base font-mono text-xs resize-y"
              style={{ minHeight: "420px" }}
              value={templateHtml}
              onChange={(e) => setTemplateHtml(e.target.value)}
              spellCheck={false}
            />
          )}
          {templateHtml && (
            <p className="text-[10px] text-slate-400 mt-2">
              {templateHtml.length.toLocaleString()} characters · Click Save to publish.
            </p>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Certificate Template
        </button>
      </form>
    </div>
  );
}

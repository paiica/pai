"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle, AlertCircle, Award, Calendar, Shield, Clock } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

interface VerifyResult {
  found: boolean;
  certificate?: {
    certificate_id: string;
    student_name: string;
    student_email: string;
    certification_title: string;
    certification_acronym: string;
    issue_date: string;
    expiry_date: string;
    status: string;
    score: number;
  };
  error?: string;
}

export default function VerifyForm() {
  const [certificateId, setCertificateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!certificateId.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/verify?id=${encodeURIComponent(certificateId.trim().toUpperCase())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, error: "Verification service unavailable. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Search Form */}
      <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-navy-800 rounded-xl flex items-center justify-center">
            <Search size={18} className="text-gold-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-navy-900 text-lg">Certificate Lookup</h2>
            <p className="text-slate-500 text-sm">Enter the Certificate ID from the credential</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="cert-id" className="block text-sm font-semibold text-slate-700 mb-2">
              Certificate ID
            </label>
            <div className="relative">
              <input
                id="cert-id"
                type="text"
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                placeholder="e.g. CAIP-2026-00001"
                className="w-full px-4 py-4 pr-12 rounded-xl border-2 border-slate-200 focus:border-navy-400 focus:ring-4 focus:ring-navy-100 outline-none text-slate-900 font-mono text-lg uppercase transition-all placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 placeholder:text-base"
                maxLength={20}
              />
              {certificateId && (
                <button
                  type="button"
                  onClick={() => { setCertificateId(""); setResult(null); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Format: {"{"}ACRONYM{"}"}-{"{"}YEAR{"}"}-{"{"}5-digit sequence{"}"} — e.g., CAIP-2026-00001
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !certificateId.trim()}
            className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 text-base"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Search size={18} />
                Verify Certificate
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          {result.found && result.certificate ? (
            <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-card p-8 animate-slide-up">
              {/* Status header */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-emerald-700 text-xl">Certificate Verified ✓</h3>
                  <p className="text-slate-500 text-sm">This is a valid, authentic PAI certificate</p>
                </div>
                <div className="ml-auto">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border capitalize ${getStatusColor(result.certificate.status)}`}>
                    {result.certificate.status}
                  </span>
                </div>
              </div>

              {/* Certificate details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {[
                  { icon: Award, label: "Certificate Holder", value: result.certificate.student_name },
                  { icon: Shield, label: "Credential", value: `${result.certificate.certification_title} (${result.certificate.certification_acronym})` },
                  { icon: Calendar, label: "Issue Date", value: formatDate(result.certificate.issue_date) },
                  { icon: Clock, label: "Expiry Date", value: formatDate(result.certificate.expiry_date) },
                  { icon: Search, label: "Certificate ID", value: result.certificate.certificate_id },
                  { icon: CheckCircle2, label: "Exam Score", value: `${result.certificate.score}%` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
                    <Icon size={16} className="text-gold-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-0.5">{label}</div>
                      <div className="text-navy-900 font-semibold text-sm">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAI signature */}
              <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-gold-400 font-display font-black text-xs">PAI</span>
                </div>
                <p className="text-navy-700 text-xs leading-relaxed">
                  This certificate has been verified by the Professional AI Institute registry.
                  Verification completed on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-red-200 shadow-card p-8 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                  <XCircle size={28} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-red-700 text-xl">Certificate Not Found</h3>
                  <p className="text-slate-500 text-sm">No valid certificate matches this ID</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-amber-700 text-sm leading-relaxed">
                  <p className="font-semibold mb-1">This could mean:</p>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>The Certificate ID was entered incorrectly — please double-check</li>
                    <li>The certificate was issued by a different organization</li>
                    <li>The certificate has been revoked for fraud or misuse</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    If you believe this is an error, contact{" "}
                    <a href="mailto:verify@professionalaiinstitute.com" className="underline font-semibold">
                      verify@professionalaiinstitute.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Printer, AlertTriangle, Award } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export default function ProgramCertificatePage() {
  const t = useTranslations("ProgramCertificate");
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const user = useAuthStore((s) => s.user);

  const { data: cert, isLoading, error } = useSWR(
    token && id ? [`/programs/${id}/certificate`, token] : null,
    ([url, t]) => fetcher(url, t),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-sm font-semibold mb-1">{t("noCertificateFound")}</p>
          <Link href={`/programs/${id}`} className="text-xs text-teal-700 hover:underline">{t("backToProgram")}</Link>
        </div>
      </div>
    );
  }

  const studentName = `${user?.profile?.first_name ?? ""} ${user?.profile?.last_name ?? ""}`.trim() || user?.email || t("studentFallback");
  const templateHtml: string = cert.program?.marketing_meta?.certificate_template_html || "";
  const isRevoked = cert.status === "revoked";

  const filledHtml = templateHtml
    ? templateHtml
        .replace(/\{\{STUDENT_NAME\}\}/g, studentName)
        .replace(/\{\{PROGRAM_TITLE\}\}/g, cert.program?.title ?? "")
        .replace(/\{\{CERT_NUMBER\}\}/g, cert.certificate_number)
        .replace(/\{\{ISSUE_DATE\}\}/g, formatDate(cert.issued_at))
    : "";

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10 print:py-0 print:px-0 print:max-w-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href={`/programs/${id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft size={12} /> {t("backToProgram")}
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Printer size={13} /> {t("printSaveAsPdf")}
          </button>
        </div>

        {isRevoked && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 print:hidden">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">{t("certificateRevoked")}</p>
              {cert.revocation_reason && <p className="text-xs text-red-600 mt-0.5">{cert.revocation_reason}</p>}
            </div>
          </div>
        )}

        {templateHtml ? (
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg print:border-0 print:shadow-none print:rounded-none">
            <iframe
              srcDoc={filledHtml}
              className="w-full"
              style={{ height: "700px", border: "none" }}
              title="Certificate"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="rounded-2xl border-4 border-double border-navy-900 bg-white p-12 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-navy-900 text-white flex items-center justify-center mx-auto mb-6">
              <Award size={28} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-3">{t("certificateOfCompletion")}</p>
            <h1 className="text-3xl font-display font-black text-navy-900 mb-6">{cert.title}</h1>
            <p className="text-sm text-slate-500 mb-1">{t("thisCertifiesThat")}</p>
            <p className="text-2xl font-display font-bold text-navy-900 mb-6">{studentName}</p>
            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
              {t("hasSuccessfullyCompleted")}<br />
              <span className="font-semibold text-navy-800">{cert.program?.title}</span>
            </p>
            <div className="flex items-center justify-center gap-10 pt-6 border-t border-slate-200">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t("certificateNo")}</p>
                <p className="text-sm font-mono font-semibold text-navy-900">{cert.certificate_number}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t("issued")}</p>
                <p className="text-sm font-semibold text-navy-900">{formatDate(cert.issued_at)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, Loader2, Printer, Download, Share2, X, Copy, Check, Ban, ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Share management modal ─────────────────────────────────────────────────

function ShareModal({ transcriptId, token, onClose }: { transcriptId: string; token: string; onClose: () => void }) {
  const tt = useTranslations("ProgramTranscript");
  const { data: shares, isLoading, mutate } = useSWR(
    [`/transcripts/${transcriptId}/shares`, token],
    ([url, t]) => fetcher(url, t),
  );
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const shareList: any[] = Array.isArray(shares) ? shares : [];
  const activeShares = shareList.filter((s) => s.status === "active");

  function shareUrl(shareToken: string) {
    return `${MARKETING}/transcript/share/${shareToken}`;
  }

  async function createShare() {
    setCreating(true);
    try {
      await api.post(`/transcripts/${transcriptId}/shares`, {}, token);
      toast.success(tt("shareLinkCreated"));
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tt("failedToCreateLink"));
    } finally {
      setCreating(false);
    }
  }

  async function revoke(shareId: string) {
    if (!confirm(tt("revokeConfirm"))) return;
    try {
      await api.patch(`/transcripts/shares/${shareId}/revoke`, {}, token);
      toast.success(tt("linkRevoked"));
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tt("failedToRevokeLink"));
    }
  }

  async function copyLink(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success(tt("linkCopied"));
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-display font-black text-navy-900 text-lg">{tt("shareTranscript")}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            {tt("shareExplanation")}
          </p>

          <button
            onClick={createShare}
            disabled={creating}
            className="w-full inline-flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            {tt("createNewShareLink")}
          </button>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{tt("activeLinks")}</p>
            {isLoading ? (
              <div className="py-6 text-center"><Loader2 size={18} className="animate-spin text-slate-300 mx-auto" /></div>
            ) : activeShares.length === 0 ? (
              <p className="text-xs text-slate-400">{tt("noActiveShareLinks")}</p>
            ) : (
              <div className="space-y-2">
                {activeShares.map((s) => {
                  const url = shareUrl(s.token);
                  return (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input readOnly value={url} onFocus={(e) => e.target.select()} className="input-base !text-xs !py-1.5 flex-1 font-mono truncate" />
                        <button onClick={() => copyLink(s.id, url)} className="btn-outline !py-1.5 !px-2.5 flex-shrink-0">
                          {copiedId === s.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400">{tt("createdOn", { date: formatDate(s.created_at) })}</p>
                        <button onClick={() => revoke(s.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700">
                          <Ban size={11} /> {tt("revoke")}
                        </button>
                      </div>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`}
                        alt="QR code"
                        width={80}
                        height={80}
                        className="rounded-lg border border-slate-200 mt-2"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {shareList.some((s) => s.status === "revoked") && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{tt("revoked")}</p>
              <div className="space-y-1">
                {shareList.filter((s) => s.status === "revoked").map((s) => (
                  <p key={s.id} className="text-[11px] text-slate-400 font-mono truncate">{tt("revokedLink", { url: shareUrl(s.token) })}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Transcript document ─────────────────────────────────────────────────────

function TranscriptDocument({ t: data }: { t: any }) {
  const tt = useTranslations("ProgramTranscript");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg print:border-0 print:shadow-none print:rounded-none p-8 sm:p-12 print:p-0">
      <div className="text-center border-b-2 border-navy-900 pb-6 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">{tt("professionalAiInstitute")}</p>
        <h1 className="text-2xl font-display font-black text-navy-900">{tt("officialProgramTranscript")}</h1>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
          <span>{tt("transcriptNo")} <span className="font-mono font-semibold text-navy-800">{data.transcript_number}</span></span>
          <span>·</span>
          <span>{tt("issuedOn", { date: formatDate(data.issued_at) })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 text-sm">
        <div><span className="text-slate-400">{tt("student")}:</span> <span className="font-semibold text-navy-900">{data.student.name}</span></div>
        <div><span className="text-slate-400">{tt("studentId")}:</span> <span className="font-semibold text-navy-900">{data.student.student_id}</span></div>
        <div><span className="text-slate-400">{tt("program")}:</span> <span className="font-semibold text-navy-900">{data.program.title}</span></div>
        <div><span className="text-slate-400">{tt("programCode")}:</span> <span className="font-semibold text-navy-900">{data.program.code || "—"}</span></div>
        <div><span className="text-slate-400">{tt("enrolled")}:</span> <span className="font-semibold text-navy-900">{formatDate(data.enrollment.enrolled_at)}</span></div>
        <div><span className="text-slate-400">{tt("status")}:</span> <span className="font-semibold text-navy-900">{data.summary.program_status}</span></div>
        {data.enrollment.completed_at && (
          <div><span className="text-slate-400">{tt("completionDate")}:</span> <span className="font-semibold text-navy-900">{formatDate(data.enrollment.completed_at)}</span></div>
        )}
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{tt("academicRecord")}</p>
      <table className="w-full text-sm mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-2 font-semibold text-slate-600">{tt("courseCode")}</th>
            <th className="text-left py-2 font-semibold text-slate-600">{tt("courseTitle")}</th>
            <th className="text-right py-2 font-semibold text-slate-600">{tt("hours")}</th>
            <th className="text-left py-2 font-semibold text-slate-600 pl-4">{tt("grade")}</th>
            <th className="text-right py-2 font-semibold text-slate-600">{tt("gradePercent")}</th>
            <th className="text-left py-2 font-semibold text-slate-600 pl-4">{tt("status")}</th>
          </tr>
        </thead>
        <tbody>
          {data.academic_record.map((r: any, i: number) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 font-mono text-xs text-slate-500">{r.course_code}</td>
              <td className="py-2 text-navy-900">{r.course_title}{!r.is_required && <span className="text-slate-400 text-xs"> ({tt("elective")})</span>}</td>
              <td className="py-2 text-right text-slate-600">{r.hours}</td>
              <td className="py-2 pl-4 text-navy-900 font-semibold">{r.letter_grade ?? "—"}</td>
              <td className="py-2 text-right text-slate-600">{r.grade_percentage != null ? `${r.grade_percentage}%` : "—"}</td>
              <td className="py-2 pl-4 text-slate-600">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.capstone.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{tt("capstone")}</p>
          <table className="w-full text-sm mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 font-semibold text-slate-600">{tt("component")}</th>
                <th className="text-left py-2 font-semibold text-slate-600">{tt("title")}</th>
                <th className="text-left py-2 font-semibold text-slate-600 pl-4">{tt("grade")}</th>
                <th className="text-left py-2 font-semibold text-slate-600 pl-4">{tt("result")}</th>
                <th className="text-left py-2 font-semibold text-slate-600 pl-4">{tt("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.capstone.map((r: any, i: number) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 text-slate-600 capitalize">{r.special_type}</td>
                  <td className="py-2 text-navy-900">{r.course_title}</td>
                  <td className="py-2 pl-4 text-navy-900 font-semibold">{r.letter_grade ?? "—"}</td>
                  <td className="py-2 pl-4 font-semibold">
                    {r.pass_fail ? (
                      <span className={r.pass_fail === "Pass" ? "text-emerald-600" : "text-red-500"}>{r.pass_fail}</span>
                    ) : "—"}
                  </td>
                  <td className="py-2 pl-4 text-slate-600">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="bg-slate-50 rounded-xl p-5 mb-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tt("coursesCompleted")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{data.summary.courses_completed} / {data.summary.courses_total}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tt("totalHours")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{data.summary.hours_completed} / {data.summary.hours_total}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tt("overallAverage")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{data.summary.overall_average != null ? `${data.summary.overall_average}%` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tt("programGpa")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{data.summary.gpa ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tt("academicStanding")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{data.academic_standing}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tt("programStatus")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{data.summary.program_status}</p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5 text-center">
        <p className="text-[11px] text-slate-500 leading-relaxed max-w-lg mx-auto">
          {tt("officialRecordNotice")}
        </p>
        <p className="text-[10px] text-slate-400 mt-2">
          {tt("verificationId")}: <span className="font-mono">{data.transcript_number}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramTranscriptPage() {
  const tt = useTranslations("ProgramTranscript");
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const [sharing, setSharing] = useState(false);

  const { data: t, isLoading, error } = useSWR(
    token && id ? [`/programs/${id}/transcript`, token] : null,
    ([url, tok]) => fetcher(url, tok),
  );

  function handleDownloadPdf() {
    const win = window.open("", "_blank");
    if (!win) { toast.error(tt("popupBlocked")); return; }
    const printArea = document.getElementById("transcript-document");
    if (!printArea) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Transcript</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-10">${printArea.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-sm font-semibold mb-1">{tt("couldntLoadTranscript")}</p>
          <Link href={`/programs/${id}`} className="text-xs text-teal-700 hover:underline">{tt("backToProgram")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10 print:py-0 print:px-0 print:max-w-none">
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden flex-wrap">
          <Link href={`/programs/${id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft size={12} /> {tt("backToProgram")}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSharing(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Share2 size={13} /> {tt("shareTranscript")}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Download size={13} /> {tt("downloadPdf")}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Printer size={13} /> {tt("printTranscript")}
            </button>
          </div>
        </div>

        <div id="transcript-document">
          <TranscriptDocument t={t} />
        </div>
      </div>

      {sharing && <ShareModal transcriptId={t.id} token={token} onClose={() => setSharing(false)} />}
    </div>
  );
}

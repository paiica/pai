"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronRight, Loader2, AlertCircle, Ban } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

export default function AdminTranscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();

  const { data: t, isLoading, error, mutate } = useSWR(
    accessToken && id ? [`/admin/transcripts/${id}`, accessToken] : null,
    ([url, token]) => fetcher(url, token),
  );

  async function revoke(shareId: string) {
    const reason = prompt("Reason for revoking this share link? (optional)") ?? undefined;
    await toast.promise(
      api.patch(`/admin/transcripts/shares/${shareId}/revoke`, { reason }, accessToken!).then(() => mutate()),
      { loading: "Revoking…", success: "Share link revoked", error: "Failed" },
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-10 text-center">
          <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
          <p className="text-red-500 text-sm font-semibold">Transcript not found.</p>
          <Link href="/transcripts" className="btn-outline !py-1.5 !px-4 !text-xs mt-4 inline-flex">Back to Transcripts</Link>
        </div>
      </div>
    );
  }

  const activeShares = (t.shares ?? []).filter((s: any) => s.status === "active");
  const revokedShares = (t.shares ?? []).filter((s: any) => s.status !== "active");

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
        <Link href="/transcripts" className="hover:text-slate-600">Transcripts</Link>
        <ChevronRight size={12} />
        <span className="text-slate-700 font-semibold">{t.transcript_number}</span>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/transcripts" className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={17} />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">{t.student.name}</h1>
          <p className="text-slate-400 text-xs font-mono mt-0.5">{t.transcript_number} · {t.program.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-3">Student Information</p>
          <div className="space-y-1.5 text-sm">
            <p><span className="text-slate-400">Name:</span> <span className="font-semibold text-navy-900">{t.student.name}</span></p>
            <p><span className="text-slate-400">Student ID:</span> <span className="font-semibold text-navy-900">{t.student.student_id}</span></p>
            <p><span className="text-slate-400">Program:</span> <span className="font-semibold text-navy-900">{t.program.title}</span></p>
            <p><span className="text-slate-400">Status:</span> <span className="font-semibold text-navy-900">{t.summary.program_status}</span></p>
            <p><span className="text-slate-400">Issued:</span> <span className="font-semibold text-navy-900">{formatDate(t.issued_at)}</span></p>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-3">Program Summary</p>
          <div className="space-y-1.5 text-sm">
            <p><span className="text-slate-400">Courses Completed:</span> <span className="font-semibold text-navy-900">{t.summary.courses_completed} / {t.summary.courses_total}</span></p>
            <p><span className="text-slate-400">Hours:</span> <span className="font-semibold text-navy-900">{t.summary.hours_completed} / {t.summary.hours_total}</span></p>
            <p><span className="text-slate-400">Overall Average:</span> <span className="font-semibold text-navy-900">{t.summary.overall_average != null ? `${t.summary.overall_average}%` : "—"}</span></p>
            <p><span className="text-slate-400">GPA:</span> <span className="font-semibold text-navy-900">{t.summary.gpa ?? "—"}</span></p>
            <p><span className="text-slate-400">Academic Standing:</span> <span className="font-semibold text-navy-900">{t.academic_standing}</span></p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0 mb-6">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest px-5 py-3 border-b border-slate-100">Academic Record</p>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Course</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Hours</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Grade</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {t.academic_record.map((r: any, i: number) => (
              <tr key={i}>
                <td className="px-4 py-2.5 text-navy-900">{r.course_title}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.hours}</td>
                <td className="px-4 py-2.5 font-semibold text-navy-900">{r.letter_grade ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden p-0">
        <p className="text-xs font-bold text-navy-900 uppercase tracking-widest px-5 py-3 border-b border-slate-100">Share Links</p>
        {(t.shares ?? []).length === 0 ? (
          <p className="text-xs text-slate-400 p-5">No share links have been created for this transcript.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Token</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Created</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...activeShares, ...revokedShares].map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.token.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("badge", s.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{s.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {s.status === "active" && (
                      <button onClick={() => revoke(s.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700">
                        <Ban size={12} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

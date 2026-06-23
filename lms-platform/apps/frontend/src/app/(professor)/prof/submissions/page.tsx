"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { FileText, CheckCircle, Clock, User, ExternalLink, Download } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const STATUS_STYLES: Record<string, string> = {
  submitted: "badge bg-amber-100 text-amber-700",
  under_review: "badge bg-blue-100 text-blue-700",
  graded: "badge bg-emerald-100 text-emerald-700",
  returned: "badge bg-slate-100 text-slate-600",
};

export default function ProfSubmissionsPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  const { data: certs } = useSWR(
    token ? ["/prof/certifications", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const activeCertId = selectedCertId || certs?.[0]?.id;

  const { data: submissions, mutate } = useSWR(
    activeCertId && token ? [`/prof/certifications/${activeCertId}/submissions`, token] : null,
    ([url, t]) => fetcher(url, t)
  );

  async function submitGrade(submissionId: string) {
    const grade = parseFloat(gradeInput);
    if (isNaN(grade)) return toast.error("Enter a valid grade");
    await toast.promise(
      api.put<any>(`/prof/submissions/${submissionId}/grade`, { grade, feedback: feedbackInput }, token)
        .then(() => { setGradingId(null); setGradeInput(""); setFeedbackInput(""); mutate(); }),
      { loading: "Saving grade…", success: "Grade saved", error: "Failed" }
    );
  }

  const pendingCount = submissions?.filter((s: any) => s.status === "submitted").length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Assignment Submissions</h1>
          {pendingCount > 0 && (
            <p className="text-amber-600 text-sm mt-1 font-medium">
              {pendingCount} pending review
            </p>
          )}
        </div>
        {certs && certs.length > 1 && (
          <select
            value={activeCertId}
            onChange={(e) => setSelectedCertId(e.target.value)}
            className="input-base w-auto"
          >
            {certs.map((c: any) => (
              <option key={c.id} value={c.id}>{c.acronym}</option>
            ))}
          </select>
        )}
      </div>

      {!submissions || submissions.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <FileText size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold">No submissions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s: any) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 text-navy-700 font-bold text-sm">
                  {s.user?.profile?.first_name?.[0]}{s.user?.profile?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-navy-900">
                      {s.user?.profile?.display_name ?? s.user?.profile?.first_name + " " + s.user?.profile?.last_name}
                    </p>
                    <span className={STATUS_STYLES[s.status] ?? "badge bg-slate-100 text-slate-600"}>{s.status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{s.lesson?.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Submitted {formatDate(s.submitted_at)}</p>

                  {s.text_content && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                      {s.text_content.slice(0, 200)}{s.text_content.length > 200 ? "…" : ""}
                    </div>
                  )}

                  {s.file_url && (
                    <a
                      href={s.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-navy-600 hover:text-navy-800 font-medium"
                    >
                      <Download size={14} /> {s.file_name ?? "Download submission"}
                    </a>
                  )}

                  {s.grade !== null && s.grade !== undefined && (
                    <div className="mt-3 flex items-center gap-2">
                      <CheckCircle size={15} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">
                        Grade: {s.grade} / {s.lesson?.max_score ?? 100}
                      </span>
                      {s.feedback && <span className="text-sm text-slate-500">— {s.feedback}</span>}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {gradingId === s.id ? (
                    <div className="space-y-2 min-w-48">
                      <input
                        type="number"
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        placeholder={`Score / ${s.lesson?.max_score ?? 100}`}
                        className="input-base text-sm py-1.5"
                        min={0}
                        max={s.lesson?.max_score ?? 100}
                      />
                      <textarea
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Feedback (optional)"
                        className="input-base text-sm py-1.5 h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => submitGrade(s.id)} className="btn-primary flex-1 py-1.5 text-xs">Save</button>
                        <button onClick={() => setGradingId(null)} className="btn-outline flex-1 py-1.5 text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setGradingId(s.id); setGradeInput(s.grade?.toString() ?? ""); setFeedbackInput(s.feedback ?? ""); }}
                      className="btn-outline text-xs py-2"
                    >
                      {s.grade !== null ? "Edit Grade" : "Grade"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

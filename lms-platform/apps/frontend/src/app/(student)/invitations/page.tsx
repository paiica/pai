"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Mail, Check, X, Loader2, GraduationCap, Award, ExternalLink, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Declined", cls: "bg-slate-100 text-slate-500" },
};

export default function InvitationsPage() {
  const { accessToken } = useAuthStore();
  const { data: invitations, isLoading, mutate } = useSWR(
    accessToken ? ["/me/course-invitations", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: certRecommendations, isLoading: loadingCertRecs } = useSWR(
    accessToken ? ["/me/certification-recommendations", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function handleAccept(id: string) {
    setActingId(id);
    try {
      const r = await api.post<any>(`/me/course-invitations/${id}/accept`, {}, accessToken!);
      if (r.data.checkout_url) {
        window.location.href = r.data.checkout_url;
        return;
      }
      toast.success("Invitation accepted — course added to My Learning");
      mutate();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to accept invitation");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    setActingId(id);
    try {
      await api.post(`/me/course-invitations/${id}/reject`, { reason: reason.trim() || undefined }, accessToken!);
      toast.success("Invitation declined");
      setRejectingId(null);
      setReason("");
      mutate();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to decline invitation");
    } finally {
      setActingId(null);
    }
  }

  const pending: any[] = (invitations ?? []).filter((i: any) => i.status === "pending");
  const responded: any[] = (invitations ?? []).filter((i: any) => i.status !== "pending");

  return (
    <div className="min-h-screen bg-[#f7f8fa] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display font-black text-navy-900 text-2xl mb-1">Course Invitations</h1>
        <p className="text-slate-500 text-sm mb-8">Courses professors have shared directly with you.</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-28 rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : (invitations ?? []).length === 0 ? (
          <div className="card p-12 text-center">
            <Mail size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-navy-800">No invitations yet</p>
            <p className="text-sm text-slate-400 mt-1">When a professor shares a course with you, it'll show up here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <section className="space-y-3">
                {pending.map((inv: any) => (
                  <div key={inv.id} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 mb-0.5">
                          {inv.is_recommendation ? "Course Recommendation" : "New Course Invitation"}
                        </p>
                        <p className="font-semibold text-navy-900">
                          {inv.is_recommendation
                            ? `Professor ${inv.professor_name} recommends this course:`
                            : `Professor ${inv.professor_name} has invited you to join:`}
                        </p>
                        <p className="font-display font-black text-navy-900 text-lg mt-1">{inv.course.title}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {Number(inv.course.price) > 0 ? `Payment required: $${Number(inv.course.price).toFixed(2)}` : "Free"}
                          {" · "}Invited {new Date(inv.invited_at).toLocaleDateString()}
                        </p>
                        {inv.course.slug && (
                          <Link
                            href={`/tools/course/${inv.course.slug}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:underline mt-1.5"
                          >
                            <BookOpen size={12} /> View Course Details
                          </Link>
                        )}

                        {rejectingId === inv.id ? (
                          <div className="mt-3 space-y-2">
                            <input
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Reason (optional)"
                              className="input-base text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReject(inv.id)}
                                disabled={actingId === inv.id}
                                className="btn-outline !text-red-600 !border-red-200 !py-2 !px-4 text-sm disabled:opacity-60"
                              >
                                {actingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : "Confirm Decline"}
                              </button>
                              <button onClick={() => { setRejectingId(null); setReason(""); }} className="btn-outline !py-2 !px-4 text-sm">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAccept(inv.id)}
                              disabled={actingId === inv.id}
                              className="btn-primary !py-2 !px-4 text-sm disabled:opacity-60"
                            >
                              {actingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Accept
                            </button>
                            <button
                              onClick={() => setRejectingId(inv.id)}
                              disabled={actingId === inv.id}
                              className="btn-outline !py-2 !px-4 text-sm disabled:opacity-60"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {responded.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 mb-3">Past Invitations</h2>
                <div className="space-y-2">
                  {responded.map((inv: any) => {
                    const status = STATUS_LABEL[inv.status] ?? STATUS_LABEL.pending;
                    return (
                      <div key={inv.id} className="card p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900 truncate">{inv.course.title}</p>
                          <p className="text-xs text-slate-400">
                            Professor {inv.professor_name}{inv.is_recommendation ? " · Recommended" : ""}
                          </p>
                        </div>
                        {inv.course.slug && (
                          <Link
                            href={`/tools/course/${inv.course.slug}`}
                            className="text-xs font-semibold text-navy-600 hover:underline flex-shrink-0"
                          >
                            View
                          </Link>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {!loadingCertRecs && (certRecommendations ?? []).length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-500 mb-3">Recommended Certifications</h2>
            <div className="space-y-2">
              {certRecommendations.map((rec: any) => (
                <div key={rec.id} className="card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                    <Award size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900 truncate">{rec.certification.title}</p>
                    <p className="text-xs text-slate-400">Recommended by Professor {rec.professor_name}</p>
                  </div>
                  <a
                    href={`${MARKETING}/certifications/${rec.certification.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline !py-1.5 !px-3 text-xs flex-shrink-0 inline-flex items-center gap-1"
                  >
                    View <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

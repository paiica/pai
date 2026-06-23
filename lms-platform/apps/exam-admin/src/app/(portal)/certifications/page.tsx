"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Cert {
  id: string;
  title: string;
  slug: string;
  exam_questions_count: number;
  published_exam_count: number;
  exam_duration_minutes?: number;
  passing_score?: number;
}


export default function CertificationsPage() {
  const { accessToken } = useAuthStore();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>("/admin/certifications", accessToken!)
      .then((r) => setCerts(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const ready = certs.filter((c) => c.published_exam_count > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Certifications</h1>
          <p className="page-subtitle">Manage question banks and exam settings per certification</p>
        </div>
        {!loading && certs.length > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-white">{ready}<span className="text-slate-600 text-lg">/{certs.length}</span></p>
            <p className="text-slate-500 text-xs mt-0.5">banks ready</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 text-sm">No certifications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map((c) => {
            const isReady = (c.published_exam_count ?? 0) > 0;

            return (
              <Link
                key={c.id}
                href={`/certifications/${c.id}`}
                className="card p-5 block hover:border-slate-700 hover:bg-slate-800/40 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{c.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {c.exam_duration_minutes && (
                        <span>{c.exam_duration_minutes} min exam</span>
                      )}
                      {c.passing_score && (
                        <span>{c.passing_score}% to pass</span>
                      )}
                    </div>
                    <p className="text-xs mt-2">
                      {isReady ? (
                        <span className="text-green-400">
                          {c.published_exam_count} published exam{c.published_exam_count !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-600">No published exams yet</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge ${isReady ? "badge-green" : "badge-amber"}`}>
                      {isReady ? "Ready" : "Incomplete"}
                    </span>
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

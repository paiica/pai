"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import LabPanel from "@/components/LabPanel";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

// A focused, distraction-free view of just the interactive lab embedded in a
// lesson — the /labs hub links here instead of the full lesson player
// (/learn/course/.../lesson/...), which also renders the instructor's full
// reading content, breadcrumb, and course chrome around it. Students who
// want that full context can still reach it via "View full lesson" below.
export default function StandaloneLabPage() {
  const router = useRouter();
  const { enrollmentId, lessonId } = useParams<{ enrollmentId: string; lessonId: string }>();
  const searchParams = useSearchParams();
  const courseTitle = searchParams.get("course");
  const token = useAuthStore((s) => s.accessToken) ?? "";

  const { data: lesson, isLoading } = useSWR(
    token ? [`/prep-courses/learn/${enrollmentId}/lesson/${lessonId}`, token] : null,
    ([url, tok]) => fetcher(url, tok),
  );

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push("/labs")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 mb-6">
          <ArrowLeft size={15} /> All Labs
        </button>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : !lesson ? (
          <div className="text-center py-24 text-slate-400 text-sm">Couldn't load this lab.</div>
        ) : (
          <>
            <div className="mb-6">
              {(courseTitle || lesson.module_title) && (
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  {[courseTitle, lesson.module_title].filter(Boolean).join(" · ")}
                </p>
              )}
              <h1 className="text-2xl font-display font-black text-navy-900">{lesson.title}</h1>
            </div>

            <LabPanel lesson={lesson} enrollmentId={enrollmentId} token={token} />

            <Link
              href={`/learn/course/${enrollmentId}/lesson/${lessonId}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 mt-6"
            >
              <FileText size={14} /> View full lesson
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

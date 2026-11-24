"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

type InstitutionCourse = { id: string; slug: string; title: string; subtitle?: string; price: number; visibility: string };

// Free courses (the norm for a private institution course in Phase 1 — no
// institution package/subscription billing yet) enroll directly here,
// since the marketing site can't render a private course at all (it fetches
// anonymously, and canViewPrivateCourse requires a logged-in institution
// member). Paid courses still route out to the marketing site's checkout —
// a rare case in Phase 1, and a known gap for a private *paid* course
// (that flow isn't wired end-to-end yet).
export function InstitutionCourseCard({ course, institutionName }: { course: InstitutionCourse; institutionName: string }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [enrolling, setEnrolling] = useState(false);
  const isFree = Number(course.price) === 0;

  async function enroll(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) return;
    setEnrolling(true);
    try {
      const res: any = await api.post<any>("/payments/course-checkout", { course_id: course.id }, token);
      const data = res.data ?? res;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      toast.success("Enrolled!");
      router.push("/learn");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <a
      href={isFree ? "#" : `${MARKETING}/courses/${course.slug}`}
      onClick={isFree ? enroll : undefined}
      className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-navy-300 hover:shadow-md transition-all flex flex-col cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wide bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">
          {institutionName}
        </span>
        {course.visibility === "private" && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            Institution only
          </span>
        )}
      </div>
      <h3 className="font-display font-bold text-navy-900 leading-snug mb-2 flex-1">{course.title}</h3>
      {course.subtitle && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.subtitle}</p>}
      <span className="text-sm font-semibold text-navy-700 group-hover:text-navy-900 mt-auto flex items-center gap-1.5">
        {enrolling ? <Loader2 size={13} className="animate-spin" /> : null}
        {isFree ? (enrolling ? "Enrolling…" : "Enroll — Free") : `$${Number(course.price).toFixed(0)}`}
      </span>
    </a>
  );
}

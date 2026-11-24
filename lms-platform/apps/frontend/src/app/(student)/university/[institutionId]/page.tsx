"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { InstitutionCourseCard } from "@/components/university/InstitutionCourseCard";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

export default function InstitutionCataloguePage() {
  const { institutionId } = useParams<{ institutionId: string }>();
  const searchParams = useSearchParams();
  const institutionName = searchParams.get("name") ?? "Your University";
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useSWR(
    [`/prep-courses/institution/${institutionId}`, token],
    ([url, tok]) => (tok ? fetcher(url, tok) : fetcher(url, "")),
  );
  const courses: any[] = Array.isArray(data) ? data : [];

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-4xl mx-auto">
        <Link href="/university" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 mb-6">
          <ArrowLeft size={15} /> My Institutions
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <GraduationCap size={22} className="text-navy-700" />
          <h1 className="text-2xl font-display font-black text-navy-900">{institutionName}</h1>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No courses published yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => <InstitutionCourseCard key={c.id} course={c} institutionName={institutionName} />)}
          </div>
        )}
      </div>
    </div>
  );
}

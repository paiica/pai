"use client";

import Link from "next/link";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { InstitutionCourseCard } from "@/components/university/InstitutionCourseCard";

type Membership = { institution: { id: string; name: string; code: string; logo_url: string | null }; role: string };

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

export default function UniversityPickerPage() {
  const token = useAuthStore((s) => s.accessToken);
  const t = useTranslations("Sidebar");

  const { data, isLoading } = useSWR(
    token ? ["/me/institution-memberships", token] : null,
    ([url, tok]) => fetcher(url, tok),
  );
  const memberships: Membership[] = Array.isArray(data) ? data : [];

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <GraduationCap size={22} className="text-navy-700" />
          <h1 className="text-2xl font-display font-black text-navy-900">{t("university")}</h1>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse bg-slate-200" />)}
          </div>
        ) : memberships.length === 0 ? (
          <p className="text-slate-500">You're not a member of any institution yet.</p>
        ) : memberships.length === 1 ? (
          <InstitutionCatalog institutionId={memberships[0].institution.id} institutionName={memberships[0].institution.name} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {memberships.map((m) => (
              <Link
                key={m.institution.id}
                href={`/university/${m.institution.id}?name=${encodeURIComponent(m.institution.name)}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-navy-300 hover:shadow-md transition-all"
              >
                <div>
                  <p className="font-display font-bold text-navy-900">{m.institution.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.institution.code}</p>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-navy-700 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InstitutionCatalog({ institutionId, institutionName }: { institutionId: string; institutionName: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const { data, isLoading } = useSWR(
    [`/prep-courses/institution/${institutionId}`, token],
    ([url, tok]) => (tok ? fetcher(url, tok) : fetcher(url, "")),
  );
  const courses: any[] = Array.isArray(data) ? data : [];

  return (
    <div>
      <p className="text-slate-500 mb-6">Courses from {institutionName}</p>
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
  );
}

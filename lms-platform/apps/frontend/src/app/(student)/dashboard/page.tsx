"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowRight, Play, ChevronRight, Award,
  BookOpen, Clock, CheckCircle2, GraduationCap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── Cert status card (dark) ──────────────────────────────────────────────────

function CertCard({ enrollment, certificate }: { enrollment: any; certificate: any }) {
  const cert = enrollment.certification;
  const pct = enrollment.progress_percentage ?? 0;
  const isCompleted = enrollment.status === "completed";
  const hasCert = !!certificate;

  let statusLabel = `${pct}% Complete`;
  let statusColor = "bg-white/10 text-white/70";
  let body = `You're ${pct}% through the course material.`;
  let ctaLabel = pct > 0 ? "Continue Learning" : "Start Learning";
  let ctaHref = `/learn/${enrollment.id}`;

  if (hasCert) {
    statusLabel = "Certified ✓";
    statusColor = "bg-gold-500/20 text-gold-300";
    body = `Certificate ${certificate.certificate_number} · expires ${new Date(certificate.expires_at).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}`;
    ctaLabel = "View Certificate";
    ctaHref = "/certificates";
  } else if (isCompleted) {
    statusLabel = "Course Complete";
    statusColor = "bg-emerald-500/20 text-emerald-300";
    body = "All lessons complete. You're ready to take the certification exam.";
    ctaLabel = "Take Exam";
  }

  return (
    <div className="rounded-2xl bg-navy-900 p-5 flex items-center justify-between gap-4 group hover:bg-navy-800 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Badge */}
        <div className="flex-shrink-0 border-2 border-white/30 rounded-lg px-3 py-1.5">
          <span className="text-white font-display font-black text-sm tracking-wide">{cert?.acronym}®</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1", statusColor)}>
              {hasCert ? <Award size={10} /> : isCompleted ? <CheckCircle2 size={10} /> : <Clock size={10} />}
              {statusLabel}
            </span>
          </div>
          <p className="text-white/50 text-xs truncate">{body}</p>
          {/* Progress bar */}
          {!hasCert && (
            <div className="mt-2.5 h-1 bg-white/10 rounded-full overflow-hidden w-48 max-w-full">
              <div
                className={cn("h-full rounded-full transition-all", isCompleted ? "bg-emerald-400" : "bg-gold-400")}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <Link
        href={ctaHref}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-gold-500 flex items-center justify-center transition-colors"
      >
        <ChevronRight size={16} className="text-white" />
      </Link>
    </div>
  );
}

// ─── Learning card ────────────────────────────────────────────────────────────

function LearningCard({ enrollment }: { enrollment: any }) {
  const cert = enrollment.certification;
  const pct = enrollment.progress_percentage ?? 0;

  return (
    <Link
      href={`/learn/${enrollment.id}`}
      className="card p-5 flex gap-4 hover:shadow-md transition-shadow group"
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center text-2xl flex-shrink-0">
        {cert?.badge_icon || "🎓"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
            pct === 0 ? "bg-slate-100 text-slate-500" :
            pct === 100 ? "bg-emerald-100 text-emerald-700" :
            "bg-gold-50 text-gold-700"
          )}>
            {pct === 0 ? "Not Started" : pct === 100 ? "Complete" : "In Progress"}
          </span>
        </div>
        <p className="font-semibold text-navy-900 text-sm truncate">{cert?.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{cert?.acronym} · {cert?.duration_weeks}-week program</p>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-navy-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{pct}%</span>
        </div>
      </div>

      <div className="flex-shrink-0 self-center">
        <div className="flex items-center gap-1.5 bg-navy-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg group-hover:bg-navy-700 transition-colors">
          {pct > 0 ? <><Play size={11} className="fill-white" /> Continue</> : <><Play size={11} className="fill-white" /> Start</>}
        </div>
      </div>
    </Link>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const { user, accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!accessToken) router.push("/login");
  }, [_hasHydrated, accessToken, router]);

  const { data: enrollments, isLoading } = useSWR(
    accessToken ? ["/enrollments/my", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: certificates } = useSWR(
    accessToken ? ["/certificates/my", accessToken] : null,
    ([url, t]) => fetcher(url, t)
  );

  const allEnrollments: any[] = enrollments?.data ?? enrollments ?? [];
  const allCerts: any[] = certificates?.data ?? certificates ?? [];

  const certByEnrollmentId = allCerts.reduce((acc: Record<string, any>, c: any) => {
    acc[c.enrollment_id] = c;
    return acc;
  }, {});

  const { data: profileData } = useSWR(
    accessToken ? ["/users/me/profile", accessToken] : null,
    ([url, t]) => fetcher(url, t),
  );

  const profile = profileData?.profile ?? profileData;
  const paiId   = profile?.pai_id ?? null;

  const firstName = profile?.first_name || user?.profile?.first_name || "";
  const lastName  = profile?.last_name  || user?.profile?.last_name  || "";
  const initials  = getInitials(firstName, lastName) || "U";
  const displayName = `${firstName} ${lastName}`.trim() || user?.email || "";

  // Profile completeness
  const profileFields = [
    firstName, lastName, user?.email,
    profile?.phone, profile?.country, profile?.date_of_birth,
    profile?.career_status, profile?.job_title,
    ...(Array.isArray(profile?.education_entries) && profile.education_entries.length > 0 ? ["edu"] : []),
    profile?.resume_url,
  ];
  const profilePct = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  // SVG ring for avatar
  const ringR = 32;
  const ringCircumference = 2 * Math.PI * ringR;
  const ringOffset = ringCircumference - (profilePct / 100) * ringCircumference;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-[#2d1b69] px-6 lg:px-12 pt-10 pb-0">
        <h2 className="text-white font-display font-black text-3xl mb-8">
          {greeting()}, {firstName || "there"}!
        </h2>

        <div className="flex items-end justify-between flex-wrap gap-6 pb-8">
          {/* Avatar + info */}
          <div className="flex items-center gap-6">
            {/* Avatar with ring */}
            <div className="relative flex-shrink-0">
              <svg width="80" height="80" className="-rotate-90">
                <circle cx="40" cy="40" r={ringR} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <circle
                  cx="40" cy="40" r={ringR}
                  fill="none" stroke="#F5A623" strokeWidth="4"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-navy-700 flex items-center justify-center overflow-hidden">
                  {user?.profile?.avatar_url || profile?.avatar_url ? (
                    <img src={user?.profile?.avatar_url || profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-white">{initials}</span>
                  )}
                </div>
              </div>
              <Link
                href="/profile"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-white text-navy-700 px-2 py-0.5 rounded-full shadow whitespace-nowrap"
              >
                Edit
              </Link>
            </div>

            <div>
              <h1 className="text-white font-display font-black text-xl leading-tight">{displayName}</h1>
              <p className="text-white/50 text-xs mt-0.5">{profilePct}% Complete</p>
            </div>

            {/* Account details */}
            {paiId && (
              <div className="hidden md:block border-l border-white/10 pl-6 ml-2">
                <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-0.5">Account Details</p>
                <p className="text-white/80 text-sm font-medium">PAI ID: <span className="font-bold text-white">{paiId}</span></p>
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors border border-white/20 mb-8"
          >
            Complete Account <ArrowRight size={14} />
          </Link>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-8 pt-5 pb-5 border-t border-white/10">
          {[
            { label: "Enrolled",    value: allEnrollments.length },
            { label: "In Progress", value: allEnrollments.filter((e: any) => e.status === "active").length },
            { label: "Completed",   value: allEnrollments.filter((e: any) => e.status === "completed").length },
            { label: "Certificates",value: allCerts.length },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-white font-black text-2xl">{value}</div>
              <div className="text-white/40 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Your Certifications */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-navy-900 text-lg">Your Certifications</h2>
            <Link href="/learn" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse bg-slate-200" />)}
            </div>
          ) : allEnrollments.length === 0 ? (
            <div className="rounded-2xl bg-navy-900 p-8 text-center">
              <GraduationCap size={36} className="mx-auto mb-3 text-white/30" />
              <p className="text-white font-semibold mb-1">No certifications yet</p>
              <p className="text-white/40 text-sm mb-5">Apply for a PAI certification program to get started.</p>
              <a
                href={`${process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"}/certifications`}
                className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Browse Certifications <ArrowRight size={14} />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {allEnrollments.map((e: any) => (
                <CertCard key={e.id} enrollment={e} certificate={certByEnrollmentId[e.id] ?? null} />
              ))}
            </div>
          )}
        </section>

        {/* Your Learning */}
        {allEnrollments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-black text-navy-900 text-lg">Your Learning</h2>
              <Link href="/learn" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1">
                View all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="space-y-3">
              {allEnrollments.map((e: any) => (
                <LearningCard key={e.id} enrollment={e} />
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        {allEnrollments.length > 0 && (
          <section>
            <h2 className="font-display font-black text-navy-900 text-lg mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/student/assignments", label: "Assignments", icon: BookOpen, desc: "Submit & track work" },
                { href: "/student/grades", label: "Grades", icon: CheckCircle2, desc: "Quiz & assignment scores" },
                { href: "/certificates", label: "Certificates", icon: Award, desc: "Your earned credentials" },
                { href: "/profile", label: "My Profile", icon: GraduationCap, desc: "Account settings" },
              ].map(({ href, label, icon: Icon, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow group"
                >
                  <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-navy-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{desc}</p>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-navy-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

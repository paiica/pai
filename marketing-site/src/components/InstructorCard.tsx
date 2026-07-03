"use client";

import { useState } from "react";
import { X, Briefcase, GraduationCap, Calendar } from "lucide-react";

type EducationEntry = {
  id: string; institution: string; degree: string; field_of_study: string;
  start_year: string; end_year: string; is_current: boolean;
};

type ExperienceEntry = {
  id: string; title: string; company: string; location: string;
  start_date: string; end_date: string; is_current: boolean; description: string;
};

export type InstructorCardProps = {
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isLead?: boolean;
  jobTitle?: string | null;
  company?: string | null;
  yearsExperience?: number | null;
  educationEntries?: EducationEntry[];
  experienceEntries?: ExperienceEntry[];
};

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

export default function InstructorCard({
  name, avatarUrl, bio, isLead, jobTitle, company, yearsExperience,
  educationEntries, experienceEntries,
}: InstructorCardProps) {
  const [open, setOpen] = useState(false);

  const education = safeArray<EducationEntry>(educationEntries);
  const experience = safeArray<ExperienceEntry>(experienceEntries);
  const hasMore = Boolean(jobTitle || company || yearsExperience || education.length > 0 || experience.length > 0 || (bio && bio.length > 140));

  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleLine = [jobTitle, company].filter(Boolean).join(" · ");

  return (
    <>
      <button
        type="button"
        onClick={() => hasMore && setOpen(true)}
        className={`w-full flex items-start gap-4 bg-sand-50 rounded-2xl p-5 border border-sand-200 text-left transition-all ${hasMore ? "hover:border-ink-900/30 hover:shadow-card cursor-pointer" : "cursor-default"}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-ink-800 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-display font-bold text-ink-900 text-base">{name}</div>
          {isLead && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full mt-1">
              Lead Instructor
            </span>
          )}
          {roleLine && <p className="text-xs text-slate-500 mt-1.5 font-medium">{roleLine}</p>}
          {bio && <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{bio}</p>}
          {hasMore && <span className="text-xs font-semibold text-ink-900 mt-2 inline-block underline underline-offset-2">View full profile</span>}
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-sand-100">
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-ink-900 p-1 rounded-lg hover:bg-sand-50 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 pt-2">
              <div className="flex items-start gap-4 mb-6">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-ink-800 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-display font-black text-ink-900 text-xl leading-tight">{name}</h3>
                  {isLead && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full mt-1.5">
                      Lead Instructor
                    </span>
                  )}
                  {roleLine && <p className="text-sm text-slate-500 mt-1.5 font-medium">{roleLine}</p>}
                  {Boolean(yearsExperience) && (
                    <p className="text-xs text-slate-400 mt-1">{yearsExperience}+ years of experience</p>
                  )}
                </div>
              </div>

              {bio && <p className="text-sm text-ink-900 leading-relaxed mb-6">{bio}</p>}

              {experience.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase size={14} className="text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Experience</h4>
                  </div>
                  <div className="space-y-4">
                    {experience.map((e) => (
                      <div key={e.id} className="pl-4 border-l-2 border-sand-200">
                        <p className="text-sm font-semibold text-ink-900">{e.title}</p>
                        <p className="text-xs text-slate-500">
                          {[e.company, e.location].filter(Boolean).join(" · ")}
                        </p>
                        {(e.start_date || e.end_date) && (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={11} /> {e.start_date}{" — "}{e.is_current ? "Present" : e.end_date}
                          </p>
                        )}
                        {e.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{e.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {education.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap size={14} className="text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Education</h4>
                  </div>
                  <div className="space-y-3">
                    {education.map((ed) => (
                      <div key={ed.id} className="pl-4 border-l-2 border-sand-200">
                        <p className="text-sm font-semibold text-ink-900">
                          {ed.degree}{ed.field_of_study ? `, ${ed.field_of_study}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">{ed.institution}</p>
                        {(ed.start_year || ed.end_year) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ed.start_year}{" — "}{ed.is_current ? "Present" : ed.end_year}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

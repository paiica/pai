import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CareerProfile = { id: string; role_title: string; summary: string; responsibilities: string[]; related_cert_acronyms: string[] };
type Cert = { acronym: string; slug: string };

// Same pattern as GlossaryLiveSection — renders nothing until PAII publishes
// at least one real career profile. related_cert_acronyms are cross-linked
// against the real certification catalog rather than hardcoded hrefs, so a
// bad acronym just renders as plain text instead of a dead link.
export default async function CareerProfilesLiveSection({ cmsContent }: { cmsContent: { badge?: string; title?: string } }) {
  const locale = await getLocale();
  let profiles: CareerProfile[] = [];
  let certBySlug: Record<string, string> = {};
  try {
    const [profilesRes, certsRes] = await Promise.all([
      fetch(`${API}/career-profiles/public?lang=${locale}`, { next: { revalidate: 120 } }),
      fetch(`${API}/courses/catalog`, { next: { revalidate: 300 } }),
    ]);
    if (profilesRes.ok) {
      const json = await profilesRes.json();
      profiles = json.data ?? json ?? [];
    }
    if (certsRes.ok) {
      const json = await certsRes.json();
      const certs: Cert[] = json.data ?? json ?? [];
      certBySlug = Object.fromEntries(certs.map((c) => [c.acronym, c.slug]));
    }
  } catch {
    profiles = [];
  }

  if (!profiles.length) return null;

  return (
    <div className="container-md py-4">
      {(cmsContent?.badge || cmsContent?.title) && (
        <div className="text-center mb-8">
          {cmsContent.badge?.trim() && <span className="badge-teal mb-4 justify-center">{cmsContent.badge}</span>}
          {cmsContent.title?.trim() && <h2 className="section-title">{cmsContent.title}</h2>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-5">
        {profiles.map((profile) => (
          <div key={profile.id} className="card p-5">
            <p className="font-display font-bold text-ink-900 text-base mb-2">{profile.role_title}</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{profile.summary}</p>
            {profile.responsibilities.length > 0 && (
              <ul className="text-xs text-slate-500 space-y-1 mb-3 list-disc list-inside">
                {profile.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {profile.related_cert_acronyms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-sand-200">
                {profile.related_cert_acronyms.map((acronym) =>
                  certBySlug[acronym] ? (
                    <Link key={acronym} href={`/certifications/${certBySlug[acronym]}`} className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 hover:bg-teal-100">
                      {acronym} <ArrowRight size={10} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span key={acronym} className="text-[11px] font-semibold text-slate-400 bg-sand-100 px-2.5 py-1 rounded-full">{acronym}</span>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

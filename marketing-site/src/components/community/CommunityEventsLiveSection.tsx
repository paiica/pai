import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CommunityEvent = { id: string; title: string; description: string; event_date: string | null; location: string; link_url: string };

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Same pattern as GlossaryLiveSection — renders nothing until PAII publishes
// at least one real community event (starts empty, nothing fabricated).
export default async function CommunityEventsLiveSection({ cmsContent }: { cmsContent: { badge?: string; title?: string } }) {
  const locale = await getLocale();
  const t = await getTranslations("CommunityEvents");
  let events: CommunityEvent[] = [];
  try {
    const res = await fetch(`${API}/community-events/public?lang=${locale}`, { next: { revalidate: 120 } });
    if (res.ok) {
      const json = await res.json();
      events = json.data ?? json ?? [];
    }
  } catch {
    events = [];
  }

  if (!events.length) return null;

  return (
    <div className="container-md py-4">
      {(cmsContent?.badge || cmsContent?.title) && (
        <div className="text-center mb-8">
          {cmsContent.badge?.trim() && <span className="badge-teal mb-4 justify-center">{cmsContent.badge}</span>}
          {cmsContent.title?.trim() && <h2 className="section-title">{cmsContent.title}</h2>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div key={event.id} className="card p-4">
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
              {event.event_date && <span className="flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" /> {formatDate(event.event_date)}</span>}
              {event.location && <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> {event.location}</span>}
            </div>
            <p className="font-display font-bold text-ink-900 text-sm mb-1.5">{event.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{event.description}</p>
            {event.link_url && (
              <a href={event.link_url} target="_blank" rel="noopener noreferrer" aria-label={`${t("join")} ${event.title}`} className="text-xs font-semibold text-teal-700 inline-flex items-center gap-1 hover:underline">
                {t("join")} <ArrowRight size={12} aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

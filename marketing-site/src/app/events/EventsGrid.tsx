"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Globe, MapPin } from "lucide-react";

type EventListItem = {
  id: string; slug: string; title: string; subtitle: string | null; summary: string | null;
  cover_image_url: string | null;
  event_nature: "training" | "seminar" | "workshop" | "conference" | "meetup" | "webinar" | "other" | null;
  event_type: "online" | "in_person" | "hybrid";
  city: string | null; location_address: string | null;
  meeting_platform: "zoom" | "teams" | "google_meet" | "other" | null;
  start_at: string; end_at: string;
  price: string; is_featured: boolean;
  _count?: { registrations: number };
};

const NATURE_LABELS: Record<string, string> = {
  training: "Training", seminar: "Seminar", workshop: "Workshop",
  conference: "Conference", meetup: "Meetup", webinar: "Webinar", other: "Event",
};

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom", teams: "Microsoft Teams", google_meet: "Google Meet", other: "video call",
};

const MODE_LABELS: Record<string, string> = {
  in_person: "In-Person", hybrid: "Hybrid", online: "Online",
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-semibold px-4 py-2 rounded-full border-2 transition-colors ${
        active ? "border-teal-500 bg-teal-500 text-white" : "border-sand-300 bg-white text-ink-700 hover:border-teal-300"
      }`}
    >
      {children}
    </button>
  );
}

type EventNatureValue = NonNullable<EventListItem["event_nature"]>;
type EventModeValue = EventListItem["event_type"];

export default function EventsGrid({ events }: { events: EventListItem[] }) {
  const [nature, setNature] = useState<EventNatureValue | "all">("all");
  const [mode, setMode] = useState<EventModeValue | "all">("all");

  const availableNatures = useMemo(
    () => Array.from(new Set(events.map((e) => e.event_nature).filter((n): n is EventNatureValue => !!n))),
    [events],
  );
  const availableModes = useMemo(
    () => Array.from(new Set(events.map((e) => e.event_type))),
    [events],
  );

  const filtered = events.filter((e) => {
    if (nature !== "all" && e.event_nature !== nature) return false;
    if (mode !== "all" && e.event_type !== mode) return false;
    return true;
  });

  return (
    <div>
      {(availableNatures.length > 1 || availableModes.length > 1) && (
        <div className="flex flex-wrap items-center gap-2 mb-10">
          <FilterChip active={nature === "all"} onClick={() => setNature("all")}>All</FilterChip>
          {availableNatures.map((n) => (
            <FilterChip key={n} active={nature === n} onClick={() => setNature(n)}>
              {NATURE_LABELS[n] ?? n}
            </FilterChip>
          ))}
          {availableModes.length > 1 && <div className="w-px h-6 bg-sand-300 mx-1" />}
          {availableModes.map((m) => (
            <FilterChip key={m} active={mode === m} onClick={() => setMode(mode === m ? "all" : m)}>
              {MODE_LABELS[m] ?? m}
            </FilterChip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-sand-500 text-sm">No events match these filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((event) => {
            const price = Number(event.price);
            const start = new Date(event.start_at);
            const month = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
            const day = start.toLocaleDateString("en-US", { day: "numeric" });
            return (
              <Link key={event.id} href={`/events/${event.slug}`} className="card-hover flex flex-col overflow-hidden group">
                <div className="relative h-60 bg-gradient-to-br from-teal-500 to-ink-900 flex-shrink-0">
                  {event.cover_image_url && (
                    <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  )}
                  {event.event_nature && (
                    <span className="absolute top-4 left-4 text-xs font-bold px-3.5 py-1.5 rounded-full bg-white text-ink-900 shadow-md">
                      {NATURE_LABELS[event.event_nature] ?? event.event_nature}
                    </span>
                  )}
                  {event.is_featured && (
                    <span className="absolute top-4 right-4 text-xs font-bold px-3.5 py-1.5 rounded-full bg-teal-400 text-ink-900 shadow-md">Featured</span>
                  )}
                </div>
                <div className="relative px-6 pt-9 pb-6 flex-1 flex flex-col">
                  {/* Ticket-stub date block */}
                  <div className="absolute -top-8 left-6 w-16 h-16 rounded-xl bg-white shadow-card border border-sand-300 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider leading-none">{month}</span>
                    <span className="text-2xl font-display font-black text-ink-900 leading-none mt-1">{day}</span>
                  </div>

                  <p className="font-display font-bold text-ink-900 text-2xl leading-snug mb-2.5 line-clamp-2">{event.title}</p>
                  {event.summary && <p className="text-base text-ink-500 leading-relaxed line-clamp-2 mb-5 flex-1">{event.summary}</p>}

                  <div className="mt-auto pt-5 border-t border-sand-200 space-y-3">
                    <div className="flex items-start gap-2 text-sm font-semibold text-ink-800">
                      {event.event_type === "in_person" ? <MapPin size={16} className="shrink-0 mt-0.5 text-teal-600" /> : <Globe size={16} className="shrink-0 mt-0.5 text-teal-600" />}
                      <span>
                        {event.event_type === "in_person" && (
                          <>
                            In Person
                            {event.city && <> · <span className="font-black text-ink-900">{event.city}</span></>}
                            {event.location_address && <span className="font-normal text-ink-500">, {event.location_address}</span>}
                          </>
                        )}
                        {event.event_type === "hybrid" && (
                          <>
                            Hybrid
                            {event.city && <> · <span className="font-black text-ink-900">{event.city}</span></>}
                            {" "}· via {PLATFORM_LABELS[event.meeting_platform ?? ""] ?? "Online"}
                          </>
                        )}
                        {event.event_type === "online" && (
                          <>Online{event.meeting_platform && <> · via {PLATFORM_LABELS[event.meeting_platform]}</>}</>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {price > 0 ? (
                        <span className="text-2xl font-display font-black text-ink-900">${price.toLocaleString()}</span>
                      ) : (
                        <span className="text-base font-bold text-teal-600 uppercase tracking-wide">Free</span>
                      )}
                    </div>
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

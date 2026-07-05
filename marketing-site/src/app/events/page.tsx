import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Calendar, Globe, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Events",
  description: "Live training events, workshops, and seminars from the Professional Artificial Intelligence Institute.",
};

type EventListItem = {
  id: string; slug: string; title: string; subtitle: string | null; summary: string | null;
  cover_image_url: string | null; event_type: "online" | "in_person" | "hybrid";
  location_address: string | null; start_at: string; end_at: string;
  price: string; is_featured: boolean;
  _count?: { registrations: number };
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getEvents(): Promise<EventListItem[]> {
  try {
    const res = await fetch(`${API}/events`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json) as EventListItem[];
  } catch {
    return [];
  }
}

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  if (sameDay) return start.toLocaleDateString("en-US", dateOpts);
  return `${start.toLocaleDateString("en-US", dateOpts)} – ${end.toLocaleDateString("en-US", dateOpts)}`;
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <>
      <Navbar />
      <main>
        <section className="pt-[148px] pb-16 bg-hero-dark relative overflow-hidden">
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">Events</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">Live Training & Workshops</h1>
            <p className="text-lg text-white max-w-xl mx-auto">
              Join our live sessions with industry experts — online or in person, free or paid.
            </p>
          </div>
        </section>

        <section className="section-padding bg-white">
          <div className="container-lg">
            {events.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">No upcoming events — check back soon.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const price = Number(event.price);
                  return (
                    <Link key={event.id} href={`/events/${event.slug}`} className="card-hover flex flex-col overflow-hidden">
                      <div className="relative h-40 bg-gradient-to-br from-teal-500 to-navy-700 flex-shrink-0">
                        {event.cover_image_url && (
                          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                        )}
                        {event.is_featured && (
                          <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/90 text-navy-900">Featured</span>
                        )}
                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-navy-900/80 text-white">
                          {price > 0 ? `$${price.toLocaleString()}` : "Free"}
                        </span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <p className="font-display font-bold text-ink-900 text-lg leading-snug mb-2 line-clamp-2">{event.title}</p>
                        {event.summary && <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4 flex-1">{event.summary}</p>}
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap mt-auto pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1"><Calendar size={11} /> {formatDateRange(event.start_at, event.end_at)}</span>
                          <span className="flex items-center gap-1">
                            {event.event_type === "in_person" ? <MapPin size={11} /> : <Globe size={11} />}
                            {event.event_type === "in_person" ? (event.location_address?.split(",")[0] ?? "In Person") : "Online"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

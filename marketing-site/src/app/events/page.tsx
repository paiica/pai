import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Globe, MapPin } from "lucide-react";

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
              <div className="text-center py-20 text-sand-500 text-sm">No upcoming events — check back soon.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const price = Number(event.price);
                  const start = new Date(event.start_at);
                  const month = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  const day = start.toLocaleDateString("en-US", { day: "numeric" });
                  return (
                    <Link key={event.id} href={`/events/${event.slug}`} className="card-hover flex flex-col overflow-hidden group">
                      <div className="relative h-44 bg-gradient-to-br from-teal-500 to-ink-900 flex-shrink-0">
                        {event.cover_image_url && (
                          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                        {event.is_featured && (
                          <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-400 text-ink-900">Featured</span>
                        )}
                      </div>
                      <div className="relative px-5 pt-8 pb-5 flex-1 flex flex-col">
                        {/* Ticket-stub date block */}
                        <div className="absolute -top-7 left-5 w-14 h-14 rounded-xl bg-white shadow-card border border-sand-300 flex flex-col items-center justify-center">
                          <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wider leading-none">{month}</span>
                          <span className="text-xl font-display font-black text-ink-900 leading-none mt-1">{day}</span>
                        </div>

                        <p className="font-display font-bold text-ink-900 text-xl leading-snug mb-2 line-clamp-2">{event.title}</p>
                        {event.summary && <p className="text-sm text-ink-500 leading-relaxed line-clamp-2 mb-4 flex-1">{event.summary}</p>}

                        <div className="flex items-center justify-between gap-3 mt-auto pt-4 border-t border-sand-200">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-sand-600">
                            {event.event_type === "in_person" ? <MapPin size={13} /> : <Globe size={13} />}
                            {event.event_type === "in_person" ? (event.location_address?.split(",")[0] ?? "In Person") : "Online"}
                          </span>
                          {price > 0 ? (
                            <span className="text-xl font-display font-black text-ink-900">${price.toLocaleString()}</span>
                          ) : (
                            <span className="text-sm font-bold text-teal-600 uppercase tracking-wide">Free</span>
                          )}
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

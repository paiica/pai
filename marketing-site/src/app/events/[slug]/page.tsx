import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import EventRegisterForm from "./EventRegisterForm";
import { Calendar, Globe, MapPin } from "lucide-react";

type Speaker = { id: string; name: string; title: string; company: string; bio: string; photo_url: string };
type AgendaItem = { id: string; day_label: string; time: string; title: string; description: string };

type EventDetail = {
  id: string; slug: string; title: string; subtitle: string | null; summary: string | null;
  description: string | null; cover_image_url: string | null; promo_video_url: string | null;
  event_type: "online" | "in_person" | "hybrid"; location_address: string | null; meeting_link: string | null;
  timezone: string; start_at: string; end_at: string; price: string; currency: string;
  speakers: Speaker[] | null; agenda: AgendaItem[] | null; topics: string[];
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://paii.ca";

async function getEvent(slug: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${API}/events/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const e = json?.data ?? json;
    return e?.slug ? e : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Not Found" };
  return {
    title: event.title,
    description: event.summary ?? undefined,
    openGraph: {
      title: event.title,
      description: event.summary ?? undefined,
      images: event.cover_image_url ? [event.cover_image_url] : [],
    },
  };
}

function formatDateTime(startIso: string, endIso: string, timezone: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  if (sameDay) {
    return `${start.toLocaleDateString("en-US", dateOpts)} · ${start.toLocaleTimeString("en-US", timeOpts)} – ${end.toLocaleTimeString("en-US", timeOpts)} (${timezone})`;
  }
  return `${start.toLocaleDateString("en-US", dateOpts)} – ${end.toLocaleDateString("en-US", dateOpts)} (${timezone})`;
}

function embedVideoUrl(url: string) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.includes("youtu.be") ? url.split("/").pop() : url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

export default async function EventDetailPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ registered?: string }> }) {
  const { slug } = await params;
  const { registered } = await searchParams;
  const event = await getEvent(slug);
  if (!event) notFound();

  const price = Number(event.price);
  const speakers = Array.isArray(event.speakers) ? event.speakers : [];
  const agenda = Array.isArray(event.agenda) ? event.agenda : [];

  return (
    <>
      <Navbar />
      <main className="bg-white">
        {/* Hero */}
        <div className="pt-24 pb-16 bg-hero-dark relative overflow-hidden">
          <div className="container-md relative">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white">
                {event.event_type === "in_person" ? <MapPin size={12} /> : <Globe size={12} />}
                {event.event_type === "in_person" ? "In Person" : event.event_type === "hybrid" ? "Hybrid" : "Online"}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white">
                {price > 0 ? `$${price.toLocaleString()}` : "Free"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-white leading-tight mb-3 max-w-3xl">
              {event.title}
            </h1>
            {event.subtitle && <p className="text-lg text-white/70 max-w-2xl mb-5">{event.subtitle}</p>}
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Calendar size={14} />
              {formatDateTime(event.start_at, event.end_at, event.timezone)}
            </div>
          </div>
        </div>

        {event.cover_image_url && (
          <div className="container-md -mt-6 mb-0 relative z-10">
            <img src={event.cover_image_url} alt={event.title} className="w-full h-64 sm:h-80 object-cover rounded-2xl shadow-lg" />
          </div>
        )}

        <div className="container-md py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">
            {registered === "1" && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800 font-medium">
                Payment received — you're registered! Check your email for confirmation.
              </div>
            )}

            {event.description && (
              <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: event.description }} />
            )}

            {event.promo_video_url && (
              <div className="rounded-2xl overflow-hidden aspect-video shadow-lg">
                <iframe
                  src={embedVideoUrl(event.promo_video_url)}
                  className="w-full h-full"
                  allowFullScreen
                  title={event.title}
                />
              </div>
            )}

            {agenda.length > 0 && (
              <div>
                <h2 className="text-xl font-display font-black text-ink-900 mb-5">Agenda</h2>
                <div className="space-y-3">
                  {agenda.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-sand-50/40">
                      <div className="flex-shrink-0 w-24 text-xs font-bold text-teal-700 pt-0.5">
                        {item.day_label && <div className="text-slate-400 font-medium mb-0.5">{item.day_label}</div>}
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-ink-900 text-sm">{item.title}</p>
                        {item.description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {speakers.length > 0 && (
              <div>
                <h2 className="text-xl font-display font-black text-ink-900 mb-5">Speakers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {speakers.map((speaker) => (
                    <div key={speaker.id} className="flex gap-4 p-4 rounded-xl border border-slate-100">
                      <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                        {speaker.photo_url && <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900 text-sm">{speaker.name}</p>
                        <p className="text-xs text-slate-400 mb-1.5">
                          {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
                        </p>
                        {speaker.bio && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{speaker.bio}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.topics.map((topic) => (
                  <span key={topic} className="text-xs font-semibold px-3 py-1 rounded-full bg-sand-100 text-ink-900">{topic}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar — register form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <EventRegisterForm eventId={event.id} price={price} alreadyRegistered={registered === "1"} />
              <div className="rounded-2xl border border-slate-100 p-4 space-y-2.5 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400 flex-shrink-0" /> {formatDateTime(event.start_at, event.end_at, event.timezone)}</div>
                <div className="flex items-center gap-2">
                  {event.event_type === "in_person" ? <MapPin size={14} className="text-slate-400 flex-shrink-0" /> : <Globe size={14} className="text-slate-400 flex-shrink-0" />}
                  {event.event_type === "in_person" ? (event.location_address ?? "In person") : "Online — link sent after registration"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

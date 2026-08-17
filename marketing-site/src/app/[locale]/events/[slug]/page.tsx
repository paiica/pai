import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import EventRegisterForm from "./EventRegisterForm";
import SpeakerCard from "./SpeakerCard";
import { Calendar, Globe, MapPin } from "lucide-react";

type Speaker = { id: string; name: string; title: string; company: string; bio: string; photo_url: string };
type AgendaItem = { id: string; day_label: string; time: string; title: string; description: string };

type EventDetail = {
  id: string; slug: string; title: string; subtitle: string | null; summary: string | null;
  description: string | null; cover_image_url: string | null; promo_video_url: string | null;
  event_nature: "training" | "seminar" | "workshop" | "conference" | "meetup" | "webinar" | "other" | null;
  event_type: "online" | "in_person" | "hybrid";
  city: string | null; location_address: string | null; meeting_link: string | null;
  meeting_platform: "zoom" | "teams" | "google_meet" | "other" | null;
  timezone: string; start_at: string; end_at: string; price: string; currency: string;
  speakers: Speaker[] | null; agenda: AgendaItem[] | null; topics: string[];
};

const NATURE_LABELS: Record<string, string> = {
  training: "Training", seminar: "Seminar", workshop: "Workshop",
  conference: "Conference", meetup: "Meetup", webinar: "Webinar", other: "Event",
};

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom", teams: "Microsoft Teams", google_meet: "Google Meet", other: "video call",
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
  const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const speakers = Array.isArray(event.speakers) ? event.speakers.filter(isRecord) : [];
  const agenda = Array.isArray(event.agenda) ? event.agenda.filter(isRecord) : [];

  return (
    <>
      <Navbar />
      <main className="bg-white">
        {/* Hero */}
        <div className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 32px)" }}>
          <div className="container-md relative">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {event.event_nature && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white">
                  {NATURE_LABELS[event.event_nature] ?? event.event_nature}
                </span>
              )}
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
                <div className="space-y-4">
                  {agenda.map((item) => (
                    <div key={item.id} className="flex gap-5 p-6 rounded-2xl border border-sand-200 bg-sand-50/40">
                      <div className="flex-shrink-0 w-28 text-sm font-bold text-teal-700 pt-0.5">
                        {item.day_label && <div className="text-sand-500 font-medium mb-1">{item.day_label}</div>}
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-ink-900 text-lg leading-snug">{item.title}</p>
                        {item.description && <p className="text-base text-ink-500 mt-1.5 leading-relaxed">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {speakers.length > 0 && (
              <div>
                <h2 className="text-xl font-display font-black text-ink-900 mb-5">Speakers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {speakers.map((speaker) => (
                    <SpeakerCard key={speaker.id} speaker={speaker} />
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
              <div className="rounded-2xl border border-sand-200 p-4 space-y-2.5 text-sm text-ink-500">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-sand-400 flex-shrink-0" /> {formatDateTime(event.start_at, event.end_at, event.timezone)}</div>
                {event.event_type !== "online" && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-sand-400 flex-shrink-0 mt-0.5" />
                    <span>
                      {event.city && <span className="font-semibold text-ink-900">{event.city}</span>}
                      {event.city && event.location_address && ", "}
                      {event.location_address}
                      {!event.city && !event.location_address && "In person"}
                    </span>
                  </div>
                )}
                {event.event_type !== "in_person" && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-sand-400 flex-shrink-0" />
                    {event.meeting_platform
                      ? `via ${PLATFORM_LABELS[event.meeting_platform]} — link sent after registration`
                      : "Online — link sent after registration"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

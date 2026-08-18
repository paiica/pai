import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import EventsGrid from "./EventsGrid";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/events?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const cms = await getCmsPage(locale);
  return {
    title: cms?.title || "Events",
    description: cms?.meta_description || "Live training events, workshops, and seminars from the Professional Artificial Intelligence Institute.",
  };
}

async function getEvents(locale: string): Promise<EventListItem[]> {
  try {
    const res = await fetch(`${API}/events?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json) as EventListItem[];
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const locale = await getLocale();
  const t = await getTranslations("EventsPage");
  const events = await getEvents(locale);
  const cms = await getCmsPage(locale);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled, otherwise the original hardcoded copy */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
            <div className="container-lg relative text-center">
              <span className="badge-dark mb-5">{t("eventsBadge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">{t("heroHeading")}</h1>
              <p className="text-lg text-white max-w-xl mx-auto">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        <section className="section-padding bg-white">
          <div className="container-lg">
            {events.length === 0 ? (
              <div className="text-center py-20 text-sand-500 text-sm">{t("noUpcomingEvents")}</div>
            ) : (
              <EventsGrid events={events} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

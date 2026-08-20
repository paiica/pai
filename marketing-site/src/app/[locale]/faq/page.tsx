import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";
import PageBlocks from "@/components/blocks/PageBlocks";
import CategorizedFaqAccordion from "@/components/faq/CategorizedFaqAccordion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { id?: string; title?: string; content?: string; meta_description?: string; hero_enabled: boolean; blocks?: any[] };
type FaqGroup = { category: string; items: { id: string; question: string; answer: string }[] };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/faq?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

async function getFaqGroups(locale: string): Promise<FaqGroup[]> {
  try {
    const res = await fetch(`${API}/faqs/public?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json ?? []) as FaqGroup[];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const cms = await getCmsPage(locale);
  const title = cms?.title ?? "Certification FAQs | PAII";
  const description = cms?.meta_description ?? "Answers to the most common questions about PAII AI certifications: eligibility, registration, exams, results, renewal, verification, and study prep.";
  return {
    title, description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

type TFunc = (key: string) => string;

// Kept as a safety net for the (unlikely, once seeded) case of zero rows in
// the database — never show a blank FAQ page.
function getFallbackFaqs(t: TFunc) {
  return [
    {
      category: t("cat1Label"),
      items: [
        { q: t("cat1q1Q"), a: t("cat1q1A") },
        { q: t("cat1q2Q"), a: t("cat1q2A") },
        { q: t("cat1q3Q"), a: t("cat1q3A") },
        { q: t("cat1q4Q"), a: t("cat1q4A") },
      ],
    },
    {
      category: t("cat2Label"),
      items: [
        { q: t("cat2q1Q"), a: t("cat2q1A") },
        { q: t("cat2q2Q"), a: t("cat2q2A") },
        { q: t("cat2q3Q"), a: t("cat2q3A") },
      ],
    },
    {
      category: t("cat3Label"),
      items: [
        { q: t("cat3q1Q"), a: t("cat3q1A") },
        { q: t("cat3q2Q"), a: t("cat3q2A") },
        { q: t("cat3q3Q"), a: t("cat3q3A") },
        { q: t("cat3q4Q"), a: t("cat3q4A") },
      ],
    },
    {
      category: t("cat4Label"),
      items: [
        { q: t("cat4q1Q"), a: t("cat4q1A") },
        { q: t("cat4q2Q"), a: t("cat4q2A") },
        { q: t("cat4q3Q"), a: t("cat4q3A") },
      ],
    },
    {
      category: t("cat5Label"),
      items: [
        { q: t("cat5q1Q"), a: t("cat5q1A") },
        { q: t("cat5q2Q"), a: t("cat5q2A") },
        { q: t("cat5q3Q"), a: t("cat5q3A") },
      ],
    },
  ];
}

// Strips [label](/path) link syntax down to plain label text — FAQPage
// structured data wants plain answer text, not the site's internal link markup.
function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export default async function FAQPage() {
  const locale = await getLocale();
  const t = await getTranslations("FaqPage");
  const [cms, faqGroups] = await Promise.all([getCmsPage(locale), getFaqGroups(locale)]);

  const faqJsonLd = faqGroups.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((g) => g.items).map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: stripLinks(item.answer) },
    })),
  } : null;

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled, otherwise the original hardcoded copy */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-20 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
            <div className="container-lg relative text-center">
              <span className="badge-dark mb-5">{t("badge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">{t("heroHeading")}</h1>
              <p className="text-lg text-white max-w-xl mx-auto">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        <section className="section-padding bg-white">
          <div className="container-md">
            {faqGroups.length > 0 ? (
              <CategorizedFaqAccordion groups={faqGroups} />
            ) : (
              <div className="space-y-12">
                {getFallbackFaqs(t).map((section) => (
                  <div key={section.category}>
                    <h2 className="text-lg font-display font-black text-ink-900 mb-5 pb-3 border-b border-sand-200">
                      {section.category}
                    </h2>
                    <div className="space-y-4">
                      {section.items.map((item) => (
                        <div key={item.q} className="bg-sand-100 rounded-2xl p-5 border border-sand-200">
                          <h3 className="font-display font-bold text-ink-900 text-base mb-2">{item.q}</h3>
                          <p className="text-ink-900 text-sm leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <PageBlocks blocks={cms?.blocks ?? []} />
      </main>
      <Footer />
    </>
  );
}

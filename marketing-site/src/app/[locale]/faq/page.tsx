import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight } from "lucide-react";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { title: string; content: string; meta_description: string; hero_enabled: boolean };

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const cms = await getCmsPage(locale);
  return {
    title: cms?.title ?? "Frequently Asked Questions",
    description: cms?.meta_description ?? "Answers to the most common questions about PAII certifications, exams, enrollment, and credentials.",
  };
}

type TFunc = (key: string) => string;

function getFaqs(t: TFunc) {
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

export default async function FAQPage() {
  const locale = await getLocale();
  const t = await getTranslations("FaqPage");
  const cms = await getCmsPage(locale);
  const FAQS = getFaqs(t);

  return (
    <>
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

        {/* Content — CMS if available, otherwise hardcoded */}
        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <section className="section-padding bg-white">
            <div className="container-md">
              <div className="space-y-12">
                {FAQS.map((section) => (
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

              <div className="mt-14 bg-ink-800 rounded-2xl p-7 text-center text-white">
                <h3 className="font-display font-bold text-xl mb-2">{t("stillHaveQuestions")}</h3>
                <p className="text-white text-sm mb-5">{t("teamRespondsBody")}</p>
                <a href="mailto:info@paii.ca" className="btn-primary !py-3 !px-7 !text-sm">
                  {t("contactUs")} <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}


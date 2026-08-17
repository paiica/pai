import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SupportForm from "./SupportForm";
import { Mail, Clock, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { title: string; content: string; meta_description: string; hero_enabled: boolean };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/support?lang=${locale}`, { cache: "no-store" });
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
    title: cms?.title ?? "Support",
    description: cms?.meta_description ?? "Get help from the PAII support team — certifications, exams, enrollment, and account questions.",
  };
}

export default async function SupportPage() {
  const locale = await getLocale();
  const t = await getTranslations("SupportPage");
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
              <span className="badge-dark mb-5 justify-center">{t("badge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
                {t("heroHeading")}
              </h1>
              <p className="text-lg text-white/80 max-w-xl mx-auto">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <section className="section-padding bg-white">
            <div className="container-md">
              <div className="grid lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3">
                  <SupportForm />
                </div>

                <div className="lg:col-span-2 space-y-5">
                  <div className="card p-6">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3.5">
                      <Mail size={17} />
                    </div>
                    <p className="font-display font-bold text-ink-900 text-base mb-1.5">{t("emailUsDirectly")}</p>
                    <a href="mailto:support@paii.ca" className="text-sm text-teal-700 font-semibold hover:underline">
                      support@paii.ca
                    </a>
                  </div>

                  <div className="card p-6">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3.5">
                      <Clock size={17} />
                    </div>
                    <p className="font-display font-bold text-ink-900 text-base mb-1.5">{t("responseTime")}</p>
                    <p className="text-sm text-slate-500">{t("responseTimeBody")}</p>
                  </div>

                  <div className="card p-6">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3.5">
                      <HelpCircle size={17} />
                    </div>
                    <p className="font-display font-bold text-ink-900 text-base mb-1.5">{t("commonQuestions")}</p>
                    <p className="text-sm text-slate-500 mb-3">{t("checkFaqFirst")}</p>
                    <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm text-teal-700 font-semibold hover:underline">
                      {t("visitFaq")} <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

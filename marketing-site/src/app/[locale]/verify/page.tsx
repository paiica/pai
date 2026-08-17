import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VerifyForm from "./VerifyForm";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/verify?lang=${locale}`, { cache: "no-store" });
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
    title: cms?.title || "Verify a PAII Credential",
    description: cms?.meta_description || "Verify the authenticity of a PAII certificate or credential.",
  };
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("VerifyPage");
  const cms = await getCmsPage(locale);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled, otherwise the original hardcoded copy */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-24 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
            <div className="container-lg relative text-center">
              <span className="badge-dark mb-5">{t("badge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
                {t("heroHeading")}
              </h1>
              <p className="text-lg text-white max-w-xl mx-auto">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        <section className="section-padding bg-white">
          <div className="max-w-xl mx-auto px-4">
            <VerifyForm initialId={id || ""} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

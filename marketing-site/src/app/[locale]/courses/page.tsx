import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { BookOpen, ChevronRight } from "lucide-react";
import CoursesGrid from "./CoursesGrid";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { hero_enabled: boolean; title?: string; meta_description?: string };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/courses?lang=${locale}`, { cache: "no-store" });
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
    title: cms?.title || "Prep Courses | Professional Artificial Intelligence Institute",
    description: cms?.meta_description || "Self-paced online courses to build practical AI skills and prepare for certification exams.",
  };
}

async function getCourses(locale: string): Promise<any[]> {
  try {
    const res = await fetch(`${API}/prep-courses?lang=${locale}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch { return []; }
}

export default async function CoursesListPage() {
  const locale = await getLocale();
  const t = await getTranslations("Courses");
  const tc = await getTranslations("Common");
  const courses = await getCourses(locale);
  const cms = await getCmsPage(locale);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled, otherwise the original hardcoded copy */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-20 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,145,58,0.9) 1px, transparent 0)",
                backgroundSize: "48px 48px",
              }}
            />
            <div className="container-lg relative">
              <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-5">
                <Link href="/" className="hover:text-white transition-colors">{tc("home")}</Link>
                <ChevronRight size={12} />
                <span className="text-white">{t("breadcrumb")}</span>
              </div>
              <span className="badge-dark mb-5">{t("prepCoursesBadge")}</span>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
                {t("heroHeading")}
                <br />
                <span className="text-gradient">{t("heroHeadingHighlight")}</span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl">
                {t("heroBody")}
              </p>
            </div>
          </section>
        )}

        {/* Course Grid */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            {courses.length === 0 ? (
              <div className="py-20 text-center">
                <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-slate-500">{t("noCoursesAvailable")}</p>
              </div>
            ) : (
              <CoursesGrid courses={courses} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

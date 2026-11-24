import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { GraduationCap, ChevronRight, ArrowRight, Globe, BookOpen } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type PublicInstitution = {
  id: string; name: string; slug: string; code: string;
  logo_url: string | null; description: string | null; website: string | null;
};

type PublicCourse = {
  id: string; slug: string; title: string; subtitle: string | null; price: number | string;
};

async function getInstitution(slug: string): Promise<PublicInstitution | null> {
  try {
    const res = await fetch(`${API}/institutions/public/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as PublicInstitution;
  } catch { return null; }
}

async function getCourses(institutionId: string): Promise<PublicCourse[]> {
  try {
    const res = await fetch(`${API}/prep-courses/institution/${institutionId}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const institution = await getInstitution(slug);
  return {
    title: institution ? `${institution.name} | Professional Artificial Intelligence Institute` : "Institution | PAII",
    description: institution?.description || undefined,
  };
}

export default async function InstitutionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tc = await getTranslations("Common");
  const institution = await getInstitution(slug);
  if (!institution) notFound();
  const courses = await getCourses(institution.id);

  return (
    <>
      <Navbar />
      <main>
        <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
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
              <Link href="/institutions" className="hover:text-white transition-colors">Institutions</Link>
              <ChevronRight size={12} />
              <span className="text-white truncate max-w-xs">{institution.name}</span>
            </div>

            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {institution.logo_url ? (
                  <img src={institution.logo_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <GraduationCap size={26} className="text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-display font-black text-white leading-tight">{institution.name}</h1>
                {institution.website && (
                  <a
                    href={institution.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mt-2 transition-colors"
                  >
                    <Globe size={13} /> {institution.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>

            {institution.description && (
              <p className="text-lg text-white/80 max-w-2xl mt-6">{institution.description}</p>
            )}
          </div>
        </section>

        <section className="section-padding bg-white">
          <div className="container-lg">
            <h2 className="text-2xl font-display font-black text-ink-900 mb-8">Courses from {institution.name}</h2>
            {courses.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen size={36} className="mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-slate-500">No public courses yet — check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="bg-white rounded-2xl border border-sand-300 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col p-6"
                  >
                    <h3 className="font-display font-black text-ink-900 text-lg leading-snug mb-2">{course.title}</h3>
                    {course.subtitle && (
                      <p className="text-sm text-ink-900/70 leading-relaxed mb-5 flex-1 line-clamp-2">{course.subtitle}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-sand-200 flex items-center justify-between">
                      <span className="text-lg font-mono font-bold text-ink-900">
                        {Number(course.price) === 0 ? "Free" : `$${Number(course.price).toLocaleString()}`}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-900">
                        View <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

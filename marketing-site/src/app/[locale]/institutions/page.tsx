import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { GraduationCap, ChevronRight, ArrowRight, BookOpen } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type PublicInstitution = {
  id: string; name: string; slug: string | null; code: string;
  logo_url: string | null; description: string | null; public_course_count: number;
};

async function getInstitutions(): Promise<PublicInstitution[]> {
  try {
    const res = await fetch(`${API}/institutions/public`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch { return []; }
}

export const metadata: Metadata = {
  title: "Partner Institutions | Professional Artificial Intelligence Institute",
  description: "Universities and colleges partnering with PAII to offer AI courses under their own brand.",
};

export default async function InstitutionsListPage() {
  const locale = await getLocale();
  const tc = await getTranslations("Common");
  const institutions = await getInstitutions();

  return (
    <>
      <Navbar />
      <main>
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
              <span className="text-white">Partner Institutions</span>
            </div>
            <span className="badge-dark mb-5">Academic Cloud</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
              Universities & Colleges<br /><span className="text-gradient">on PAII</span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl">
              Institutions offering courses under their own brand, powered by PAII's platform.
            </p>
          </div>
        </section>

        <section className="section-padding bg-white">
          <div className="container-lg">
            {institutions.length === 0 ? (
              <div className="py-20 text-center">
                <GraduationCap size={40} className="mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-slate-500">No partner institutions listed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {institutions.map((inst) => (
                  <Link
                    key={inst.id}
                    href={inst.slug ? `/institutions/${inst.slug}` : "#"}
                    className="bg-white rounded-2xl border border-sand-300 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col p-6"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sand-50 border border-sand-200 flex items-center justify-center mb-4 overflow-hidden">
                      {inst.logo_url ? (
                        <img src={inst.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <GraduationCap size={20} className="text-teal-600" />
                      )}
                    </div>
                    <h3 className="font-display font-black text-ink-900 text-lg leading-snug mb-2">{inst.name}</h3>
                    {inst.description && (
                      <p className="text-sm text-ink-900/70 leading-relaxed mb-5 flex-1 line-clamp-3">{inst.description}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-sand-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-sand-500">
                        <BookOpen size={12} /> {inst.public_course_count} course{inst.public_course_count === 1 ? "" : "s"}
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

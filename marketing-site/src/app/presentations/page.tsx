import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PRESENTATIONS } from "./data";
import { GraduationCap, Users, TrendingUp, ArrowRight, PlayCircle } from "lucide-react";

const ICONS: Record<string, React.ComponentType<any>> = {
  "student-guide": GraduationCap,
  "educator-affiliate-program": Users,
  "affiliate-portal-walkthrough": TrendingUp,
};

export const metadata: Metadata = {
  title: "Presentations",
  description: "Browse PAII's presentation decks for students, educators, and affiliates.",
};

export default function PresentationsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5 justify-center">Presentations</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              PAII Presentation Library
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Walk through what PAII offers — whether you&apos;re a prospective student,
              an educator, or an affiliate partner.
            </p>
          </div>
        </section>

        <section className="section-padding bg-white">
          <div className="container-md">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRESENTATIONS.map((p) => {
                const Icon = ICONS[p.slug] ?? PlayCircle;
                return (
                  <Link key={p.slug} href={`/presentations/${p.slug}`} className="card-hover p-6 flex flex-col">
                    <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                      <Icon size={19} />
                    </div>
                    <span className="badge-teal mb-2.5">{p.audience}</span>
                    <p className="font-display font-black text-ink-900 text-lg leading-snug mb-2">
                      {p.title}
                    </p>
                    <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1">
                      {p.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
                      View Presentation <ArrowRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

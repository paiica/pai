import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { BookOpen, ChevronRight } from "lucide-react";
import CoursesGrid from "./CoursesGrid";

export const metadata: Metadata = {
  title: "Prep Courses | Professional Artificial Intelligence Institute",
  description: "Self-paced online courses to build practical AI skills and prepare for certification exams.",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getCourses(): Promise<any[]> {
  try {
    const res = await fetch(`${API}/prep-courses`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch { return []; }
}

export default async function CoursesListPage() {
  const courses = await getCourses();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
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
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={12} />
              <span className="text-white">Courses</span>
            </div>
            <span className="badge-dark mb-5">Prep Courses</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
              Learn at Your Own Pace.
              <br />
              <span className="text-gradient">Pass with Confidence.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl">
              Self-paced courses built to develop practical AI skills and prepare you for certification exams.
            </p>
          </div>
        </section>

        {/* Course Grid */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            {courses.length === 0 ? (
              <div className="py-20 text-center">
                <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-slate-500">No courses available yet — check back soon.</p>
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

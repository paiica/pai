import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SupportForm from "./SupportForm";
import { Mail, Clock, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = { title: string; content: string; meta_description: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/support`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsPage();
  return {
    title: cms?.title ?? "Support",
    description: cms?.meta_description ?? "Get help from the PAII support team — certifications, exams, enrollment, and account questions.",
  };
}

export default async function SupportPage() {
  const cms = await getCmsPage();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — always hardcoded */}
        <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5 justify-center">Support</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              We&apos;re here to help
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Questions about certifications, exams, or your account? Send us a message
              and our support team will respond within 24 hours.
            </p>
          </div>
        </section>

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
                    <p className="font-display font-bold text-ink-900 text-base mb-1.5">Email us directly</p>
                    <a href="mailto:support@paii.ca" className="text-sm text-teal-700 font-semibold hover:underline">
                      support@paii.ca
                    </a>
                  </div>

                  <div className="card p-6">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3.5">
                      <Clock size={17} />
                    </div>
                    <p className="font-display font-bold text-ink-900 text-base mb-1.5">Response time</p>
                    <p className="text-sm text-slate-500">We respond within 24 hours on business days.</p>
                  </div>

                  <div className="card p-6">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3.5">
                      <HelpCircle size={17} />
                    </div>
                    <p className="font-display font-bold text-ink-900 text-base mb-1.5">Common questions</p>
                    <p className="text-sm text-slate-500 mb-3">Check the FAQ first — you might find your answer instantly.</p>
                    <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm text-teal-700 font-semibold hover:underline">
                      Visit FAQ <ArrowRight size={13} />
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

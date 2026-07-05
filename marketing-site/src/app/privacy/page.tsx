import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = { title: string; content: string; meta_description: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/privacy`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

const SECTIONS = [
  { title: "Information We Collect", content: "We collect information you provide directly to us, including your name, email address, professional background, and payment information when you apply for a certification program. We also collect usage data about how you interact with our platform." },
  { title: "How We Use Your Information", content: "We use the information we collect to process your application, deliver our certification programs, communicate with you about your enrollment, issue your credential, and improve our services. We do not sell your personal information to third parties." },
  { title: "Data Storage & Security", content: "Your data is stored on encrypted servers in Canada and the United States. We use industry-standard security practices including TLS encryption, access controls, and regular security audits. Payment data is processed via Stripe and never stored on our servers." },
  { title: "Your Rights (PIPEDA / GDPR)", content: "You have the right to access, correct, or delete your personal information. You may also request a copy of your data in a portable format. To exercise these rights, contact privacy@paii.ca." },
  { title: "Cookies", content: "We use essential cookies for authentication and performance cookies (via analytics tools) to understand how our site is used. You can control non-essential cookies via your browser settings." },
  { title: "Contact", content: "For privacy-related questions, contact our Privacy Officer at privacy@paii.ca or write to: Professional Artificial Intelligence Institute, Toronto, ON, Canada." },
];

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsPage();
  return {
    title: cms?.title ?? "Privacy Policy",
    description: cms?.meta_description ?? "Professional Artificial Intelligence Institute Privacy Policy.",
  };
}

export default async function PrivacyPage() {
  const cms = await getCmsPage();

  return (
    <>
      <Navbar />
      <main className="pb-20 bg-white" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
        <div className="container-md">
          {cms?.content ? (
            <div
              className="prose prose-slate max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: cms.content }}
            />
          ) : (
            <>
              <h1 className="text-4xl font-display font-black text-ink-900 mb-3">Privacy Policy</h1>
              <p className="text-ink-900 text-sm mb-10">Last updated: June 1, 2026</p>
              <div className="prose prose-slate max-w-none space-y-8">
                {SECTIONS.map(({ title, content }) => (
                  <div key={title}>
                    <h2 className="text-xl font-display font-bold text-ink-900 mb-3">{title}</h2>
                    <p className="text-ink-900 leading-relaxed text-sm">{content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}


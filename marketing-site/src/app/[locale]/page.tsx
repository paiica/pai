import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import CertificationsSection from "@/components/sections/CertificationsSection";
import CoursesSection from "@/components/sections/CoursesSection";
import VideoSection from "@/components/sections/VideoSection";
import BlogSection from "@/components/sections/BlogSection";
import WhyPAISection from "@/components/sections/WhyPAISection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import IdentitySection from "@/components/sections/IdentitySection";
import CTASection from "@/components/sections/CTASection";
import LogoStripSection from "@/components/sections/LogoStripSection";
import UpdatesSection from "@/components/sections/UpdatesSection";
import PromoBannerSection from "@/components/sections/PromoBannerSection";
import LeadCapturePopup from "@/components/LeadCapturePopup";

type PageBlock = { key: string; is_visible: boolean; sort_order: number; content: Record<string, any> };

const SECTION_MAP: Record<string, React.ComponentType<any>> = {
  hero:           HeroSection,
  identity:       IdentitySection,
  certifications: CertificationsSection,
  courses:        CoursesSection,
  video:          VideoSection,
  why_pai:        WhyPAISection,
  testimonials:   TestimonialsSection,
  blog:           BlogSection,
  cta:            CTASection,
  logos:          LogoStripSection,
  updates:        UpdatesSection,
  promo_banner:   PromoBannerSection,
};

async function getBlocks(locale: string): Promise<PageBlock[]> {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  try {
    const res = await fetch(`${API}/page-blocks/public?lang=${locale}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error();
    const json = await res.json();
    return (json.data ?? json) as PageBlock[];
  } catch {
    // Return all visible by default if API is unreachable
    return Object.keys(SECTION_MAP).map((key, i) => ({ key, is_visible: true, sort_order: i + 1, content: {} }));
  }
}

async function getLeadPopupEnabled(): Promise<boolean> {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  try {
    const res = await fetch(`${API}/site-settings/public`, { next: { revalidate: 60 } });
    if (!res.ok) return false;
    const json = await res.json();
    const settings = json.data ?? json;
    return settings?.lead_popup_homepage_enabled === "true";
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const locale = await getLocale();
  const [blocks, leadPopupEnabled] = await Promise.all([getBlocks(locale), getLeadPopupEnabled()]);
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <Navbar />
      <main>
        {sorted.map((block) => {
          if (!block.is_visible) return null;
          const baseKey = block.key.replace(/_\d+$/, "");
          const Section = SECTION_MAP[block.key] ?? SECTION_MAP[baseKey];
          if (!Section) return null;
          return <Section key={block.key} cmsContent={block.content} />;
        })}
      </main>
      <Footer />
      {leadPopupEnabled && <LeadCapturePopup source="homepage" />}
    </>
  );
}

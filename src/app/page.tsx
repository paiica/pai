import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import StatsSection from "@/components/home/StatsSection";
import WhyPAI from "@/components/home/WhyPAI";
import FeaturedCertifications from "@/components/home/FeaturedCertifications";
import LearningPathway from "@/components/home/LearningPathway";
import CertificationBenefits from "@/components/home/CertificationBenefits";
import EmployerRecognition from "@/components/home/EmployerRecognition";
import Testimonials from "@/components/home/Testimonials";
import CorporateTrainingSection from "@/components/home/CorporateTrainingSection";
import FAQ from "@/components/home/FAQ";

export const metadata: Metadata = {
  title: "Professional AI Institute | Advance Your Career with AI Certifications",
  description:
    "Earn the Certified AI Professional (CAIP) and other industry-recognized AI credentials. Designed for business professionals, managers, educators, and leaders. No coding required.",
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <StatsSection />
        <WhyPAI />
        <FeaturedCertifications />
        <LearningPathway />
        <CertificationBenefits />
        <EmployerRecognition />
        <Testimonials />
        <CorporateTrainingSection />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function CTASection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge      = cmsContent.badge      || "Limited Cohort Enrollment";
  const title      = cmsContent.title      || "Your AI Credential Starts Here.";
  const highlight  = cmsContent.highlight  || "Applications Open Now.";
  const subtitle   = cmsContent.subtitle   || "Join professionals from 48 countries who've earned their PAI credential. Each cohort is limited to ensure quality. Apply today to secure your spot.";
  const ctaLabel   = cmsContent.cta_label  || "Apply for CAIP — $1,295";
  const ctaHref    = cmsContent.cta_href   || "/certifications/certified-ai-professional";
  const cta2Label  = cmsContent.cta2_label || "Compare all programs";
  const cta2Href   = cmsContent.cta2_href  || "/certifications";
  const trust1     = cmsContent.trust_1    || "30-day money-back guarantee";
  const trust2     = cmsContent.trust_2    || "Secure checkout";
  const trust3     = cmsContent.trust_3    || "Instant LMS access";

  return (
    <section className="section-padding bg-hero-dark relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(20,184,166,0.9) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="container-lg relative text-center">
        <span className="badge-dark mb-6">{badge}</span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white mb-6 leading-tight">
          {title}
          <br />
          <span className="text-gradient">{highlight}</span>
        </h2>
        <p className="text-lg text-white max-w-xl mx-auto mb-10 leading-relaxed">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={ctaHref} className="btn-primary !py-4 !px-10 !text-base">
            {ctaLabel} <ArrowRight size={16} />
          </Link>
          <Link href={cta2Href} className="inline-flex items-center gap-2 text-white hover:text-white font-semibold text-sm transition-colors">
            {cta2Label}
          </Link>
        </div>
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="flex items-center gap-1.5 text-xs text-white">
            <Shield size={12} className="text-white" /> {trust1}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white">
            <Shield size={12} className="text-white" /> {trust2}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white">
            <Shield size={12} className="text-white" /> {trust3}
          </div>
        </div>
      </div>
    </section>
  );
}

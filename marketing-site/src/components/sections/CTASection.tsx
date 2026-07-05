import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function CTASection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  // No admin customization yet — nothing real to show, so don't invent it.
  if (Object.keys(cmsContent).length === 0) return null;

  const badge      = cmsContent.badge      || "";
  const title      = cmsContent.title      || "";
  const highlight  = cmsContent.highlight  || "";
  const subtitle   = cmsContent.subtitle   || "";
  const ctaLabel   = cmsContent.cta_label  || "";
  const ctaHref    = cmsContent.cta_href   || "/certifications";
  const cta2Label  = cmsContent.cta2_label || "";
  const cta2Href   = cmsContent.cta2_href  || "/certifications";
  const trust1     = cmsContent.trust_1    || "";
  const trust2     = cmsContent.trust_2    || "";
  const trust3     = cmsContent.trust_3    || "";

  if (!title && !ctaLabel) return null;

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
        {badge && <span className="badge-dark mb-6">{badge}</span>}
        {(title || highlight) && (
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white mb-6 leading-tight">
            {title}
            <br />
            <span className="text-gradient">{highlight}</span>
          </h2>
        )}
        {subtitle && (
          <p className="text-lg text-white max-w-xl mx-auto mb-10 leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {ctaLabel && (
            <Link href={ctaHref} className="btn-primary !py-4 !px-10 !text-base">
              {ctaLabel} <ArrowRight size={16} />
            </Link>
          )}
          {cta2Label && (
            <Link href={cta2Href} className="inline-flex items-center gap-2 text-white hover:text-white font-semibold text-sm transition-colors">
              {cta2Label}
            </Link>
          )}
        </div>
        {(trust1 || trust2 || trust3) && (
          <div className="flex items-center justify-center gap-6 mt-8">
            {trust1 && <div className="flex items-center gap-1.5 text-xs text-white"><Shield size={12} className="text-white" /> {trust1}</div>}
            {trust2 && <div className="flex items-center gap-1.5 text-xs text-white"><Shield size={12} className="text-white" /> {trust2}</div>}
            {trust3 && <div className="flex items-center gap-1.5 text-xs text-white"><Shield size={12} className="text-white" /> {trust3}</div>}
          </div>
        )}
      </div>
    </section>
  );
}

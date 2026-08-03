import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PromoBannerSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const imageUrl    = cmsContent.image_url ?? "";
  const title       = cmsContent.title ?? "";
  const description = cmsContent.description ?? "";
  const ctaLabel    = cmsContent.cta_label ?? "";
  const ctaHref     = cmsContent.cta_href ?? "#";
  const overlay     = cmsContent.overlay !== false;

  if (!title && !imageUrl) return null;

  return (
    <section className="section-padding bg-sand-100">
      <div className="container-lg">
        <div
          className="relative rounded-3xl overflow-hidden min-h-[420px] flex items-center bg-cover bg-center"
          style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
        >
          {!imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#122242] to-[#1e3a6e]" />}
          {/* Darkest at the text side, fading toward the image so an
              arbitrary uploaded photo stays legible under white text
              without hiding the picture entirely. Skippable when the image
              is already dark enough on its own. */}
          {overlay && <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />}

          <div className="relative z-10 max-w-lg px-8 sm:px-14 py-14">
            {title && (
              <h2 className="font-display font-black text-3xl sm:text-4xl text-white mb-4 leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-8">{description}</p>
            )}
            {ctaLabel && (
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 bg-white text-ink-900 font-bold rounded-full px-6 py-3.5 hover:bg-teal-50 transition-colors"
              >
                {ctaLabel} <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

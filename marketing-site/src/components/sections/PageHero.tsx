import Link from "next/link";
import { cn } from "@/lib/utils";

export type PageHeroProps = {
  hero_badge?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  hero_align?: string;
  hero_image_url?: string;
  hero_image_position?: string;
  hero_image_zoom?: number;
  hero_overlay?: boolean;
  hero_cta_label?: string;
  hero_cta_href?: string;
};

const ALIGN_CLASSES: Record<string, string> = {
  left: "text-left mr-auto",
  center: "text-center mx-auto",
  right: "text-right ml-auto",
};

// Single-image hero, shared by every marketing page's CMS-controlled hero
// (the homepage keeps its own carousel/video/stats HeroSection, this is the
// simpler interior-page version). Falls back to the same bg-hero-dark
// gradient every hardcoded page hero already used when no image is set, so
// pages that opt in without uploading an image look consistent with the rest
// of the site by default.
export default function PageHero({
  hero_badge, hero_headline, hero_subheadline, hero_align = "center",
  hero_image_url, hero_image_position, hero_image_zoom, hero_overlay,
  hero_cta_label, hero_cta_href,
}: PageHeroProps) {
  if (!hero_headline?.trim()) return null;

  const alignClass = ALIGN_CLASSES[hero_align] ?? ALIGN_CLASSES.center;

  return (
    <section
      className={cn("pb-24 relative overflow-hidden", !hero_image_url && "bg-hero-dark")}
      style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}
    >
      {hero_image_url && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url("${hero_image_url}")`,
              backgroundPosition: hero_image_position || "50% 50%",
              transform: `scale(${(hero_image_zoom ?? 100) / 100})`,
              transformOrigin: hero_image_position || "50% 50%",
            }}
          />
          {hero_overlay !== false && <div className="absolute inset-0 bg-black/60" />}
        </>
      )}

      <div className="container-lg relative">
        <div className={cn("max-w-2xl", alignClass)}>
          {hero_badge?.trim() && <span className="badge-dark mb-5">{hero_badge}</span>}
          <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
            {hero_headline}
          </h1>
          {hero_subheadline?.trim() && (
            <p className="text-lg text-white">{hero_subheadline}</p>
          )}
          {hero_cta_label?.trim() && hero_cta_href?.trim() && (
            <Link href={hero_cta_href} className="btn-primary mt-7">
              {hero_cta_label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

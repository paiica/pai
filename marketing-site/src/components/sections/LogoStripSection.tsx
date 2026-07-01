import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoItem = { image_url: string; alt: string; href: string; highlighted: boolean };

function LogoBadge({ item }: { item: LogoItem }) {
  const badgeEl = (
    <div
      className={cn(
        "flex items-center justify-center h-24 px-9 rounded-full bg-white transition-colors duration-200",
        item.highlighted
          ? "border-2 border-teal-500 shadow-[0_0_0_4px_rgba(13,148,136,0.08)]"
          : "border border-sand-300 hover:border-teal-300"
      )}
    >
      <img
        src={item.image_url}
        alt={item.alt || "Recognized credential mark"}
        className="h-16 max-w-[180px] object-contain"
      />
    </div>
  );
  return item.href ? (
    <Link href={item.href} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
      {badgeEl}
    </Link>
  ) : (
    <div className="flex-shrink-0">{badgeEl}</div>
  );
}

export default function LogoStripSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge = cmsContent.badge || "";
  const title = cmsContent.title || "";
  const items: LogoItem[] = Array.isArray(cmsContent.items)
    ? cmsContent.items.filter((i: LogoItem) => i?.image_url)
    : [];

  if (items.length === 0) return null;

  return (
    <section className="section-padding bg-sand-100 border-y border-sand-300">
      <div className="container-lg">
        {(badge || title) && (
          <div className="text-center mb-10">
            {badge && <span className="badge-teal mb-4">{badge}</span>}
            {title && <h2 className="section-title">{title}</h2>}
          </div>
        )}
      </div>

      {/* Full-bleed scrolling track — fades at the edges so logos scroll in/out smoothly */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="flex w-max items-center gap-3 sm:gap-4 animate-marquee">
          {[...items, ...items].map((item, i) => (
            <LogoBadge key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

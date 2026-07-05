import { Star, Quote } from "lucide-react";

type TestimonialItem = { name: string; title: string; company: string; cert: string; avatar: string; rating: string; quote: string };

export default function TestimonialsSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge    = cmsContent.badge    || "What Professionals Say";
  const title    = cmsContent.title    || "Trusted by Industry Leaders";
  const subtitle = cmsContent.subtitle || "";
  const items: TestimonialItem[] = (cmsContent.items as TestimonialItem[]) ?? [];

  if (items.length === 0) return null;

  return (
    <section className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center mb-14">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">{title}</h2>
          {subtitle && <p className="section-subtitle max-w-xl mx-auto">{subtitle}</p>}
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {items.map((t, i) => (
            <div key={i} className="break-inside-avoid card-base p-6 mb-5">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: Number(t.rating) || 5 }).map((_, j) => (
                  <Star key={j} size={14} className="text-ink-900 fill-ink-900" />
                ))}
              </div>
              <Quote size={20} className="text-ink-900 mb-3" />
              <p className="text-sm text-ink-900 leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ink-800 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-900">{t.name}</div>
                  <div className="text-xs text-ink-900">{t.title} · {t.company}</div>
                </div>
                <span className="ml-auto text-xs font-bold text-ink-900 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
                  {t.cert}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

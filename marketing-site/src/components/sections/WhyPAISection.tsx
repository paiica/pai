import { Shield, Globe2, BookOpen, Award, TrendingUp, Users2, RefreshCw, Zap, LucideIcon } from "lucide-react";

const PILLAR_ICONS: LucideIcon[] = [Shield, Globe2, BookOpen, Award, TrendingUp, RefreshCw, Users2, Zap];

type Pillar = { title: string; description: string };

export default function WhyPAISection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge    = cmsContent.badge    || "Why PAII";
  const title    = cmsContent.title    || "The Credential That Opens Doors";
  const subtitle = cmsContent.subtitle || "";
  const pillars: Pillar[] = (cmsContent.pillars as Pillar[]) ?? [];

  if (pillars.length === 0) return null;

  return (
    <section className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center mb-14">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">{title}</h2>
          {subtitle && <p className="section-subtitle max-w-2xl mx-auto">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map(({ title: pTitle, description }, i) => {
            const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length];
            return (
              <div key={i} className="card-hover p-6 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-sand-200 text-ink-900 group-hover:scale-110 transition-transform">
                  <Icon size={22} />
                </div>
                <h3 className="font-display font-bold text-ink-900 text-base mb-2">{pTitle}</h3>
                <p className="text-sm text-ink-900 leading-relaxed">{description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

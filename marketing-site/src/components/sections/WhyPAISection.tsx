import { Shield, Globe2, BookOpen, Award, TrendingUp, Users2, RefreshCw, Zap, LucideIcon } from "lucide-react";

const PILLAR_ICONS: LucideIcon[] = [Shield, Globe2, BookOpen, Award, TrendingUp, RefreshCw, Users2, Zap];

const DEFAULT_PILLARS = [
  { title: "Rigorous & Credible",          description: "Our exams are developed by AI practitioners and reviewed by independent subject-matter experts. ISO 17024-aligned standards ensure your credential means something." },
  { title: "Globally Recognized",           description: "PAI credentials are recognized by employers across 48 countries. Verified via QR code, blockchain-anchored, and LinkedIn-ready in minutes." },
  { title: "Practitioner-Built Curriculum", description: "Every module is authored by active AI professionals — not theorists. Real tools, real workflows, real outcomes. Updated every quarter." },
  { title: "Digital Badges & Certificates", description: "Earn a digital certificate, Open Badge 3.0, and LinkedIn credential. Share and verify instantly with your network and employers." },
  { title: "Career-Defining Impact",        description: "87% of certified professionals report a measurable career advancement within 12 months. Average salary uplift: 18-24% in benchmark studies." },
  { title: "Continuing Education",          description: "AI moves fast. Every certification includes 2-year renewal pathways so your credential stays current with the field." },
  { title: "Global Peer Network",           description: "Join a vetted community of 3,200+ certified AI professionals. Access forums, mentorship, and exclusive events." },
  { title: "Self-Paced Learning",           description: "Complete the program at your own pace on any device. Average completion: 6-10 weeks. No deadlines, no pressure." },
];

type Pillar = { title: string; description: string };

export default function WhyPAISection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge    = cmsContent.badge    || "Why PAI";
  const title    = cmsContent.title    || "The Credential That Opens Doors";
  const subtitle = cmsContent.subtitle || "Not another course. A rigorous, globally recognized certification backed by practitioners, validated by employers, and built for the AI era.";
  const pillars: Pillar[] = (cmsContent.pillars as Pillar[]) ?? DEFAULT_PILLARS;

  return (
    <section className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center mb-14">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">{title}</h2>
          <p className="section-subtitle max-w-2xl mx-auto">{subtitle}</p>
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

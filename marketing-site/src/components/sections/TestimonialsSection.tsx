import { Star, Quote } from "lucide-react";

const DEFAULT_ITEMS = [
  { name: "Sarah Chen",      title: "Senior Product Manager", company: "Shopify",              cert: "CAIP",  avatar: "SC", rating: "5", quote: "CAIP gave me the credibility to lead our AI integration projects. Within 3 months of certifying, I was promoted to lead our AI task force. The curriculum is genuinely rigorous — my team noticed the difference immediately." },
  { name: "Marcus Williams", title: "Director of Operations",  company: "KPMG",                cert: "CAIM",  avatar: "MW", rating: "5", quote: "CAIM is the only certification I've found that addresses the real management challenges of AI adoption — change management, ROI measurement, and building AI-literate teams. Worth every penny." },
  { name: "Priya Patel",     title: "Chief Digital Officer",   company: "Intact Financial",    cert: "CAIE",  avatar: "PP", rating: "5", quote: "As a CDO, I needed a credential that spoke the language of the boardroom. CAIE is exactly that — strategic, governance-focused, and immediately applicable. I completed it in 4 weeks while running a team of 120." },
  { name: "James Okonkwo",   title: "Data Analytics Lead",     company: "Deloitte",            cert: "CAIDA", avatar: "JO", rating: "5", quote: "CAIDA bridges the gap between traditional data analytics and modern AI methods. The curriculum is hands-on, practical, and built by people who actually work with these tools. My team has enrolled 8 people already." },
  { name: "Ana Rodrigues",   title: "HR Director",             company: "Nestlé",              cert: "CAIP",  avatar: "AR", rating: "5", quote: "I came in knowing nothing about AI. CAIP walked me through everything from fundamentals to practical applications for HR. The exam was challenging but fair. Now I'm implementing AI tools across our 40-person HR team." },
  { name: "David Kim",       title: "VP Technology",           company: "Royal Bank of Canada", cert: "CAIM",  avatar: "DK", rating: "5", quote: "The PAI community alone is worth the certification fee. I've connected with AI leaders from 20+ countries. The weekly virtual events and the alumni network are exceptional." },
];

type TestimonialItem = { name: string; title: string; company: string; cert: string; avatar: string; rating: string; quote: string };

export default function TestimonialsSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const badge    = cmsContent.badge    || "What Professionals Say";
  const title    = cmsContent.title    || "Trusted by Industry Leaders";
  const subtitle = cmsContent.subtitle || "Join 3,200+ professionals who've advanced their careers with PAI credentials.";
  const items: TestimonialItem[] = (cmsContent.items as TestimonialItem[]) ?? DEFAULT_ITEMS;

  return (
    <section className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center mb-14">
          <span className="badge-teal mb-4">{badge}</span>
          <h2 className="section-title mb-4">{title}</h2>
          <p className="section-subtitle max-w-xl mx-auto">{subtitle}</p>
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

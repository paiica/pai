"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Sarah Okonkwo",
    role: "Marketing Director",
    company: "Meridian Health Group",
    certification: "CAIP",
    rating: 5,
    content:
      "I'll be honest — I was skeptical going in. But the section on evaluating AI tools alone saved my team from buying three products that weren't fit for purpose. It paid for itself within the first month.",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "James Calloway",
    role: "Operations Manager",
    company: "Trident Logistics",
    certification: "CAIP",
    rating: 5,
    content:
      "The business case framework in module 3 is what I use every time now. My team went from 'we should try AI' to having an actual roadmap. That shift happened in about six weeks.",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "Priya Nair",
    role: "HR Business Partner",
    company: "National Financial Services",
    certification: "CAIP",
    rating: 5,
    content:
      "We added CAIP to our requirements for senior managers last year. The ones who've completed it ask better questions, push back in the right places, and stop vendors from overselling.",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "David Marchetti",
    role: "Management Consultant",
    company: "Independent Practice",
    certification: "CAIP",
    rating: 5,
    content:
      "I've done a lot of professional development. This is the first one where clients actually ask about it by name. Two new engagements this quarter mentioned CAIP specifically when they reached out.",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "Lauren Kim",
    role: "Associate Professor",
    company: "Vancouver Community College",
    certification: "CAIP",
    rating: 4,
    content:
      "I needed something I could point to when talking to my department about integrating AI into coursework. CAIP gave me that credibility — and the ethics module was genuinely useful, not just a checkbox.",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "Marcus Reid",
    role: "Owner",
    company: "Reid Strategy Consulting",
    certification: "CAIP",
    rating: 5,
    content:
      "I was starting to lose pitches to bigger firms that were talking about AI. CAIP gave me the frameworks and confidence to compete. Three months later I'm the one leading those conversations.",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="section-padding bg-slate-50">
      <div className="container-lg">
        <div className="max-w-3xl mx-auto mb-14">
          <p className="section-label">From Our Community</p>
          <h2 className="section-title mb-4">
            What certified professionals<br />
            <span className="gold-text">actually say</span>
          </h2>
          <p className="text-slate-500 text-base leading-relaxed">
            Across industries, roles, and company sizes — here's how CAIP has
            moved the needle for working professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card flex flex-col"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    size={13}
                    className={j < t.rating ? "text-gold-500 fill-gold-500" : "text-slate-200 fill-slate-200"}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5">
                "{t.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-100">
                  <Image
                    src={t.photo}
                    alt={t.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-navy-900 font-semibold text-sm leading-tight">{t.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5 truncate">
                    {t.role}, {t.company}
                  </div>
                </div>
                <span className="ml-auto text-xs font-bold text-gold-600 bg-gold-50 border border-gold-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  {t.certification}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Social proof bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Stacked avatars */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {TESTIMONIALS.slice(0, 5).map((t) => (
                <div
                  key={t.name}
                  className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm"
                >
                  <Image
                    src={t.photo}
                    alt={t.name}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-bold text-navy-900">1,847</span> professionals certified so far
            </div>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={14} className="text-gold-500 fill-gold-500" />
              ))}
            </div>
            <span className="text-sm text-slate-600">
              <span className="font-bold text-navy-900">4.8 / 5</span> from 900+ verified reviews
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

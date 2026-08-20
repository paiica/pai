"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";

type FaqGroup = { category: string; items: { id: string; question: string; answer: string }[] };

// Renders [label](/path) as a real link and leaves everything else as plain
// text — the admin-authored answer field is plain String (not HTML), so this
// avoids a dangerouslySetInnerHTML XSS surface while still letting an answer
// point at /renew-certification, /verify, etc.
function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!match) return <span key={i}>{part}</span>;
        return (
          <Link key={i} href={match[2]} className="text-teal-700 font-semibold hover:underline">
            {match[1]}
          </Link>
        );
      })}
    </>
  );
}

// Reuses the exact interaction/markup of programs/[slug]/FaqAccordion.tsx
// (single-open-at-a-time, chevron rotate, rounded card) with a category
// heading wrapped around each group — kept as a separate component rather
// than importing across that route's boundary.
export default function CategorizedFaqAccordion({ groups }: { groups: FaqGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!groups.length) return null;

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <div key={group.category}>
          <h2 className="text-lg font-display font-black text-ink-900 mb-5 pb-3 border-b border-sand-200">
            {group.category}
          </h2>
          <div className="space-y-3 max-w-3xl">
            {group.items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id} className="border border-sand-200 rounded-2xl overflow-hidden bg-white">
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${item.id}`}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-sand-50 transition-colors"
                  >
                    <span className="font-display font-bold text-ink-900 text-sm leading-snug">{item.question}</span>
                    <ChevronDown size={16} aria-hidden="true" className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div id={`faq-answer-${item.id}`} className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-sand-100 pt-4">
                      <AnswerText text={item.answer} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = { question: string; answer: string };

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (!faqs.length) return null;

  return (
    <div className="max-w-2xl">
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-sand-200 rounded-2xl overflow-hidden bg-white">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-sand-50 transition-colors"
            >
              <span className="font-display font-bold text-ink-900 text-sm leading-snug">{faq.question}</span>
              <ChevronDown
                size={16}
                className={`text-slate-400 flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-sand-100 pt-4">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

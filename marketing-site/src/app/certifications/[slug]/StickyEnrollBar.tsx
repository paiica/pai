"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";

export default function StickyEnrollBar({
  title, acronym, price, applyUrl,
}: {
  title: string; acronym: string; price: number; applyUrl: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 520);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`fixed top-[108px] left-0 right-0 z-40 bg-ink-900/95 backdrop-blur border-b border-white/10 transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="container-lg py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="font-display font-black text-white text-sm truncate block">{acronym} — {title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-white font-display font-black text-lg">${price.toLocaleString()}</span>
          <a href={applyUrl} className="btn-primary !py-2 !px-5 !text-sm">
            <Award size={14} /> Apply Now
          </a>
        </div>
      </div>
    </div>
  );
}

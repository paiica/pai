"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";

export default function StickyEnrollBar({
  title, price, programId,
}: {
  title: string; price: number; programId: string;
}) {
  const t = useTranslations("ProgramDetail");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 520);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed left-0 right-0 z-40 bg-ink-900/95 backdrop-blur border-b border-white/10 transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}
      style={{ top: "var(--header-height, 148px)" }}
    >
      <div className="container-lg py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="font-display font-black text-white text-sm truncate block">{title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-white font-display font-black text-lg">{price === 0 ? t("free") : `$${price.toLocaleString()}`}</span>
          <a href="#enroll" className="btn-primary !py-2 !px-5 !text-sm">
            <GraduationCap size={14} /> {t("enrollNow")}
          </a>
        </div>
      </div>
    </div>
  );
}

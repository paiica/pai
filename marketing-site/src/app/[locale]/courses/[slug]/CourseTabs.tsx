"use client";

import { useEffect, useRef, useState } from "react";

type Tab = { id: string; label: string };

export default function CourseTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: update active tab as sections enter viewport
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    tabs.forEach((t) => {
      const el = document.getElementById(t.id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(t.id);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [tabs]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = navRef.current?.offsetHeight ?? 64;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  if (tabs.length <= 1) return null;

  return (
    <div
      ref={navRef}
      className="border-b border-sand-200 bg-white sticky z-20"
      style={{ top: "calc(var(--header-height, 148px) + 56px)" }}
    >
      <div className="container-lg">
        <nav className="flex overflow-x-auto -mb-px">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => scrollTo(t.id)}
              className={`flex-shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                active === t.id
                  ? "border-ink-900 text-ink-900"
                  : "border-transparent text-slate-500 hover:text-ink-800 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

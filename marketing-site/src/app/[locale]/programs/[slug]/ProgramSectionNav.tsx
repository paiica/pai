"use client";

import { useEffect, useRef, useState } from "react";

type Section = { id: string; label: string };

export default function ProgramSectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(`program-section-${id}`);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [sections]);

  function scrollTo(id: string) {
    const el = document.getElementById(`program-section-${id}`);
    if (!el) return;
    const navHeight = navRef.current?.offsetHeight ?? 64;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div
      ref={navRef}
      className="border-b border-sand-200 bg-white sticky z-20"
      style={{ top: "var(--header-height, 148px)" }}
    >
      <div className="container-lg">
        <nav className="flex overflow-x-auto -mb-px">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex-shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                active === s.id
                  ? "border-ink-900 text-ink-900"
                  : "border-transparent text-slate-500 hover:text-ink-800 hover:border-slate-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

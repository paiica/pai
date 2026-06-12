"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const STATS = [
  {
    value: 1847,
    suffix: "",
    label: "Certified Professionals",
    description: "Across 40+ countries",
  },
  {
    value: 91,
    suffix: "%",
    label: "First-Attempt Pass Rate",
    description: "Among prepared candidates",
  },
  {
    value: 38,
    suffix: "%",
    label: "Report a Salary Increase",
    description: "Within 12 months of certifying",
  },
  {
    value: 6,
    suffix: " weeks",
    label: "Average Completion Time",
    description: "Studying 4–5 hours per week",
  },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1800;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-4xl lg:text-5xl font-display font-black text-navy-900 tabular-nums">
      {display.toLocaleString()}{suffix}
    </span>
  );
}

export default function StatsSection() {
  return (
    <section className="py-14 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="text-center px-6 py-4 first:pl-0 last:pr-0">
              <div className="flex justify-center mb-1">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-navy-800 font-semibold text-sm mt-2 leading-tight">{stat.label}</div>
              <div className="text-slate-400 text-xs mt-1">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

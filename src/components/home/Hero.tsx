"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Award, CheckCircle2, Star } from "lucide-react";

const CERTIFIED_AVATARS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=48&h=48&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=48&h=48&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop&crop=face",
];

const SLIDES = [
  {
    src: "/images/hero-1.png",
    alt: "AI-certified professional in modern office",
    label: "Professional AI Certification Body",
    headingLine1: "The AI credential",
    headingLine2: "employers ask for",
    subheading:
      "The CAIP is a professional certification for managers, educators, and business leaders who need to understand AI — and prove it. No coding background required.",
    points: [
      "Exam-based, not course-completion",
      "Verifiable by any employer",
      "Valid for 3 years",
    ],
    cta: { label: "Get Certified", href: "/certifications/certified-ai-professional" },
    ctaSecondary: { label: "View all credentials", href: "/certifications" },
  },
  {
    src: "/images/hero-2.png",
    alt: "Business professionals discussing AI strategy",
    label: "For Newcomers to Canada",
    headingLine1: "New to Canada?",
    headingLine2: "Kick-start your AI career.",
    subheading:
      "The CAIP certification is recognized by Canadian employers across industries — giving internationally trained professionals the credential to stand out and get hired faster.",
    points: [
      "Recognized by top Canadian employers",
      "No local work experience required",
      "Join professionals from 40+ countries",
    ],
    cta: { label: "Start Your Journey", href: "/certifications/certified-ai-professional" },
    ctaSecondary: { label: "Learn more", href: "/certifications" },
  },
];

const textVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function goTo(index: number) {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const swipe = info.offset.x + info.velocity.x * 0.3;
    if (swipe < -60 && current < SLIDES.length - 1) goTo(current + 1);
    else if (swipe > 60 && current > 0) goTo(current - 1);
  }

  return (
    <section className="relative min-h-[80svh] flex items-center overflow-hidden select-none">

      {/* Draggable photo track */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <motion.div
          className="absolute inset-0 flex"
          style={{ width: `${SLIDES.length * 100}%` }}
          animate={{ x: containerWidth ? -current * containerWidth : 0 }}
          drag="x"
          dragConstraints={{
            left: containerWidth ? -(SLIDES.length - 1) * containerWidth : 0,
            right: 0,
          }}
          dragElastic={0.08}
          onDragEnd={handleDragEnd}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 h-full"
              style={{ width: `${100 / SLIDES.length}%` }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover object-center pointer-events-none"
                sizes="100vw"
                priority={i === 0}
                draggable={false}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-l from-navy-950/85 via-navy-950/60 to-navy-950/30 z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-950/60 to-transparent z-10 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:pl-8 lg:pr-2 xl:pr-0 pt-16 pb-10 w-full">
        <div className="flex justify-end">
          <div className="max-w-2xl w-full">

            {/* Sliding text content */}
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={`text-${current}`}
                custom={direction}
                variants={textVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="inline-flex items-center gap-2 bg-gold-500/15 border border-gold-500/25 text-gold-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-8">
                  <Award size={11} />
                  {SLIDES[current].label}
                </div>

                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-5">
                  {SLIDES[current].headingLine1}
                  <br />
                  <span className="shimmer-text">{SLIDES[current].headingLine2}</span>
                </h1>

                <p className="text-base md:text-lg text-white/70 leading-relaxed mb-7">
                  {SLIDES[current].subheading}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-10">
                  {SLIDES[current].points.map((point) => (
                    <div key={point} className="flex items-center gap-2 text-white/75 text-sm font-medium">
                      <CheckCircle2 size={15} className="text-gold-400 flex-shrink-0" />
                      {point}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={SLIDES[current].cta.href}
                    className="group inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-base px-8 py-4 rounded-2xl transition-all duration-200 shadow-gold hover:shadow-lg hover:-translate-y-0.5"
                  >
                    {SLIDES[current].cta.label}
                    <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href={SLIDES[current].ctaSecondary.href}
                    className="group inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/25 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all duration-200 backdrop-blur-sm"
                  >
                    {SLIDES[current].ctaSecondary.label}
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="flex gap-2 mt-8">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

          </div>
        </div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {CERTIFIED_AVATARS.map((src, i) => (
                <div key={i} className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-navy-800 shadow-md">
                  <Image src={src} alt="Certified professional" fill className="object-cover" sizes="36px" />
                </div>
              ))}
            </div>
            <div className="text-white/70 text-sm">
              <span className="text-white font-semibold">1,847 professionals</span> certified
            </div>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/15" />

          <div className="flex items-center gap-2 text-white/70 text-sm">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-gold-400 fill-gold-400" />)}
            </div>
            <span><span className="text-white font-semibold">4.8 / 5</span> from 900+ reviews</span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/15" />

          <div className="text-white/60 text-sm">
            Candidates from <span className="text-white/80 font-medium">40+ countries</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 80L60 73.3C120 66.7 240 53.3 360 46.7C480 40 600 40 720 46.7C840 53.3 960 66.7 1080 66.7C1200 66.7 1320 53.3 1380 46.7L1440 40V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}

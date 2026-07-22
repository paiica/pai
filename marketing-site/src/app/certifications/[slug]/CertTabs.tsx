"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, BookOpen, ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { PageTabsData } from "./cert-types";

type Stat     = { value: string; label: string };
type Step     = { title: string; description: string };
type Resource = { title: string; description: string };

type CurriculumItem = { title: string; description: string; lessons: number };
type FaqItem        = { question: string; answer: string };

type Props = {
  acronym: string;
  applyUrl: string;
  learningOutcomes: string[];
  targetAudience: string[];
  curriculum: CurriculumItem[];
  faqs: FaqItem[];
  totalLessons: number;
  totalHours: number;
  pageTabs?: PageTabsData;
  minYearsExperience?: number | null;
  minTrainingHours?: number | null;
  industryFocus?: string[];
  requiredEducation?: string[];
  requiredDocuments?: string[];
};

function buildEligibilityItems(opts: {
  minYearsExperience?: number | null; minTrainingHours?: number | null;
  industryFocus?: string[]; requiredEducation?: string[]; requiredDocuments?: string[];
}): string[] {
  const items: string[] = [];
  if (opts.minYearsExperience != null) {
    items.push(`${opts.minYearsExperience}+ year${opts.minYearsExperience === 1 ? "" : "s"} of professional experience`);
  }
  if (opts.minTrainingHours != null) {
    items.push(`${opts.minTrainingHours}+ hours of relevant training`);
  }
  if (opts.industryFocus?.length) {
    items.push(`Industry focus: ${opts.industryFocus.join(", ")}`);
  }
  if (opts.requiredEducation?.length) {
    items.push(`Relevant education: ${opts.requiredEducation.join(", ")}`);
  }
  if (opts.requiredDocuments?.length) {
    items.push(`Required documents: ${opts.requiredDocuments.join(", ")}`);
  }
  return items;
}

const SECTION_IDS = ["right_for_you", "path", "prepare", "faqs", "maintenance"] as const;

export default function CertTabs({
  acronym, applyUrl,
  learningOutcomes, targetAudience, curriculum, faqs,
  totalLessons, totalHours,
  pageTabs,
  minYearsExperience, minTrainingHours, industryFocus, requiredEducation, requiredDocuments,
}: Props) {
  const [active, setActive] = useState<string>("right_for_you");
  const navRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: update active tab as sections enter viewport
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(`cert-section-${id}`);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(`cert-section-${id}`);
    if (!el) return;
    const navHeight = navRef.current?.offsetHeight ?? 64;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  const tabs = [
    { id: "right_for_you", label: `Is ${acronym} Right for You?` },
    { id: "path",          label: "Path to Certification" },
    { id: "prepare",       label: "How to Prepare" },
    { id: "faqs",          label: "FAQs" },
    { id: "maintenance",   label: "Maintenance" },
  ];

  const rfy  = pageTabs?.right_for_you ?? {};
  const path = pageTabs?.path          ?? {};
  const prep = pageTabs?.prepare       ?? {};
  const mnt  = pageTabs?.maintenance   ?? {};

  return (
    <>
      {/* ── Sticky tab nav ── */}
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

      {/* ── All sections, always visible ── */}
      <div>
        {/* Section 1 — Is [CERT] Right for You? */}
        <section
          id="cert-section-right_for_you"
          className="section-padding bg-white border-b border-sand-100"
        >
          <div className="container-lg">
            <RightForYouTab
              acronym={acronym}
              applyUrl={applyUrl}
              headline={rfy.headline ?? `Is the ${acronym} Right for You?`}
              body={rfy.body ?? ""}
              stats={rfy.stats ?? []}
              requirements={targetAudience}
              eligibilityItems={buildEligibilityItems({ minYearsExperience, minTrainingHours, industryFocus, requiredEducation, requiredDocuments })}
              notReadyText={rfy.not_ready_text ?? ""}
              notReadyHref={rfy.not_ready_href ?? "/certifications"}
            />
          </div>
        </section>

        {/* Section 2 — Path to Certification */}
        <section
          id="cert-section-path"
          className="section-padding bg-sand-50 border-b border-sand-100"
        >
          <div className="container-lg">
            <PathTab
              headline={path.headline ?? "Path to Certification"}
              body={path.body ?? ""}
              steps={path.steps ?? []}
              learningOutcomes={learningOutcomes}
              notReadyText={rfy.not_ready_text ?? ""}
              notReadyHref={rfy.not_ready_href ?? "/certifications"}
            />
          </div>
        </section>

        {/* Section 3 — How to Prepare */}
        <section
          id="cert-section-prepare"
          className="section-padding bg-white border-b border-sand-100"
        >
          <div className="container-lg">
            <PrepareTab
              headline={prep.headline ?? "How to Prepare"}
              body={prep.body ?? ""}
              resources={prep.resources ?? []}
              curriculum={curriculum}
              totalLessons={totalLessons}
              totalHours={totalHours}
            />
          </div>
        </section>

        {/* Section 4 — FAQs */}
        <section
          id="cert-section-faqs"
          className="section-padding bg-sand-50 border-b border-sand-100"
        >
          <div className="container-lg">
            <FaqsTab faqs={faqs} />
          </div>
        </section>

        {/* Section 5 — Maintenance */}
        <section
          id="cert-section-maintenance"
          className="section-padding bg-white"
        >
          <div className="container-lg">
            <MaintenanceTab
              acronym={acronym}
              headline={mnt.headline ?? `Maintaining Your ${acronym}`}
              body={mnt.body ?? ""}
              renewalItems={mnt.renewal_items ?? []}
            />
          </div>
        </section>
      </div>
    </>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-3xl font-display font-black text-ink-900 mb-4 leading-tight">{children}</h2>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-900 leading-relaxed mb-6">{children}</p>;
}

function StatBlock({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 gap-8 mb-8">
      {stats.map((s, i) => (
        <div key={i}>
          <div className="text-4xl font-display font-black text-teal-600 mb-1">{s.value}</div>
          <div className="text-sm text-ink-900 leading-snug">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
          <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function RightForYouTab({
  acronym, applyUrl, headline, body, stats, requirements, eligibilityItems, notReadyText, notReadyHref,
}: {
  acronym: string; applyUrl: string; headline: string; body: string;
  stats: Stat[]; requirements: string[]; eligibilityItems: string[]; notReadyText: string; notReadyHref: string;
}) {
  return (
    <TwoCol
      left={
        <>
          <Heading>{headline}</Heading>
          {body && <Body>{body}</Body>}
          <StatBlock stats={stats} />
          {requirements.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-display font-bold text-ink-900 mb-4">Who Should Pursue This Certification</h3>
              <BulletList items={requirements} />
            </div>
          )}
          {eligibilityItems.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-display font-bold text-ink-900 mb-4">Eligibility Requirements</h3>
              <BulletList items={eligibilityItems} />
            </div>
          )}
          <a href={applyUrl} className="btn-primary !py-3 !px-8 !text-sm inline-flex mt-2">
            Apply Now <ArrowRight size={16} />
          </a>
        </>
      }
      right={
        <div className="bg-sand-50 rounded-2xl border border-sand-200 p-8">
          {notReadyText ? (
            <>
              <h3 className="text-lg font-display font-bold text-ink-900 mb-3">Not Ready Yet?</h3>
              <p className="text-sm text-ink-900 leading-relaxed mb-6">{notReadyText}</p>
              <Link href={notReadyHref} className="btn-outline !py-2.5 !px-6 !text-sm inline-flex">
                Explore Options <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-lg font-display font-bold text-ink-900 mb-3">About the {acronym}</h3>
              <p className="text-sm text-ink-900 leading-relaxed">
                This globally recognized certification demonstrates your expertise in applied AI — valued by employers worldwide.
              </p>
              <div className="mt-6">
                <a href={applyUrl} className="btn-outline !py-2.5 !px-6 !text-sm inline-flex">
                  Start Your Application <ArrowRight size={14} />
                </a>
              </div>
            </>
          )}
        </div>
      }
    />
  );
}

function PathTab({
  headline, body, steps, learningOutcomes, notReadyText, notReadyHref,
}: {
  headline: string; body: string; steps: Step[]; learningOutcomes: string[];
  notReadyText: string; notReadyHref: string;
}) {
  const [activeStep, setActiveStep] = useState(0);

  // Fall back to learning outcomes as steps if no steps configured
  const displaySteps: Step[] = steps.length > 0
    ? steps
    : learningOutcomes.map((o) => ({ title: o, description: "" }));

  if (displaySteps.length === 0) {
    return (
      <div className="max-w-2xl">
        <Heading>{headline}</Heading>
        <p className="text-slate-400 text-sm">Path details coming soon.</p>
      </div>
    );
  }

  const current = displaySteps[activeStep];

  return (
    <div>
      <Heading>{headline}</Heading>
      {body && <Body>{body}</Body>}

      {/* ── Horizontal step bar ── */}
      <div className="flex border-b border-sand-200 mb-0 overflow-x-auto">
        {displaySteps.map((step, i) => {
          const isActive = i === activeStep;
          return (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`flex-shrink-0 flex flex-col items-start gap-2 px-6 py-5 border-l border-sand-200 first:border-l-0 text-left transition-colors min-w-[160px] max-w-[220px] relative ${
                isActive ? "bg-white" : "bg-sand-50 hover:bg-sand-100"
              }`}
            >
              {/* Active left border accent */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-ink-900 rounded-r" />
              )}
              {/* Step number */}
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                isActive
                  ? "bg-ink-900 border-ink-900 text-white"
                  : "border-slate-300 text-slate-400"
              }`}>
                {i + 1}
              </div>
              {/* Step title */}
              <span className={`text-sm leading-snug font-semibold ${
                isActive ? "text-ink-900" : "text-slate-400"
              }`}>
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Step content panel ── */}
      <div className="bg-sand-50 border border-t-0 border-sand-200 rounded-b-2xl p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left — step description */}
          <div>
            {current.description ? (
              <>
                <h3 className="text-lg font-display font-bold text-ink-900 mb-4">{current.title}</h3>
                <p className="text-sm text-ink-900 leading-relaxed">{current.description}</p>
              </>
            ) : (
              <p className="text-slate-400 text-sm italic">Content for this step coming soon.</p>
            )}
          </div>

          {/* Right — "not ready" card or placeholder */}
          {notReadyText && (
            <div className="border-l border-sand-200 pl-10">
              <h3 className="text-base font-display font-bold text-ink-900 mb-3">Not ready for certifications?</h3>
              <p className="text-sm text-ink-900 leading-relaxed mb-5">{notReadyText}</p>
              <Link
                href={notReadyHref || "/certifications"}
                className="inline-flex items-center gap-2 border-2 border-ink-900 text-ink-900 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-ink-900 hover:text-white transition-colors"
              >
                Explore Options <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* ── Footer: View FAQs + prev/next arrows ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-sand-200">
          <button
            onClick={() => {
              const el = document.getElementById("cert-section-faqs");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 hover:underline"
          >
            View FAQs <ChevronDown size={14} className="-rotate-90" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              disabled={activeStep === 0}
              className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:border-ink-900 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={16} className="rotate-180" />
            </button>
            <button
              onClick={() => setActiveStep((s) => Math.min(displaySteps.length - 1, s + 1))}
              disabled={activeStep === displaySteps.length - 1}
              className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:border-ink-900 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrepareTab({
  headline, body, resources, curriculum, totalLessons, totalHours,
}: {
  headline: string; body: string; resources: Resource[];
  curriculum: CurriculumItem[]; totalLessons: number; totalHours: number;
}) {
  return (
    <TwoCol
      left={
        <>
          <Heading>{headline}</Heading>
          {body && <Body>{body}</Body>}
          {resources.length > 0 ? (
            <div className="space-y-4">
              {resources.map((r, i) => (
                <div key={i} className="bg-sand-50 rounded-xl border border-sand-200 p-5">
                  <h3 className="font-display font-bold text-ink-900 text-sm mb-1.5">{r.title}</h3>
                  {r.description && <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Study resources coming soon.</p>
          )}
        </>
      }
      right={
        curriculum.length > 0 ? (
          <>
            <h3 className="text-base font-display font-bold text-ink-900 mb-1.5">Curriculum</h3>
            <p className="text-xs text-slate-500 mb-5">
              {curriculum.length} module{curriculum.length !== 1 ? "s" : ""}
              {totalLessons > 0 && ` · ${totalLessons} lessons`}
              {totalHours > 0 && ` · ${totalHours}+ hours`}
            </p>
            <div className="space-y-2">
              {curriculum.map((mod, i) => (
                <div key={i} className="border border-sand-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-white">
                    <div className="w-6 h-6 rounded-lg bg-ink-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-ink-900 text-sm">{mod.title}</div>
                      {mod.description && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{mod.description}</div>
                      )}
                    </div>
                    {mod.lessons > 0 && (
                      <div className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0 ml-2">
                        <BookOpen size={10} /> {mod.lessons}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-sand-200 p-8 text-center">
            <BookOpen size={32} className="text-sand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Curriculum details coming soon.</p>
          </div>
        )
      }
    />
  );
}

function FaqsTab({ faqs }: { faqs: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (!faqs.length) return (
    <div className="text-center py-16">
      <p className="text-slate-400 text-sm">No FAQs available yet.</p>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <Heading>Frequently Asked Questions</Heading>
      <div className="space-y-3 mt-6">
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

function MaintenanceTab({
  acronym, headline, body, renewalItems,
}: {
  acronym: string; headline: string; body: string; renewalItems: string[];
}) {
  return (
    <div className="max-w-2xl">
      <Heading>{headline || `Maintaining Your ${acronym}`}</Heading>
      {body && <Body>{body}</Body>}
      {renewalItems.length > 0 ? (
        <BulletList items={renewalItems} />
      ) : (
        <p className="text-slate-400 text-sm">Maintenance details coming soon.</p>
      )}
    </div>
  );
}

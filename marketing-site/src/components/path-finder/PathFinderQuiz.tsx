"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, ArrowLeft, Loader2, Award, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type Acronym = "CAIP" | "CAIM" | "CAIE" | "AIDA" | "CAAE";

// Weights are grounded in each certification's real target_audience/skills
// data (verified directly against the database, not guessed) — e.g. CAIE's
// real audience is teachers/instructional designers, CAIM's is leaders and
// operational managers, AIDA's is data analysts/engineers, CAAE's is
// software/ML engineers building AI agents. CAIP is the broadest,
// business-generalist credential, so it's the sensible fallback when no
// other certification scores a clear lead.
type Weights = Partial<Record<Acronym, number>>;

// Option `key` is a stable id used to look up its translated label (via
// PathFinderPage.questions.{id}.options.{key}) and to score weights — it
// must never be the display label itself, since that's now locale-dependent.
type Question = { id: string; options: { key: string; weights: Weights }[] };

const QUESTIONS: Question[] = [
  {
    id: "persona",
    options: [
      { key: "student", weights: { CAIP: 2 } },
      { key: "educator", weights: { CAIE: 3 } },
      { key: "business", weights: { CAIP: 2, CAIM: 1 } },
      { key: "data", weights: { AIDA: 3 } },
      { key: "tech", weights: { CAAE: 2, CAIP: 1 } },
      { key: "practitioner", weights: { CAAE: 2, AIDA: 1 } },
      { key: "manager", weights: { CAIM: 3 } },
      { key: "careerChanger", weights: { CAIP: 2 } },
    ],
  },
  {
    id: "experience",
    options: [
      { key: "beginner", weights: { CAIP: 2 } },
      { key: "some", weights: { CAIP: 1, AIDA: 1 } },
      { key: "intermediate", weights: { AIDA: 1, CAIM: 1 } },
      { key: "advanced", weights: { CAAE: 2, CAIM: 1 } },
    ],
  },
  {
    id: "goal",
    options: [
      { key: "fundamentals", weights: { CAIP: 3 } },
      { key: "apply", weights: { CAIP: 2, AIDA: 1 } },
      { key: "teach", weights: { CAIE: 3 } },
      { key: "tools", weights: { CAIP: 2 } },
      { key: "lead", weights: { CAIM: 3 } },
      { key: "build", weights: { CAAE: 3 } },
      { key: "advance", weights: { CAIP: 1, CAIM: 1, AIDA: 1 } },
    ],
  },
  {
    id: "interest",
    options: [
      { key: "fundamentals", weights: { CAIP: 3 } },
      { key: "genai", weights: { CAIP: 1, CAAE: 1 } },
      { key: "education", weights: { CAIE: 3 } },
      { key: "implementation", weights: { CAAE: 2, AIDA: 1 } },
      { key: "data", weights: { AIDA: 3 } },
      { key: "leadership", weights: { CAIM: 3 } },
      { key: "responsible", weights: { CAIP: 1, CAIM: 1 } },
      { key: "technology", weights: { CAAE: 2 } },
    ],
  },
];

type CatalogCert = { id: string; slug: string; acronym: string; title: string; level: string; status: string; description: string };

export default function PathFinderQuiz() {
  const t = useTranslations("PathFinderPage");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatalogCert | null>(null);
  const [error, setError] = useState(false);

  function selectOption(optionIdx: number) {
    const next = [...answers];
    next[step] = optionIdx;
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      finish(next);
    }
  }

  async function finish(finalAnswers: (number | null)[]) {
    setLoading(true);
    setError(false);
    const scores: Record<string, number> = {};
    finalAnswers.forEach((optIdx, qIdx) => {
      if (optIdx === null) return;
      const weights = QUESTIONS[qIdx].options[optIdx].weights;
      for (const [acronym, w] of Object.entries(weights)) {
        scores[acronym] = (scores[acronym] ?? 0) + (w ?? 0);
      }
    });
    // CAIP is the deliberate tiebreak/fallback — it's PAII's broadest,
    // flagship credential, the reasonable default when answers don't point
    // clearly at a specialist certification.
    const ranked = (Object.entries(scores) as [Acronym, number][]).sort((a, b) => b[1] - a[1]);
    const topAcronym = ranked[0]?.[0] ?? "CAIP";

    try {
      const res = await fetch(`${API}/courses/catalog?lang=${locale}`);
      const json = await res.json();
      const certs: CatalogCert[] = json.data ?? json ?? [];
      const match = certs.find((c) => c.acronym === topAcronym) ?? certs.find((c) => c.acronym === "CAIP") ?? null;
      setResult(match);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setStep(QUESTIONS.length);
    }
  }

  function restart() {
    setStep(0);
    setAnswers([null, null, null, null]);
    setResult(null);
    setError(false);
  }

  if (step < QUESTIONS.length) {
    const q = QUESTIONS[step];
    return (
      <div className="container-md py-10">
        <div className="max-w-xl mx-auto">
          <div role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-label={t("questionCounter", { current: step + 1, total: QUESTIONS.length })} className="flex items-center gap-2 mb-6">
            {QUESTIONS.map((_, i) => (
              <div key={i} aria-hidden="true" className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-teal-500" : "bg-sand-200"}`} />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t("questionCounter", { current: step + 1, total: QUESTIONS.length })}</p>
          <h2 className="text-2xl font-display font-black text-ink-900 mb-6">{t(`questions.${q.id}.prompt`)}</h2>
          <div className="space-y-2.5">
            {q.options.map((opt, i) => (
              <button
                key={opt.key}
                onClick={() => selectOption(i)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border transition-colors font-medium text-sm ${
                  answers[step] === i ? "border-teal-400 bg-teal-50 text-teal-800" : "border-sand-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 text-ink-900"
                }`}
              >
                {t(`questions.${q.id}.options.${opt.key}`)}
              </button>
            ))}
          </div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-900">
              <ArrowLeft size={14} /> {t("back")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-md py-16 text-center">
        <Loader2 size={28} className="animate-spin text-teal-500 mx-auto" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="container-md py-16 text-center max-w-md mx-auto">
        <p className="text-sm text-slate-500 mb-4">{t("errorText")}</p>
        <Link href="/certifications" className="btn-primary !py-3 !px-6 inline-flex">{t("browseCertifications")}</Link>
      </div>
    );
  }

  return (
    <div className="container-md py-10">
      <div className="max-w-xl mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-5">
          <Award size={24} />
        </div>
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-2">{t("recommendedForYou")}</p>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-ink-900 mb-3">{result.title}</h2>
        {result.status === "coming_soon" && (
          <span className="inline-block text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full mb-3">{t("comingSoon")}</span>
        )}
        {result.description && <p className="text-sm text-slate-500 leading-relaxed mb-8">{result.description}</p>}

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <Link href={`/certifications/${result.slug}`} className="btn-primary !py-3 !text-sm justify-center">
            {t("viewCertification")} <ArrowRight size={14} />
          </Link>
          <Link href="/study-guides" className="btn-outline !py-3 !text-sm justify-center">
            {t("studyGuide")}
          </Link>
          <Link href="/careers-in-ai" className="btn-outline !py-3 !text-sm justify-center">
            {t("careersInAi")}
          </Link>
        </div>

        <button onClick={restart} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-ink-900">
          <RotateCcw size={13} /> {t("startOver")}
        </button>
      </div>
    </div>
  );
}

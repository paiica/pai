"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useLocale, useTranslations } from "next-intl";
import {
  Loader2, CheckCircle2, ChevronRight, Award,
  User, Briefcase, GraduationCap, FileText, AlertCircle, Eye, EyeOff, ShoppingCart, AlertTriangle,
  Plus, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { api, ApiError } from "@/lib/api";
import { CertIcon } from "@/lib/cert-icons";
import { getRefCookie } from "@/lib/referral";

type Cert = {
  id: string; slug: string; acronym: string; title: string;
  badge_icon: string; price: number; description: string;
  duration_weeks: number; passing_score: number; status: string;
  min_years_experience?: number | null;
  min_training_hours?: number | null;
  required_documents?: string[];
};

type EducationEntry = {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: string;
  end_year: string;
  is_current: boolean;
};

type ExperienceEntry = {
  id: string;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

const STEPS: { id: number }[] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

const STEP_ICONS: Record<number, React.ElementType> = {
  1: User,
  2: Briefcase,
  3: GraduationCap,
  4: FileText,
};

const STEP_LABEL_KEYS: Record<number, string> = {
  1: "stepPersonal",
  2: "stepProfessional",
  3: "stepEducation",
  4: "stepReview",
};

const COUNTRIES = [
  "Canada", "United States", "United Kingdom", "Australia", "India",
  "Germany", "France", "UAE", "Saudi Arabia", "Singapore", "Other",
];

// Values kept in English — submitted to the backend as-is; translated at display time via HOW_HEARD_KEYS.
const HOW_HEARD_OPTIONS = [
  "Google / Search Engine", "LinkedIn", "Colleague or Friend",
  "Social Media", "Conference or Event", "Email Newsletter",
  "Marketing Site", "Other",
];

const HOW_HEARD_KEYS = [
  "howHeardGoogle", "howHeardLinkedin", "howHeardColleague",
  "howHeardSocial", "howHeardConference", "howHeardEmail",
  "howHeardMarketingSite", "howHeardOther",
];

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-[11px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function getEligibilityFailures(
  cert: Cert,
  yearsExp: string,
  trainingHours: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string[] {
  const failures: string[] = [];
  if (cert.min_years_experience != null) {
    const exp = yearsExp ? parseInt(yearsExp) : 0;
    if (exp < cert.min_years_experience) {
      failures.push(
        t("yearsExperienceFailure", {
          count: cert.min_years_experience,
          years: cert.min_years_experience !== 1 ? t("yearOther") : t("yearOne"),
          entered: exp || 0,
        })
      );
    }
  }
  if (cert.min_training_hours != null) {
    const hrs = trainingHours ? parseInt(trainingHours) : 0;
    if (hrs < cert.min_training_hours) {
      failures.push(t("trainingHoursFailure", { count: cert.min_training_hours, entered: hrs || 0 }));
    }
  }
  return failures;
}

export default function ApplyPage() {
  const t = useTranslations("Apply");
  const locale = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();
  const { user, accessToken, _hasHydrated, fetchMe } = useAuthStore();
  const { addItem, hasItem } = useCartStore();

  const [step,       setStep]       = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [showPw,     setShowPw]     = useState(false);

  // Account creation fields (only used when not logged in)
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");

  // Application flat fields
  const [phone,         setPhone]         = useState("");
  const [dob,           setDob]           = useState("");
  const [gender,        setGender]        = useState("");
  const [country,       setCountry]       = useState("");
  const [careerStatus,  setCareerStatus]  = useState("");
  const [jobTitle,      setJobTitle]      = useState("");
  const [company,       setCompany]       = useState("");
  const [yearsExp,      setYearsExp]      = useState("");
  const [trainingHours, setTrainingHours] = useState("");
  const [linkedin,      setLinkedin]      = useState("");
  const [motivation,    setMotivation]    = useState("");
  const [howHeard,      setHowHeard]      = useState("");

  // Multi-entry arrays
  const [educationEntries,  setEducationEntries]  = useState<EducationEntry[]>([]);
  const [experienceEntries, setExperienceEntries] = useState<ExperienceEntry[]>([]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (accessToken) fetchMe();
  }, [_hasHydrated, accessToken]);

  const { data: certData, isLoading: certLoading } = useSWR(
    slug ? `/courses/${slug}` : null,
    (url) => api.get<any>(url),
  );

  const { data: appsData } = useSWR(
    accessToken ? ["/applications/my", accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
  );

  const { data: enrollmentsData } = useSWR(
    accessToken ? ["/enrollments/my", accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
  );

  const { data: profileData } = useSWR(
    accessToken ? ["/users/me/profile", accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
  );

  const enrollmentIdForAttempts: string | null = (() => {
    const enrollments: any[] = Array.isArray(enrollmentsData?.data) ? enrollmentsData.data
      : Array.isArray(enrollmentsData) ? enrollmentsData : [];
    const certObj = certData?.data ?? certData;
    if (!certObj) return null;
    const e = enrollments.find((e: any) => e.certification_id === certObj.id || e.certification?.id === certObj.id);
    return e?.status === "active" ? (e?.id ?? null) : null;
  })();

  const { data: attemptsRaw, isLoading: attemptsLoading } = useSWR(
    accessToken && enrollmentIdForAttempts
      ? [`/exams/enrollments/${enrollmentIdForAttempts}/attempts`, accessToken]
      : null,
    ([url, token]) => api.get<any>(url, token),
  );

  const cert: Cert | null = certData?.data ?? certData ?? null;
  const myApps: any[] = Array.isArray(appsData?.data) ? appsData.data
    : Array.isArray(appsData) ? appsData : [];
  const myEnrollments: any[] = Array.isArray(enrollmentsData?.data) ? enrollmentsData.data
    : Array.isArray(enrollmentsData) ? enrollmentsData : [];

  const certEnrollment = cert
    ? myEnrollments.find((e) => e.certification_id === cert.id || e.certification?.id === cert.id)
    : null;

  const allAttempts: any[] = Array.isArray(attemptsRaw?.data) ? attemptsRaw.data
    : Array.isArray(attemptsRaw) ? attemptsRaw : [];
  const latestAttempt = allAttempts.length > 0 ? allAttempts[allAttempts.length - 1] : null;
  const hadFailedExam = latestAttempt?.status === "failed" && latestAttempt?.passed === false;

  const existingApp = cert
    ? myApps.find((a) =>
        a.certification_id === cert.id &&
        ["pending_payment", "payment_submitted", "pending_review"].includes(a.status)
      )
    : null;

  const isReturningStudent = false;

  // Pre-populate from stored profile when data arrives
  useEffect(() => {
    const p = profileData?.data?.profile ?? profileData?.profile;
    if (!p) return;
    if (p.phone)           setPhone(p.phone);
    if (p.date_of_birth)   setDob(p.date_of_birth.slice(0, 10));
    if (p.gender)          setGender(p.gender);
    if (p.country)         setCountry(p.country);
    if (p.career_status)   setCareerStatus(p.career_status);
    if (p.job_title)       setJobTitle(p.job_title);
    if (p.company)         setCompany(p.company);
    if (p.years_experience != null) setYearsExp(String(p.years_experience));
    if (p.linkedin_url)    setLinkedin(p.linkedin_url);

    // Education: prefer stored array, fall back to flat fields
    const rawEdu = p.education_entries;
    if (Array.isArray(rawEdu) && rawEdu.length > 0) {
      setEducationEntries(rawEdu);
    } else if (p.university) {
      setEducationEntries([{
        id: uid(),
        institution:    p.university     ?? "",
        degree:         p.degree_program ?? "",
        field_of_study: "",
        start_year:     "",
        end_year:       p.graduation_year ? String(p.graduation_year) : "",
        is_current:     false,
      }]);
    }

    // Experience: prefer stored array, fall back to flat fields
    const rawExp = p.experience_entries;
    if (Array.isArray(rawExp) && rawExp.length > 0) {
      setExperienceEntries(rawExp);
    } else if (p.job_title || p.company) {
      setExperienceEntries([{
        id: uid(),
        title:       p.job_title ?? "",
        company:     p.company   ?? "",
        location:    "",
        start_date:  "",
        end_date:    "",
        is_current:  true,
        description: "",
      }]);
    }
  }, [profileData]);

  const isLoggedIn  = !!accessToken && _hasHydrated;
  const displayName = user ? `${user.profile?.first_name ?? ""} ${user.profile?.last_name ?? ""}`.trim() : "";

  const eligibilityFailures = cert ? getEligibilityFailures(cert, yearsExp, trainingHours, t) : [];
  const hasRequirements = cert && (cert.min_years_experience != null || cert.min_training_hours != null);
  const isEligible = eligibilityFailures.length === 0;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (isReturningStudent) {
        addItem({
          id:           cert!.id,
          type:         "certification",
          slug:         cert!.slug,
          title:        cert!.title,
          price:        Number(cert!.price),
          cert_acronym: cert!.acronym,
        });
        toast.success(t("addedToCart"));
        router.push("/cart");
        return;
      }

      let token = accessToken;

      if (!token) {
        try {
          await api.post("/auth/register", {
            email, password, first_name: firstName, last_name: lastName,
            // Falls back to the referral cookie set on first landing (e.g. from
            // a product link on the marketing site) since this form has no
            // ref param of its own — see RegisterForm.tsx for the same pattern.
            referral_code: getRefCookie() || undefined,
          });
        } catch (err: any) {
          if (err instanceof ApiError && err.status === 409) {
            toast.error(t("accountExistsError"));
            setSubmitting(false);
            return;
          }
          throw err;
        }
        const loginData = await api.post<any>("/auth/login", { email, password });
        token = loginData.data?.access_token ?? loginData.access_token;
        const refreshToken = loginData.data?.refresh_token ?? loginData.refresh_token;
        const userObj      = loginData.data?.user ?? loginData.user;
        useAuthStore.setState({ accessToken: token, refreshToken, user: userObj, _hasHydrated: true });
      }

      // Derive flat fields from first entries for profile backwards compat
      const firstEdu = educationEntries[0];
      const firstExp = experienceEntries[0];

      await api.post("/applications", {
        certification_slug: cert!.slug,
        phone:              phone        || undefined,
        date_of_birth:      dob          || undefined,
        gender:             gender       || undefined,
        country:            country      || undefined,
        career_status:      careerStatus || undefined,
        job_title:          firstExp?.title   || jobTitle  || undefined,
        company:            firstExp?.company || company   || undefined,
        years_experience:   yearsExp ? parseInt(yearsExp) : undefined,
        training_hours:     trainingHours ? parseInt(trainingHours) : undefined,
        linkedin_url:       linkedin     || undefined,
        university:         firstEdu?.institution || undefined,
        degree_program:     firstEdu?.degree      || undefined,
        graduation_year:    firstEdu?.end_year ? parseInt(firstEdu.end_year) : undefined,
        education_entries:  educationEntries.length > 0 ? educationEntries : undefined,
        experience_entries: experienceEntries.length > 0 ? experienceEntries : undefined,
        motivation:         motivation   || undefined,
        how_heard:          howHeard     || undefined,
      }, token!);

      setSubmitted(true);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("duplicateApplicationError"));
      } else if (err instanceof ApiError && err.status === 400 && err.message?.includes("not eligible")) {
        toast.error(err.message);
      } else {
        toast.error(err.message ?? t("submitFailedError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!_hasHydrated || certLoading || (enrollmentIdForAttempts && attemptsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle size={40} className="text-red-300 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-navy-900 mb-2">{t("certNotFoundHeading")}</h2>
        <p className="text-slate-500 text-sm mb-6">{t("certNotFoundBody")}</p>
        <a href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"} className="btn-primary !py-2.5 !px-6 !text-sm inline-flex">
          {t("browseCertifications")}
        </a>
      </div>
    );
  }

  if (cert.status !== "active") {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle size={40} className="text-amber-300 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-navy-900 mb-2">{t("notAvailableHeading")}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {t.rich("notAvailableBody", { acronym: cert.acronym, b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <a href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"} className="btn-primary !py-2.5 !px-6 !text-sm inline-flex">
          {t("browseCertifications")}
        </a>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (submitted) {
    function handleProceedToPayment() {
      addItem({
        id:           cert!.id,
        type:         "certification",
        slug:         cert!.slug,
        title:        cert!.title,
        price:        Number(cert!.price),
        cert_acronym: cert!.acronym,
      });
      router.push("/cart");
    }

    return (
      <div className="max-w-lg mx-auto py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-3">
          <CertIcon iconKey={cert.badge_icon} size={26} className="text-navy-700" />
        </div>
        <h1 className="text-2xl font-display font-black text-navy-900 mb-2">{t("applicationReceivedHeading")}</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          {t.rich("applicationReceivedBody", { title: cert.title, acronym: cert.acronym, b: (chunks) => <strong>{chunks}</strong> })}
        </p>

        <button
          onClick={handleProceedToPayment}
          className="btn-primary !py-3.5 !px-10 !text-sm inline-flex items-center gap-2 mb-4 w-full justify-center"
        >
          <ShoppingCart size={16} />
          {t("proceedToPayment", { price: Number(cert.price).toLocaleString() })}
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left space-y-3 mb-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t("whatHappensNext")}</p>
          {[
            t("nextStep1"),
            t("nextStep2"),
            t("nextStep3"),
            t("nextStep4"),
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-slate-700">
              <div className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
              {s}
            </div>
          ))}
        </div>

        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          {t("payLater")}
        </Link>
      </div>
    );
  }

  // ── Certificate already earned ─────────────────────────────────────────────

  if (certEnrollment?.status === "completed") {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Award size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-display font-bold text-navy-900 mb-2">{t("certificateEarnedHeading")}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {t.rich("certificateEarnedBody", { acronym: cert.acronym, b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <Link href="/certificates" className="btn-primary !py-2.5 !px-6 !text-sm inline-flex">
          {t("viewCertificates")}
        </Link>
      </div>
    );
  }

  // ── Currently enrolled (active) ────────────────────────────────────────────

  if (certEnrollment?.status === "active" && !hadFailedExam) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle size={40} className="text-teal-400 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-navy-900 mb-2">{t("alreadyEnrolledHeading")}</h2>
        <p className="text-slate-500 text-sm mb-6">
          {t.rich("alreadyEnrolledBody", { acronym: cert.acronym, b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <Link href={`/certificates/${cert.id}`} className="btn-primary !py-2.5 !px-6 !text-sm inline-flex">
          {t("goToProgram")}
        </Link>
      </div>
    );
  }

  // ── Application in progress ────────────────────────────────────────────────

  if (existingApp) {
    const isPendingPayment = existingApp.status === "pending_payment";

    function handleProceedToPaymentFromGuard() {
      addItem({
        id:           cert!.id,
        type:         "certification",
        slug:         cert!.slug,
        title:        cert!.title,
        price:        Number(cert!.price),
        cert_acronym: cert!.acronym,
      });
      router.push("/cart");
    }

    if (isPendingPayment) {
      return (
        <div className="max-w-lg mx-auto py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-3">
          <CertIcon iconKey={cert.badge_icon} size={26} className="text-navy-700" />
        </div>
          <h1 className="text-2xl font-display font-black text-navy-900 mb-2">{t("applicationPendingPaymentHeading")}</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {t.rich("applicationPendingPaymentBody", { title: cert.title, acronym: cert.acronym, b: (chunks) => <strong>{chunks}</strong> })}
          </p>
          <button
            onClick={handleProceedToPaymentFromGuard}
            className="btn-primary !py-3.5 !px-10 !text-sm inline-flex items-center gap-2 mb-4 w-full justify-center"
          >
            <ShoppingCart size={16} />
            {t("proceedToPayment", { price: Number(cert.price).toLocaleString() })}
          </button>
          <Link href={`/certificates/${cert.id}`} className="text-sm text-slate-400 hover:text-slate-600 transition-colors block">
            {t("trackApplication")}
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle size={40} className="text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-navy-900 mb-2">{t("applicationInProgressHeading")}</h2>
        <p className="text-slate-500 text-sm mb-1">
          {t.rich("applicationInProgressBody", { acronym: cert.acronym, b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <p className="text-xs text-slate-400 mb-6">
          {t("statusLabel")} <span className="font-semibold text-slate-600">
            {existingApp.status === "payment_submitted" ? t("statusPaymentProcessing") : t("statusUnderReview")}
          </span>
        </p>
        <Link href={`/certificates/${cert.id}`} className="btn-primary !py-2.5 !px-6 !text-sm inline-flex">
          {t("trackApplication")}
        </Link>
      </div>
    );
  }

  function canProceed() {
    if (step === 1) {
      if (!isLoggedIn) {
        return (
          firstName.trim().length > 0 &&
          lastName.trim().length > 0 &&
          email.trim().length > 0 &&
          password.length >= 8 &&
          country.trim().length > 0
        );
      }
      return country.trim().length > 0;
    }
    if (step === 2) return careerStatus.trim().length > 0;
    if (step === 3) return true; // Shortfalls no longer block submission — flagged for manual review instead
    return true;
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">

      {/* Cert header */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-navy-900 rounded-2xl">
        <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <CertIcon iconKey={cert.badge_icon} size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">{t("applyingFor")}</p>
          <h1 className="text-white font-display font-black text-lg leading-snug">{cert.title}</h1>
          <p className="text-white/60 text-sm">{cert.acronym} · ${Number(cert.price).toLocaleString()}</p>
        </div>
        <Award size={28} className="text-white/20 flex-shrink-0" />
      </div>

      {/* Step bar */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => {
          const Icon    = STEP_ICONS[s.id];
          const done    = step > s.id;
          const current = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  done ? "bg-emerald-500" : current ? "bg-navy-900" : "bg-slate-100"
                }`}>
                  {done
                    ? <CheckCircle2 size={16} className="text-white" />
                    : <Icon size={15} className={current ? "text-white" : "text-slate-400"} />
                  }
                </div>
                <span className={`text-[10px] font-semibold whitespace-nowrap ${
                  current ? "text-navy-900" : done ? "text-emerald-600" : "text-slate-400"
                }`}>{t(STEP_LABEL_KEYS[s.id] as any)}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 mx-2 ${step > s.id ? "bg-emerald-300" : "bg-slate-100"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* ── Step 1: Personal ──────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <h2 className="text-lg font-display font-bold text-navy-900 mb-0.5">{t("personalInfoHeading")}</h2>
              <p className="text-slate-400 text-xs">
                {isLoggedIn ? t("personalInfoPrefilled") : t("personalInfoCreateAccount")}
              </p>
            </div>

            {isLoggedIn ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("fullNameLabel")}>
                  <input className="input-base bg-slate-50 cursor-not-allowed" value={displayName || "—"} readOnly />
                </Field>
                <Field label={t("emailLabel")}>
                  <input className="input-base bg-slate-50 cursor-not-allowed" value={user?.email ?? ""} readOnly />
                </Field>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t("firstNameLabel")} required>
                    <input className="input-base" placeholder={t("firstNamePlaceholder")} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                  <Field label={t("lastNameLabel")} required>
                    <input className="input-base" placeholder={t("lastNamePlaceholder")} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Field>
                </div>
                <Field label={t("emailLabel")} required>
                  <input className="input-base" type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label={t("passwordLabel")} required hint={t("passwordHint")}>
                  <div className="relative">
                    <input
                      className="input-base pr-10"
                      type={showPw ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>
                <p className="text-[11px] text-slate-400">
                  {t("haveAccount")}{" "}
                  <Link href={`/login?redirect=/apply/${slug}`} className="text-navy-700 font-semibold hover:underline">
                    {t("logInInstead")}
                  </Link>
                </p>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label={t("phoneLabel")}>
                <input className="input-base" type="tel" placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label={t("dobLabel")}>
                <input className="input-base" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("genderLabel")}>
                <select className="input-base" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">{t("genderPreferNot")}</option>
                  <option value="male">{t("genderMale")}</option>
                  <option value="female">{t("genderFemale")}</option>
                  <option value="non_binary">{t("genderNonBinary")}</option>
                  <option value="other">{t("genderOther")}</option>
                </select>
              </Field>
              <Field label={t("countryLabel")} required>
                <select className="input-base" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">{t("selectCountry")}</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {/* ── Step 2: Professional ──────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div>
              <h2 className="text-lg font-display font-bold text-navy-900 mb-0.5">{t("professionalHeading")}</h2>
              <p className="text-slate-400 text-xs">{t("professionalSubheading")}</p>
            </div>
            <Field label={t("careerStatusLabel")} required>
              <select className="input-base" value={careerStatus} onChange={(e) => setCareerStatus(e.target.value)}>
                <option value="">{t("selectStatus")}</option>
                <option value="professional">{t("careerStatusProfessional")}</option>
                <option value="student">{t("careerStatusStudent")}</option>
                <option value="other">{t("careerStatusOther")}</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("yearsExperienceLabel")}
                hint={cert.min_years_experience != null ? t("yearsExperienceMinHint", { count: cert.min_years_experience, years: cert.min_years_experience !== 1 ? t("yearOther") : t("yearOne") }) : undefined}
              >
                <input
                  className={`input-base ${cert.min_years_experience != null && yearsExp && parseInt(yearsExp) < cert.min_years_experience ? "border-red-300 focus:border-red-400" : ""}`}
                  type="number" min="0" max="50" placeholder={t("yearsExperiencePlaceholder")}
                  value={yearsExp} onChange={(e) => setYearsExp(e.target.value)}
                />
              </Field>
              <Field
                label={t("trainingHoursLabel")}
                hint={cert.min_training_hours != null ? t("trainingHoursMinHint", { count: cert.min_training_hours }) : t("trainingHoursHint")}
              >
                <input
                  className={`input-base ${cert.min_training_hours != null && trainingHours && parseInt(trainingHours) < cert.min_training_hours ? "border-red-300 focus:border-red-400" : ""}`}
                  type="number" min="0" placeholder={t("trainingHoursPlaceholder")}
                  value={trainingHours} onChange={(e) => setTrainingHours(e.target.value)}
                />
              </Field>
            </div>
            <Field label={t("linkedinLabel")}>
              <input className="input-base" placeholder={t("linkedinPlaceholder")} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </Field>

            {/* Career Experience entries */}
            <div className="pt-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t("careerExperienceHeading")}</p>

              {experienceEntries.length === 0 && (
                <div className="text-center py-5 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl mb-3">
                  {t("noExperienceEntries")}
                </div>
              )}

              <div className="space-y-3">
                {experienceEntries.map((entry) => (
                  <AppExperienceCard
                    key={entry.id}
                    entry={entry}
                    onChange={(f, v) => setExperienceEntries(prev => prev.map(e => e.id === entry.id ? { ...e, [f]: v } : e))}
                    onRemove={() => setExperienceEntries(prev => prev.filter(e => e.id !== entry.id))}
                  />
                ))}
              </div>

              <button
                onClick={() => setExperienceEntries(prev => [...prev, {
                  id: uid(), title: "", company: "", location: "",
                  start_date: "", end_date: "", is_current: false, description: "",
                }])}
                className="flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 border border-dashed border-navy-300 hover:border-navy-500 rounded-xl px-4 py-3 w-full justify-center transition-colors mt-3"
              >
                <Plus size={15} /> {t("addExperience")}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Education ─────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <div>
              <h2 className="text-lg font-display font-bold text-navy-900 mb-0.5">{t("educationHeading")}</h2>
              <p className="text-slate-400 text-xs">{t("educationSubheading")}</p>
            </div>

            {educationEntries.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                {t("noEducationEntries")}
              </div>
            )}

            <div className="space-y-3">
              {educationEntries.map((entry) => (
                <AppEducationCard
                  key={entry.id}
                  entry={entry}
                  onChange={(f, v) => setEducationEntries(prev => prev.map(e => e.id === entry.id ? { ...e, [f]: v } : e))}
                  onRemove={() => setEducationEntries(prev => prev.filter(e => e.id !== entry.id))}
                />
              ))}
            </div>

            <button
              onClick={() => setEducationEntries(prev => [...prev, {
                id: uid(), institution: "", degree: "", field_of_study: "",
                start_year: "", end_year: "", is_current: false,
              }])}
              className="flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 border border-dashed border-navy-300 hover:border-navy-500 rounded-xl px-4 py-3 w-full justify-center transition-colors"
            >
              <Plus size={15} /> {t("addEducationEntry")}
            </button>

            <Field label={t("motivationLabel", { acronym: cert.acronym })} hint={t("motivationHint")}>
              <textarea
                className="input-base h-28 resize-none"
                placeholder={t("motivationPlaceholder", { acronym: cert.acronym })}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
              />
            </Field>
            <Field label={t("howHeardLabel")}>
              <select className="input-base" value={howHeard} onChange={(e) => setHowHeard(e.target.value)}>
                <option value="">{t("selectOption")}</option>
                {HOW_HEARD_OPTIONS.map((o, i) => <option key={o} value={o}>{t(HOW_HEARD_KEYS[i] as any)}</option>)}
              </select>
            </Field>

            {/* Eligibility result */}
            {hasRequirements && (
              <div className={`rounded-xl border p-4 ${isEligible ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                {isEligible ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{t("eligibleHeading")}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{t("eligibleBody")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{t("ineligibleHeading")}</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        {t("ineligibleBody", { failures: eligibilityFailures.join(` ${locale === "ar" ? "و" : locale === "fr" ? "et" : "and"} `) })}
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        {t("ineligibleFooterPrefix")}{" "}
                        <a href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"} className="underline font-semibold">
                          {t("ineligibleFooterLink")}
                        </a>{" "}
                        {t("ineligibleFooterSuffix")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Required supporting documents — informational, prepares them before submission */}
            {cert.required_documents != null && cert.required_documents.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("requiredDocsHeading")}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {t("requiredDocsBody", { documents: cert.required_documents.join(", ") })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Review ────────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <div>
              <h2 className="text-lg font-display font-bold text-navy-900 mb-0.5">{t("reviewHeading")}</h2>
              <p className="text-slate-400 text-xs">{t("reviewSubheading")}</p>
            </div>
            <div className="space-y-4">
              <ReviewSection title={t("reviewPersonalInfo")}>
                <ReviewRow label={t("reviewFullName")} value={isLoggedIn ? (displayName || "—") : `${firstName} ${lastName}`.trim()} />
                <ReviewRow label={t("reviewEmail")}     value={isLoggedIn ? (user?.email ?? "") : email} />
                <ReviewRow label={t("reviewPhone")}     value={phone} />
                <ReviewRow label={t("reviewCountry")}   value={country} />
                <ReviewRow label={t("reviewGender")}    value={gender || t("notSpecified")} />
              </ReviewSection>

              <ReviewSection title={t("reviewProfessionalBackground")}>
                <ReviewRow label={t("reviewCareerStatus")} value={
                  careerStatus === "professional" ? t("careerStatusProfessional")
                  : careerStatus === "student" ? t("careerStatusStudent")
                  : careerStatus || "—"
                } />
                <ReviewRow label={t("reviewExperience")}     value={yearsExp ? t("reviewExperienceValue", { count: yearsExp }) : ""} />
                <ReviewRow label={t("reviewTrainingHours")} value={trainingHours ? t("reviewTrainingHoursValue", { count: trainingHours }) : ""} />
                <ReviewRow label={t("reviewLinkedin")}       value={linkedin} />
                {experienceEntries.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {experienceEntries.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 text-sm">
                        <span className="text-slate-400 w-28 flex-shrink-0">{t("reviewExperience")}</span>
                        <span className="text-slate-800 font-medium">
                          {[e.title, e.company].filter(Boolean).join(" · ")}
                          {(e.start_date || e.is_current) ? ` (${e.start_date || ""}${e.is_current ? ` – ${t("presentDate")}` : e.end_date ? ` – ${e.end_date}` : ""})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ReviewSection>

              <ReviewSection title={t("reviewEducation")}>
                {educationEntries.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">{t("noEducationEntriesAdded")}</p>
                ) : (
                  <div className="space-y-1">
                    {educationEntries.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 text-sm">
                        <span className="text-slate-400 w-28 flex-shrink-0">{t("reviewDegree")}</span>
                        <span className="text-slate-800 font-medium">
                          {[e.institution, e.degree, e.field_of_study].filter(Boolean).join(" · ")}
                          {e.end_year ? ` (${e.end_year})` : e.is_current ? ` (${t("inProgress")})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ReviewSection>

              {motivation && (
                <ReviewSection title={t("reviewMotivation")}>
                  <p className="text-sm text-slate-700 leading-relaxed">{motivation}</p>
                </ReviewSection>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
              {t("confirmSubmitNotice")}
            </div>
          </>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-6">
        {step > 1 ? (
          <button onClick={() => setStep((s) => s - 1)} className="btn-outline !py-2.5 !px-5 !text-sm">
            {t("back")}
          </button>
        ) : (
          <a href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"} className="btn-outline !py-2.5 !px-5 !text-sm">
            {t("cancel")}
          </a>
        )}

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("continue")} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60"
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> {t("submitting")}</>
              : <><CheckCircle2 size={15} /> {t("submitApplication")}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-slate-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function AppEducationCard({ entry, onChange, onRemove }: {
  entry: EducationEntry;
  onChange: (f: keyof EducationEntry, v: any) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{entry.institution || "New Education Entry"}</p>
          {entry.degree && <p className="text-xs text-slate-500">{entry.degree}{entry.field_of_study ? ` · ${entry.field_of_study}` : ""}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-4">
          <Field label="Institution / University">
            <input className="input-base" placeholder="e.g. University of Toronto" value={entry.institution} onChange={(e) => onChange("institution", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Degree">
              <select className="input-base" value={entry.degree} onChange={(e) => onChange("degree", e.target.value)}>
                <option value="">Select…</option>
                {["High School Diploma","Associate's Degree","Bachelor's Degree","Master's Degree","MBA","Ph.D.","Professional Certificate","Other"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Field of Study">
              <input className="input-base" placeholder="e.g. Computer Science" value={entry.field_of_study} onChange={(e) => onChange("field_of_study", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4 items-end">
            <Field label="Start Year">
              <input className="input-base" type="number" min="1950" max="2030" placeholder="2018" value={entry.start_year} onChange={(e) => onChange("start_year", e.target.value)} />
            </Field>
            <Field label="End Year">
              <input className="input-base" type="number" min="1950" max="2030" placeholder="2022" value={entry.end_year} disabled={entry.is_current} onChange={(e) => onChange("end_year", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600 pb-2 cursor-pointer">
              <input type="checkbox" checked={entry.is_current} onChange={(e) => { onChange("is_current", e.target.checked); if (e.target.checked) onChange("end_year", ""); }} className="rounded" />
              Currently enrolled
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function AppExperienceCard({ entry, onChange, onRemove }: {
  entry: ExperienceEntry;
  onChange: (f: keyof ExperienceEntry, v: any) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{entry.title || "New Experience"}</p>
          {entry.company && <p className="text-xs text-slate-500">{entry.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Job Title">
              <input className="input-base" placeholder="e.g. Product Manager" value={entry.title} onChange={(e) => onChange("title", e.target.value)} />
            </Field>
            <Field label="Company">
              <input className="input-base" placeholder="e.g. Accenture" value={entry.company} onChange={(e) => onChange("company", e.target.value)} />
            </Field>
          </div>
          <Field label="Location">
            <input className="input-base" placeholder="e.g. Toronto, ON" value={entry.location} onChange={(e) => onChange("location", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-4 items-end">
            <Field label="Start Date">
              <input className="input-base" type="month" value={entry.start_date} onChange={(e) => onChange("start_date", e.target.value)} />
            </Field>
            <Field label="End Date">
              <input className="input-base" type="month" value={entry.end_date} disabled={entry.is_current} onChange={(e) => onChange("end_date", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600 pb-2 cursor-pointer">
              <input type="checkbox" checked={entry.is_current} onChange={(e) => { onChange("is_current", e.target.checked); if (e.target.checked) onChange("end_date", ""); }} className="rounded" />
              Current role
            </label>
          </div>
          <Field label="Description">
            <textarea className="input-base h-20 resize-none" placeholder="Describe your responsibilities…" value={entry.description} onChange={(e) => onChange("description", e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}

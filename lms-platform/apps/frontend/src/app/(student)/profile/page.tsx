"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  User, Lock, Bell, CreditCard, FileText, Briefcase,
  GraduationCap, MapPin, Plus, Trash2, ExternalLink,
  Save, Loader2, Eye, EyeOff, Building, Calendar, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

type AddressEntry = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-display font-bold text-navy-900 mb-5 pb-3 border-b border-slate-100">
      {children}
    </h2>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-[11px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
      <button
        onClick={onSave}
        disabled={saving}
        className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Changes
      </button>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const BASIC_SUBSECTIONS = [
  { id: "personal",     label: "Personal",    icon: User },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "education",    label: "Education",    icon: GraduationCap },
];

// ── Page ──────────────────────────────────────────────────────────────────────

function ProfilePageContent() {
  const token      = useAuthStore((s) => s.accessToken)!;
  const fetchMe    = useAuthStore((s) => s.fetchMe);
  const authUser   = useAuthStore((s) => s.user);
  const searchParams     = useSearchParams();
  const activeSection    = searchParams.get("tab") || "basic";
  const [activeSubsection, setActiveSubsection] = useState("personal");

  // Handle redirect back from email-change verification link — run once on mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("emailChanged") === "true") {
      toast.success("Email address updated successfully!");
      fetchMe();
      window.history.replaceState({}, "", "/profile");
    }
    const emailError = params.get("emailError");
    if (emailError) {
      toast.error(decodeURIComponent(emailError));
      window.history.replaceState({}, "", "/profile");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: profileData, mutate } = useSWR(
    token ? ["/users/me/profile", token] : null,
    ([url, t]) => fetcher(url, t),
  );
  const { data: appsData } = useSWR(
    token ? ["/applications/my", token] : null,
    ([url, t]) => fetcher(url, t),
  );

  const profile = profileData?.profile ?? profileData;
  const email   = profileData?.email ?? authUser?.email ?? "";
  const paiId   = profile?.pai_id ?? "—";
  const applications: any[] = Array.isArray(appsData?.data) ? appsData.data : Array.isArray(appsData) ? appsData : [];
  const initials = `${profile?.first_name?.charAt(0) ?? ""}${profile?.last_name?.charAt(0) ?? ""}`.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-white">{initials}</span>
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-navy-900">
              {profile?.first_name} {profile?.last_name}
            </h1>
            <p className="text-slate-500 text-sm">{email} · <span className="font-medium text-navy-700">{paiId}</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
        <div className={activeSection !== "basic"    ? "hidden" : ""}>
          <BasicSection
            token={token} profile={profile} email={email}
            mutate={mutate} fetchMe={fetchMe}
            activeSubsection={activeSubsection}
            setActiveSubsection={setActiveSubsection}
          />
        </div>
        <div className={activeSection !== "security" ? "hidden" : ""}><SecuritySection token={token} /></div>
        <div className={activeSection !== "comms"    ? "hidden" : ""}><CommsSection token={token} profile={profile} mutate={mutate} /></div>
        <div className={activeSection !== "payment"  ? "hidden" : ""}><PaymentSection /></div>
        <div className={activeSection !== "orders"   ? "hidden" : ""}><OrdersSection /></div>
      </div>
    </div>
  );
}

// ── Basic Section ─────────────────────────────────────────────────────────────

function BasicSection({ token, profile, email, mutate, fetchMe, activeSubsection, setActiveSubsection }: any) {
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200">
        {BASIC_SUBSECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubsection(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg -mb-px border-b-2 transition-colors ${
              activeSubsection === id
                ? "border-navy-700 text-navy-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className={activeSubsection !== "personal"     ? "hidden" : ""}><PersonalSubsection     token={token} profile={profile} email={email} mutate={mutate} fetchMe={fetchMe} /></div>
      <div className={activeSubsection !== "professional" ? "hidden" : ""}><ProfessionalSubsection token={token} profile={profile} mutate={mutate} /></div>
      <div className={activeSubsection !== "education"    ? "hidden" : ""}><EducationSubsection    token={token} profile={profile} mutate={mutate} /></div>
    </div>
  );
}

// ── Personal ──────────────────────────────────────────────────────────────────

function PersonalSubsection({ token, profile, email, mutate, fetchMe }: any) {
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [dob,         setDob]         = useState("");
  const [gender,      setGender]      = useState("");
  const [phone,       setPhone]       = useState("");
  const [nationality, setNationality] = useState("");
  const [address,     setAddress]     = useState<Omit<AddressEntry, "id" | "label">>({ line1: "", line2: "", city: "", state: "", zip: "", country: "" });
  const [saving,      setSaving]      = useState(false);

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail,      setNewEmail]      = useState("");
  const [emailSending,  setEmailSending]  = useState(false);
  const [emailSent,     setEmailSent]     = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName( profile.last_name  ?? "");
    setDob(profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : "");
    setGender(profile.gender ?? "");
    setPhone(profile.phone ?? "");
    setNationality(profile.nationality ?? "");
    const raw = profile?.addresses;
    const first = Array.isArray(raw) && raw.length > 0 ? raw[0] : null;
    if (first) setAddress({ line1: first.line1 ?? "", line2: first.line2 ?? "", city: first.city ?? "", state: first.state ?? "", zip: first.zip ?? "", country: first.country ?? "" });
  }, [profile]);

  async function save() {
    setSaving(true);
    try {
      await api.patch<any>("/users/me/profile", {
        first_name:    firstName,
        last_name:     lastName,
        date_of_birth: dob    || null,
        gender:        gender || null,
        country:       address.country || null,
        nationality:   nationality    || null,
        phone:         phone          || null,
        addresses:     [{ id: "primary", label: "Primary", ...address }],
        display_name:  `${firstName} ${lastName}`.trim(),
      }, token);
      await mutate();
      await fetchMe();
      toast.success("Personal information saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  async function sendEmailVerification() {
    if (!newEmail.trim()) return;
    setEmailSending(true);
    try {
      await api.post<any>("/users/me/email-change", { new_email: newEmail.trim() }, token);
      setEmailSent(true);
      toast.success(`Verification email sent to ${newEmail.trim()}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send verification email");
    } finally { setEmailSending(false); }
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Personal Information</SectionTitle>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input className="input-base" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last Name" required>
          <input className="input-base" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
      </div>

      {/* Email — shown read-only with a change option */}
      <Field label="Email Address">
        <input className="input-base bg-slate-50" value={email} readOnly />
        {!showEmailForm && !emailSent && (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="mt-1.5 text-xs font-semibold text-navy-600 hover:text-navy-800 underline underline-offset-2"
          >
            Change email address
          </button>
        )}
        {showEmailForm && !emailSent && (
          <div className="mt-2 flex gap-2">
            <input
              className="input-base flex-1 text-sm"
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendEmailVerification()}
            />
            <button
              type="button"
              onClick={sendEmailVerification}
              disabled={emailSending || !newEmail.trim()}
              className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 whitespace-nowrap"
            >
              {emailSending ? <Loader2 size={12} className="animate-spin" /> : "Send verification"}
            </button>
            <button type="button" onClick={() => { setShowEmailForm(false); setNewEmail(""); }} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
          </div>
        )}
        {emailSent && (
          <p className="mt-1.5 text-xs text-emerald-600 font-medium">
            Verification link sent to <strong>{newEmail}</strong>. Check your inbox and click the link to confirm the change.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone Number">
          <input className="input-base" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Date of Birth">
          <input className="input-base" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Gender">
          <select className="input-base" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Nationality">
          <select className="input-base" value={nationality} onChange={(e) => setNationality(e.target.value)}>
            <option value="">Select nationality…</option>
            {["Canadian","American","British","Australian","Indian","German","French","Emirati","Saudi","Singaporean","Other"].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Primary Address */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3"><MapPin size={14} /> Primary Address</h3>
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <select className="input-base" value={address.country} onChange={(e) => setAddress(a => ({ ...a, country: e.target.value }))}>
            <option value="">Select country…</option>
            {["Canada","United States","United Kingdom","Australia","India","Germany","France","UAE","Saudi Arabia","Singapore","Other"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input className="input-base" placeholder="Street address" value={address.line1} onChange={(e) => setAddress(a => ({ ...a, line1: e.target.value }))} />
          <input className="input-base" placeholder="Apt, suite, etc. (optional)" value={address.line2} onChange={(e) => setAddress(a => ({ ...a, line2: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <input className="input-base" placeholder="City" value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} />
            <input className="input-base" placeholder="State / Province" value={address.state} onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))} />
            <input className="input-base" placeholder="Postal code" value={address.zip} onChange={(e) => setAddress(a => ({ ...a, zip: e.target.value }))} />
          </div>
        </div>
      </div>

      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// ── Professional ──────────────────────────────────────────────────────────────

function ProfessionalSubsection({ token, profile, mutate }: any) {
  const [careerStatus, setCareerStatus] = useState("");
  const [jobTitle,     setJobTitle]     = useState("");
  const [company,      setCompany]      = useState("");
  const [industry,     setIndustry]     = useState("");
  const [yearsExp,     setYearsExp]     = useState("");
  const [linkedin,     setLinkedin]     = useState("");
  const [entries,      setEntries]      = useState<ExperienceEntry[]>([]);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCareerStatus(profile.career_status ?? "");
    setJobTitle(    profile.job_title     ?? "");
    setCompany(     profile.company       ?? "");
    setIndustry(    profile.industry      ?? "");
    setYearsExp(    profile.years_experience != null ? String(profile.years_experience) : "");
    setLinkedin(    profile.linkedin_url  ?? "");
    const raw = profile?.experience_entries;
    if (Array.isArray(raw) && raw.length > 0) setEntries(raw);
    else if (profile?.job_title || profile?.company) {
      setEntries([{ id: uid(), title: profile.job_title ?? "", company: profile.company ?? "", location: "", start_date: "", end_date: "", is_current: true, description: "" }]);
    }
  }, [profile]);

  function addEntry() {
    setEntries(prev => [...prev, { id: uid(), title: "", company: "", location: "", start_date: "", end_date: "", is_current: false, description: "" }]);
  }
  function removeEntry(id: string) { setEntries(prev => prev.filter(e => e.id !== id)); }
  function updateEntry(id: string, field: keyof ExperienceEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch<any>("/users/me/profile", {
        career_status:      careerStatus || null,
        job_title:          jobTitle     || null,
        company:            company      || null,
        industry:           industry     || null,
        years_experience:   yearsExp ? parseInt(yearsExp) : null,
        linkedin_url:       linkedin     || null,
        experience_entries: entries,
      }, token);
      await mutate();
      toast.success("Professional information saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Professional Background</SectionTitle>

      <Field label="Career Status">
        <select className="input-base" value={careerStatus} onChange={(e) => setCareerStatus(e.target.value)}>
          <option value="">Select…</option>
          <option value="professional">Working Professional</option>
          <option value="student">Student</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Job Title">
          <input className="input-base" placeholder="e.g. Product Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </Field>
        <Field label="Company / Organization">
          <input className="input-base" placeholder="e.g. Accenture" value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Industry">
          <select className="input-base" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">Select…</option>
            {["Technology","Finance","Healthcare","Education","Marketing","Consulting","Legal","Government","Other"].map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </Field>
        <Field label="Years of Experience">
          <input className="input-base" type="number" min="0" max="50" placeholder="e.g. 5" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
        </Field>
      </div>

      <Field label="LinkedIn Profile URL">
        <input className="input-base" placeholder="https://linkedin.com/in/yourname" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      </Field>

      {/* Career Experience */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3"><Building size={14} /> Career Experience</h3>

        {entries.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl mb-3">
            No experience entries yet.
          </div>
        )}

        <div className="space-y-3">
          {entries.map((entry) => (
            <ExperienceCard
              key={entry.id}
              entry={entry}
              onChange={(f, v) => updateEntry(entry.id, f, v)}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}
        </div>

        <button
          onClick={addEntry}
          className="flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 border border-dashed border-navy-300 hover:border-navy-500 rounded-xl px-4 py-3 w-full justify-center transition-colors mt-3"
        >
          <Plus size={15} /> Add Experience
        </button>
      </div>

      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// ── Education ─────────────────────────────────────────────────────────────────

function EducationSubsection({ token, profile, mutate }: any) {
  const [entries, setEntries] = useState<EducationEntry[]>([]);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const raw = profile?.education_entries;
    if (Array.isArray(raw) && raw.length > 0) {
      setEntries(raw);
    } else if (profile?.university) {
      // Seed from single-field profile values (populated from apply form)
      setEntries([{
        id: uid(),
        institution:    profile.university      ?? "",
        degree:         profile.degree_program  ?? "",
        field_of_study: "",
        start_year:     "",
        end_year:       profile.graduation_year ? String(profile.graduation_year) : "",
        is_current:     false,
      }]);
    }
  }, [profile]);

  function addEntry() {
    setEntries(prev => [...prev, {
      id: uid(), institution: "", degree: "", field_of_study: "",
      start_year: "", end_year: "", is_current: false,
    }]);
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function updateEntry(id: string, field: keyof EducationEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch<any>("/users/me/profile", { education_entries: entries }, token);
      await mutate();
      toast.success("Education saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Education</SectionTitle>

      {entries.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          No education entries yet. Add your degrees and qualifications.
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => (
          <EducationCard
            key={entry.id}
            entry={entry}
            onChange={(f, v) => updateEntry(entry.id, f, v)}
            onRemove={() => removeEntry(entry.id)}
          />
        ))}
      </div>

      <button
        onClick={addEntry}
        className="flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 border border-dashed border-navy-300 hover:border-navy-500 rounded-xl px-4 py-3 w-full justify-center transition-colors"
      >
        <Plus size={15} /> Add Education Entry
      </button>

      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

function EducationCard({ entry, onChange, onRemove }: {
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
          <Field label="Institution / University" required>
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

function ExperienceCard({ entry, onChange, onRemove }: {
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
            <Field label="Job Title" required>
              <input className="input-base" placeholder="e.g. Product Manager" value={entry.title} onChange={(e) => onChange("title", e.target.value)} />
            </Field>
            <Field label="Company" required>
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
            <textarea className="input-base h-20 resize-none" placeholder="Describe your responsibilities and achievements…" value={entry.description} onChange={(e) => onChange("description", e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}

// ── Security ──────────────────────────────────────────────────────────────────

function SecuritySection({ token }: { token: string }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [saving,    setSaving]    = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8)   { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await api.patch<any>("/users/me/password", { current_password: currentPw, new_password: newPw }, token);
      toast.success("Password changed successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to change password");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Login + Security</SectionTitle>
      <form onSubmit={changePassword} className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Lock size={14} /> Change Password</h3>
          <Field label="Current Password">
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="input-base pr-10" required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label="New Password" hint="Minimum 8 characters.">
            <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input-base" required autoComplete="new-password" minLength={8} />
          </Field>
          <Field label="Confirm New Password">
            <input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={`input-base ${confirmPw && newPw !== confirmPw ? "border-red-300 focus:ring-red-200" : ""}`} required autoComplete="new-password" />
            {confirmPw && newPw !== confirmPw && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving || !currentPw || !newPw || newPw !== confirmPw} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Communication ─────────────────────────────────────────────────────────────

function CommsSection({ token, profile, mutate }: any) {
  const [emailNotif,      setEmailNotif]      = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEmailNotif(     profile.email_notifications ?? true);
    setMarketingEmails(profile.marketing_emails    ?? false);
  }, [profile]);

  async function save() {
    setSaving(true);
    try {
      await api.patch<any>("/users/me/profile", { email_notifications: emailNotif, marketing_emails: marketingEmails }, token);
      await mutate();
      toast.success("Preferences saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Communication Preferences</SectionTitle>
      <div className="space-y-3">
        {[
          { label: "Account Notifications", desc: "Application updates, enrollment confirmations, exam results", value: emailNotif, set: setEmailNotif },
          { label: "Marketing Emails",       desc: "New certifications, promotions, and PAI news",              value: marketingEmails, set: setMarketingEmails },
        ].map(({ label, desc, value, set }) => (
          <div key={label} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
            <button onClick={() => set((v: boolean) => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-navy-700" : "bg-slate-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        ))}
      </div>
      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// ── Payment ───────────────────────────────────────────────────────────────────

function PaymentSection() {
  return (
    <div className="space-y-5">
      <SectionTitle>Payment Methods</SectionTitle>
      <div className="text-center py-16 text-slate-400">
        <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Payment methods are managed through Stripe.</p>
        <p className="text-xs mt-1">Coming soon.</p>
      </div>
    </div>
  );
}

// ── Orders ────────────────────────────────────────────────────────────────────

function OrdersSection() {
  const token = useAuthStore((s) => s.accessToken) ?? "";
  const { data, isLoading } = useSWR(
    token ? ["/payments/my", token] : null,
    ([url, t]) => api.get<any>(url, t),
    { revalidateOnFocus: false },
  );
  const payments: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  const statusColor: Record<string, string> = {
    succeeded:           "bg-emerald-100 text-emerald-700",
    pending:             "bg-amber-100 text-amber-700",
    failed:              "bg-red-100 text-red-700",
    refunded:            "bg-slate-100 text-slate-600",
    partially_refunded:  "bg-orange-100 text-orange-700",
  };
  const statusLabel: Record<string, string> = {
    succeeded:           "Paid",
    pending:             "Pending",
    failed:              "Failed",
    refunded:            "Refunded",
    partially_refunded:  "Partial Refund",
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Payment History</SectionTitle>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin text-slate-300" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No payments yet</p>
          <p className="text-xs mt-1 text-slate-300">Your payment history will appear here after your first purchase.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-teal-600" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{p.description || "Payment"}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(p.succeeded_at ?? p.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                  <span className="text-xs font-bold text-slate-700">
                    ${Number(p.amount).toFixed(2)} {p.currency?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusColor[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {statusLabel[p.status] ?? p.status}
                </span>
                {p.stripe_receipt_url && (
                  <a
                    href={p.stripe_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 border border-teal-200 hover:border-teal-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={11} /> Receipt
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfilePageContent />
    </Suspense>
  );
}

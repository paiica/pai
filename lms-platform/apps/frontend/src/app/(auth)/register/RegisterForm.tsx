"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/lib/api";
import { getRefCookie } from "@/lib/referral";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia",
  "Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei",
  "Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde",
  "Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo",
  "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica",
  "Dominican Republic","East Timor","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea",
  "Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany",
  "Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras",
  "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica",
  "Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania",
  "Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
  "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua",
  "Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau",
  "Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia",
  "Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe",
  "Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia",
  "Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain",
  "Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan",
  "Tanzania","Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

export default function RegisterForm({ initialRef }: { initialRef?: string }) {
  const t = useTranslations("Register");
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "",
    date_of_birth: "",
    password: "",
    confirm_password: "",
  });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "email") setEmail(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError(t("passwordMismatch"));
      return;
    }

    try {
      const { confirm_password, ...payload } = form;
      await register({
        ...payload,
        phone: payload.phone || undefined,
        country: payload.country || undefined,
        date_of_birth: payload.date_of_birth || undefined,
        // Falls back to a referral captured earlier in the visit (e.g. from a product
        // link on the marketing site) when this registration page's own URL has none.
        referral_code: initialRef || getRefCookie() || undefined,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(t("genericError"));
    }
  }

  if (done) {
    return (
      <div className="bg-white p-8 text-center" style={{ borderRadius: "20px", border: "1px solid #ddd8d0", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdfa", border: "1px solid #ccfbf1" }}>
          <CheckCircle2 size={28} style={{ color: "#14b8a6" }} />
        </div>
        <h2 className="text-xl font-display font-black mb-2" style={{ color: "#171527" }}>{t("accountCreatedHeading")}</h2>
        <p className="text-sm mb-5" style={{ color: "#948e84" }}>
          {t.rich("accountCreatedBody", { email: () => <strong style={{ color: "#171527" }}>{form.email}</strong> })}
        </p>
        <Link href="/login" className="btn-primary !py-3 w-full justify-center">
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8" style={{ borderRadius: "20px", border: "1px solid #ddd8d0", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.05)" }}>
      <h1 className="text-2xl font-display font-black mb-1" style={{ color: "#171527" }}>{t("heading")}</h1>
      <p className="text-sm mb-6" style={{ color: "#948e84" }}>{t("subheading")}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-first-name" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("firstNameLabel")}</label>
            <input
              id="reg-first-name"
              type="text"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder={t("firstNamePlaceholder")}
              required
              className="input-base"
            />
          </div>
          <div>
            <label htmlFor="reg-last-name" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("lastNameLabel")}</label>
            <input
              id="reg-last-name"
              type="text"
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              placeholder={t("lastNamePlaceholder")}
              required
              className="input-base"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("emailLabel")}</label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder={t("emailPlaceholder")}
            required
            className="input-base"
          />
        </div>

        {/* Phone + Country */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("phoneLabel")}</label>
            <input
              id="reg-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder={t("phonePlaceholder")}
              className="input-base"
            />
          </div>
          <div>
            <label htmlFor="reg-country" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("countryLabel")}</label>
            <select
              id="reg-country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="input-base"
            >
              <option value="">{t("selectCountry")}</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="reg-dob" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("dobLabel")}</label>
          <input
            id="reg-dob"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => update("date_of_birth", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="input-base"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("passwordLabel")}</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={t("passwordPlaceholder")}
              required
              minLength={8}
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">{t("confirmPasswordLabel")}</label>
          <div className="relative">
            <input
              id="reg-confirm-password"
              type={showConfirm ? "text" : "password"}
              value={form.confirm_password}
              onChange={(e) => update("confirm_password", e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              required
              minLength={8}
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.confirm_password && form.password !== form.confirm_password && (
            <p className="text-xs text-red-500 mt-1">{t("passwordMismatch")}</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary !py-3 !text-base justify-center disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : t("submit")}
        </button>

        <p className="text-xs text-slate-400 text-center">
          {t("termsPrefix")}{" "}
          <Link href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/terms`} className="text-navy-700 underline">{t("terms")}</Link>{" "}
          {t("and")}{" "}
          <Link href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`} className="text-navy-700 underline">{t("privacyPolicy")}</Link>.
        </p>
      </form>

      <div className="mt-5 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-navy-700 font-semibold hover:text-navy-900">{t("signIn")}</Link>
      </div>
    </div>
  );
}

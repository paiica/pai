"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ShoppingCart, Tag, CheckCircle, ArrowRight, X, Loader2,
  Shield, Lock, Zap, GraduationCap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore, CartItem } from "@/store/cart.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const ITEM_GRADIENTS = [
  "from-violet-400 to-indigo-500",
  "from-blue-400 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
];

const CERT_ACCENTS = [
  { badge: "from-amber-400 via-orange-400 to-rose-400",    ring: "ring-amber-300/50"   },
  { badge: "from-blue-500 via-indigo-500 to-violet-500",   ring: "ring-blue-300/50"    },
  { badge: "from-violet-500 via-purple-500 to-fuchsia-500",ring: "ring-violet-300/50"  },
  { badge: "from-emerald-400 via-teal-500 to-cyan-500",    ring: "ring-emerald-300/50" },
  { badge: "from-rose-500 via-pink-500 to-fuchsia-400",    ring: "ring-rose-300/50"    },
];

function accentForAcronym(acronym: string) {
  const idx = (acronym ?? "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % CERT_ACCENTS.length;
  return CERT_ACCENTS[idx];
}

function AcronymBadge({ acronym }: { acronym: string }) {
  const accent = accentForAcronym(acronym);
  const words = (acronym ?? "—").split(/\s+/);
  const charCount = (acronym ?? "").replace(/\s/g, "").length;
  const textSize = charCount <= 4 ? "text-[11px]" : "text-[9px]";

  return (
    <div className={cn(
      "w-12 h-12 rounded-xl flex-shrink-0 flex flex-col items-center justify-center ring-[3px] gap-0.5 relative overflow-hidden shadow-md self-center ml-4",
      `bg-gradient-to-br ${accent.badge}`, accent.ring
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-1/3 bg-black/10 pointer-events-none" />
      {words.map((w, i) => (
        <span key={i} className={cn("relative font-black text-white tracking-widest leading-none uppercase drop-shadow", textSize)}>
          {w}
        </span>
      ))}
    </div>
  );
}

export default function CartPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { items, removeItem, clearCart, updateItemPrice, fetchCart } = useCartStore();
  const t = useTranslations("Cart");

  // Sync prices from API on mount so stale localStorage prices are corrected
  useEffect(() => {
    async function syncPrices() {
      try {
        const courseItems = items.filter((i) => i.type === "course" && i.course_id);
        const certItems   = items.filter((i) => i.type === "certification");
        const fetches: Promise<void>[] = [];

        if (courseItems.length) {
          fetches.push(
            fetch(`${API_BASE}/prep-courses`).then(r => r.json()).then(d => {
              const courses: any[] = d?.data ?? d ?? [];
              for (const ci of courseItems) {
                const live = courses.find((c: any) => c.id === ci.course_id);
                if (live && Number(live.price) !== ci.price) updateItemPrice(ci.id, Number(live.price));
              }
            })
          );
        }

        if (certItems.length) {
          fetches.push(
            fetch(`${API_BASE}/certifications`).then(r => r.json()).then(d => {
              const certs: any[] = d?.data ?? d ?? [];
              for (const ci of certItems) {
                const live = certs.find((c: any) => c.slug === ci.slug);
                if (live && Number(live.price) !== ci.price) updateItemPrice(ci.id, Number(live.price));
              }
            })
          );
        }

        await Promise.all(fetches);
      } catch { /* silent — stale price is non-critical */ }
    }
    syncPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [promoCode, setPromoCode]     = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount_amount: number; message: string; promo_id?: string } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [checkingOut,   setCheckingOut]   = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const effectivePrice = (i: CartItem) => i.final_price ?? i.price;
  const subtotal   = items.reduce((s, i) => s + effectivePrice(i), 0);
  const discount   = promoResult?.valid ? promoResult.discount_amount : 0;
  const total      = Math.max(0, subtotal - discount);
  const freeItems  = items.filter(i => effectivePrice(i) === 0);
  const paidItems  = items.filter(i => effectivePrice(i) > 0);

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const res  = await fetch(`${API_BASE}/promo-codes/validate/${promoCode.trim()}?subtotal=${subtotal}`);
      const data = await res.json();
      const result = data?.data ?? data;
      setPromoResult(result);
      if (result.valid) toast.success(result.message);
    } catch {
      toast.error(t("toastPromoFailed"));
    } finally {
      setValidatingPromo(false);
    }
  }

  async function doCheckoutItem(item: CartItem) {
    const endpoint = item.type === "course" ? "/payments/course-checkout" : "/payments/certification-checkout";
    const body = item.type === "course"
      ? { course_id: item.course_id, promo_code: promoCode.trim() || undefined }
      : { certification_slug: item.slug, promo_code: promoCode.trim() || undefined };
    const res  = await api.post<any>(endpoint, body, token) as any;
    const data = res?.data ?? res;
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
      return "redirected";
    }
    // Resolved synchronously — a free course enrolls immediately, but a free
    // certification only submits an Application for admin review (never
    // auto-enrolls), so the messaging must not claim "Enrolled!" for that
    // case. Either way, the backend already removed this item from the
    // account cart — refetch rather than optimistically delete it locally,
    // since deleting an already-gone row would 404 and roll the UI back.
    await fetchCart();
    toast.success(
      item.type === "certification"
        ? t("toastApplicationSubmitted", { title: item.title })
        : t("toastEnrolled", { title: item.title })
    );
    return data.enrolled ? "enrolled" : "submitted";
  }

  async function handleCheckout() {
    if (!token) { toast.error(t("toastLoginRequired")); return; }
    setCheckingOut(true);
    try {
      for (const item of freeItems) await doCheckoutItem(item);
      if (paidItems.length > 0)      await doCheckoutItem(paidItems[0]);
    } catch (e: any) {
      toast.error(e.message ?? t("toastCheckoutFailedFallback"));
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleCheckoutSingle(item: CartItem) {
    if (!token) { toast.error(t("toastLoginRequired")); return; }
    setCheckingOutId(item.id);
    try {
      await doCheckoutItem(item);
    } catch (e: any) {
      toast.error(e.message ?? t("toastCheckoutFailedFallback"));
    } finally {
      setCheckingOutId(null);
    }
  }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <ShoppingCart size={36} className="text-slate-300" />
          </div>
          <h2 className="text-2xl font-display font-black text-navy-900 mb-2">{t("emptyHeading")}</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            {t("emptyBody")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/certificates" className="btn-primary w-full sm:w-auto justify-center">
              <GraduationCap size={15} /> {t("browseCertifications")}
            </Link>
            <Link href="/learn" className="btn-outline w-full sm:w-auto justify-center">
              {t("viewCourses")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
              <ShoppingCart size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-navy-900 leading-none">{t("heading")}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{items.length} {items.length !== 1 ? t("itemPlural") : t("itemSingular")}</p>
            </div>
          </div>
          <Link href="/certificates" className="text-xs text-slate-400 hover:text-navy-700 transition-colors flex items-center gap-1">
            {t("continueShopping")}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Cart items ── */}
          <div className="lg:col-span-3 space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
                {/* Accent stripe */}
                <div className={cn("w-1.5 flex-shrink-0 bg-gradient-to-b", ITEM_GRADIENTS[i % ITEM_GRADIENTS.length])} />

                {/* Icon / thumbnail */}
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-16 h-16 object-cover flex-shrink-0 self-center ml-4 rounded-xl"
                  />
                ) : item.cert_acronym ? (
                  <AcronymBadge acronym={item.cert_acronym} />
                ) : (
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 self-center ml-4 text-white font-black text-lg",
                    ITEM_GRADIENTS[i % ITEM_GRADIENTS.length]
                  )}>
                    {item.title.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                          item.type === "course" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
                        )}>
                          {item.type === "course" ? t("typeCourse") : t("typeCertification")}
                        </span>
                        {item.cert_acronym && (
                          <span className="text-[10px] font-semibold text-slate-400">{item.cert_acronym}</span>
                        )}
                      </div>
                      <p className="font-bold text-navy-900 text-sm leading-snug">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.subtitle}</p>
                      )}
                      {!!item.member_discount_percentage && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          <Tag size={9} /> {t("memberPrice", { percentage: item.member_discount_percentage, source: item.member_discount_source ?? "" })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title={t("removeItemTitle")}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="font-black text-navy-900 text-base flex items-center gap-2">
                      {!!item.member_discount_percentage && (
                        <span className="text-slate-400 font-semibold text-xs line-through">${item.price.toFixed(2)}</span>
                      )}
                      {effectivePrice(item) === 0
                        ? <span className="text-emerald-600 font-bold text-sm">{t("free")}</span>
                        : `$${effectivePrice(item).toFixed(2)}`}
                    </span>
                    <button
                      onClick={() => handleCheckoutSingle(item)}
                      disabled={checkingOut || !!checkingOutId}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50",
                        effectivePrice(item) === 0
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-navy-900 hover:bg-navy-700 text-white"
                      )}
                    >
                      {checkingOutId === item.id && <Loader2 size={11} className="animate-spin" />}
                      {effectivePrice(item) === 0 ? t("enrollFree") : t("buyNow")}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center pt-1">
              <button
                onClick={clearCart}
                className="text-xs text-slate-300 hover:text-red-400 transition-colors"
              >
                {t("removeAllItems")}
              </button>
            </div>
          </div>

          {/* ── Sticky summary ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">

              {/* Promo code */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Tag size={12} /> {t("promoCodeLabel")}
                </p>
                {promoResult?.valid ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle size={13} /> {promoResult.message}
                    </span>
                    <button
                      onClick={() => { setPromoResult(null); setPromoCode(""); }}
                      className="text-emerald-500 hover:text-emerald-700 ml-2 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); if (promoResult && !promoResult.valid) setPromoResult(null); }}
                        onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                        placeholder={t("promoCodePlaceholder")}
                        className={cn("input-base text-sm flex-1 !py-2", promoResult && !promoResult.valid && "border-red-300 focus:border-red-400")}
                      />
                      <button
                        onClick={validatePromo}
                        disabled={validatingPromo || !promoCode.trim()}
                        className="btn-outline !py-2 !px-4 !text-xs font-bold disabled:opacity-40 flex-shrink-0"
                      >
                        {validatingPromo ? <Loader2 size={12} className="animate-spin" /> : t("apply")}
                      </button>
                    </div>
                    {promoResult && !promoResult.valid && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <X size={11} className="flex-shrink-0" /> {promoResult.message}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t("orderSummary")}</p>

                {/* Per-item breakdown */}
                <div className="space-y-2 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span className="text-xs text-slate-500 truncate flex-1">
                        {item.title}
                        {!!item.member_discount_percentage && (
                          <span className="text-emerald-600 font-semibold"> · {t("memberPriceSuffix")}</span>
                        )}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 flex-shrink-0">
                        {effectivePrice(item) === 0 ? t("free") : `$${effectivePrice(item).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{t("subtotal")}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                      <span>{t("promoDiscount")}</span>
                      <span>−${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-navy-900 text-xl pt-2 border-t border-slate-100">
                    <span>{t("total")}</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Main CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || !!checkingOutId}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-4 bg-navy-900 hover:bg-navy-700 text-white rounded-2xl font-black text-sm transition-all disabled:opacity-60 shadow-sm"
                >
                  {checkingOut ? (
                    <><Loader2 size={15} className="animate-spin" /> {t("processing")}</>
                  ) : (
                    <>{total === 0 ? t("completeEnrollment") : t("proceedToCheckout")} <ArrowRight size={15} /></>
                  )}
                </button>

                {paidItems.length > 1 && (
                  <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
                    {t("multipleItemsNote")}
                  </p>
                )}
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                {[
                  { icon: Lock,   label: t("trustSsl") },
                  { icon: Shield, label: t("trustVerified") },
                  { icon: Zap,    label: t("trustInstant") },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-xs text-slate-500">
                    <Icon size={13} className="text-emerald-500 flex-shrink-0" />
                    {label}
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

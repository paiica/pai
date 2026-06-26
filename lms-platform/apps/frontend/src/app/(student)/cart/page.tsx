"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  const { items, removeItem, clearCart, updateItemPrice } = useCartStore();

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

  const subtotal   = items.reduce((s, i) => s + i.price, 0);
  const discount   = promoResult?.valid ? promoResult.discount_amount : 0;
  const total      = Math.max(0, subtotal - discount);
  const freeItems  = items.filter(i => i.price === 0);
  const paidItems  = items.filter(i => i.price > 0);

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
      toast.error("Failed to validate promo code");
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
    if (data.enrolled) {
      removeItem(item.id);
      toast.success(`Enrolled in "${item.title}"!`);
      return "enrolled";
    } else if (data.checkout_url) {
      window.location.href = data.checkout_url;
      return "redirected";
    }
    return "done";
  }

  async function handleCheckout() {
    if (!token) { toast.error("Please log in to checkout"); return; }
    setCheckingOut(true);
    try {
      for (const item of freeItems) await doCheckoutItem(item);
      if (paidItems.length > 0)      await doCheckoutItem(paidItems[0]);
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleCheckoutSingle(item: CartItem) {
    if (!token) { toast.error("Please log in to checkout"); return; }
    setCheckingOutId(item.id);
    try {
      await doCheckoutItem(item);
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
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
          <h2 className="text-2xl font-display font-black text-navy-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Browse certifications and courses to start building your AI career.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/certificates" className="btn-primary w-full sm:w-auto justify-center">
              <GraduationCap size={15} /> Browse Certifications
            </Link>
            <Link href="/learn" className="btn-outline w-full sm:w-auto justify-center">
              View Courses
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
              <h1 className="text-xl font-display font-black text-navy-900 leading-none">Your Cart</h1>
              <p className="text-xs text-slate-400 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Link href="/certificates" className="text-xs text-slate-400 hover:text-navy-700 transition-colors flex items-center gap-1">
            Continue shopping
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
                          {item.type === "course" ? "Course" : "Certification"}
                        </span>
                        {item.cert_acronym && (
                          <span className="text-[10px] font-semibold text-slate-400">{item.cert_acronym}</span>
                        )}
                      </div>
                      <p className="font-bold text-navy-900 text-sm leading-snug">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Remove item"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="font-black text-navy-900 text-base">
                      {item.price === 0
                        ? <span className="text-emerald-600 font-bold text-sm">Free</span>
                        : `$${item.price.toFixed(2)}`}
                    </span>
                    <button
                      onClick={() => handleCheckoutSingle(item)}
                      disabled={checkingOut || !!checkingOutId}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50",
                        item.price === 0
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-navy-900 hover:bg-navy-700 text-white"
                      )}
                    >
                      {checkingOutId === item.id && <Loader2 size={11} className="animate-spin" />}
                      {item.price === 0 ? "Enroll Free" : "Buy Now"}
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
                Remove all items
              </button>
            </div>
          </div>

          {/* ── Sticky summary ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">

              {/* Promo code */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Tag size={12} /> Promo Code
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
                  <div className="flex gap-2">
                    <input
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); if (promoResult && !promoResult.valid) setPromoResult(null); }}
                      onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                      placeholder="Enter promo code"
                      className={cn("input-base text-sm flex-1 !py-2", promoResult && !promoResult.valid && "border-red-300 focus:border-red-400")}
                    />
                    <button
                      onClick={validatePromo}
                      disabled={validatingPromo || !promoCode.trim()}
                      className="btn-outline !py-2 !px-4 !text-xs font-bold disabled:opacity-40 flex-shrink-0"
                    >
                      {validatingPromo ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                    </button>
                  </div>
                  {promoResult && !promoResult.valid && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <X size={11} className="flex-shrink-0" /> {promoResult.message}
                    </p>
                  )}
                )}
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Order Summary</p>

                {/* Per-item breakdown */}
                <div className="space-y-2 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span className="text-xs text-slate-500 truncate flex-1">{item.title}</span>
                      <span className="text-xs font-semibold text-slate-700 flex-shrink-0">
                        {item.price === 0 ? "Free" : `$${item.price.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                      <span>Promo discount</span>
                      <span>−${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-navy-900 text-xl pt-2 border-t border-slate-100">
                    <span>Total</span>
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
                    <><Loader2 size={15} className="animate-spin" /> Processing…</>
                  ) : (
                    <>{total === 0 ? "Complete Enrollment" : "Proceed to Checkout"} <ArrowRight size={15} /></>
                  )}
                </button>

                {paidItems.length > 1 && (
                  <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
                    Multiple paid items are processed one at a time. You'll complete a payment for each.
                  </p>
                )}
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                {[
                  { icon: Lock,   label: "Secure SSL checkout" },
                  { icon: Shield, label: "Verified PAI credentials" },
                  { icon: Zap,    label: "Instant access on enrollment" },
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

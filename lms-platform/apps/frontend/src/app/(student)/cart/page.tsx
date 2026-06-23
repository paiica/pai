"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Trash2, Tag, CheckCircle, ArrowRight, X, Loader2, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore, CartItem } from "@/store/cart.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function CartPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { items, removeItem, clearCart } = useCartStore();
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount_amount: number; message: string; promo_id?: string } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const discount = promoResult?.valid ? promoResult.discount_amount : 0;
  const total = Math.max(0, subtotal - discount);

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const res = await fetch(`${API_BASE}/promo-codes/validate/${promoCode.trim()}?subtotal=${subtotal}`);
      const data = await res.json();
      const result = data?.data ?? data;
      setPromoResult(result);
      if (result.valid) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Failed to validate promo code");
    } finally {
      setValidatingPromo(false);
    }
  }

  async function checkoutItem(item: CartItem) {
    if (!token) { toast.error("Please log in to checkout"); return; }
    setCheckingOutId(item.id);
    try {
      const endpoint = item.type === "course" ? "/payments/course-checkout" : "/payments/certification-checkout";
      const body = item.type === "course"
        ? { course_id: item.course_id, promo_code: promoCode.trim() || undefined }
        : { certification_slug: item.slug, promo_code: promoCode.trim() || undefined };

      const res = await api.post<any>(endpoint, body, token) as any;
      const data = res?.data ?? res;
      if (data.enrolled) {
        removeItem(item.id);
        toast.success(`Enrolled in "${item.title}"!`);
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    } finally {
      setCheckingOutId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-display font-black text-navy-900 mb-8">Your Cart</h1>
          <div className="card p-16 text-center">
            <ShoppingCart size={40} className="text-slate-200 mx-auto mb-4" />
            <h3 className="font-display font-bold text-navy-900 mb-2">Your cart is empty</h3>
            <p className="text-slate-400 text-sm mb-6">Browse courses and certifications to get started.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/tools" className="btn-outline">Browse Courses</Link>
              <Link href="/certificates" className="btn-primary">View Certifications</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-black text-navy-900 mb-6">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Item list */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card p-4 flex items-center gap-4">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-navy-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", item.type === "course" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700")}>
                      {item.type === "course" ? "Course" : "Certification"}
                    </span>
                    {item.cert_acronym && <span className="text-[10px] text-slate-400">{item.cert_acronym}</span>}
                  </div>
                  <p className="font-semibold text-navy-900 text-sm truncate">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-black text-navy-900 text-sm">
                    {item.price === 0 ? "Free" : `$${item.price.toFixed(2)}`}
                  </span>
                  <button
                    onClick={() => checkoutItem(item)}
                    disabled={checkingOutId === item.id}
                    className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {checkingOutId === item.id ? <Loader2 size={11} className="animate-spin" /> : null}
                    {item.price === 0 ? "Enroll Free" : "Pay"}
                  </button>
                  <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Promo code */}
            <div className="card p-4">
              <p className="text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2"><Tag size={14} /> Promo Code</p>
              {promoResult?.valid ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle size={12} /> {promoResult.message}
                  </span>
                  <button onClick={() => { setPromoResult(null); setPromoCode(""); }} className="text-emerald-600 hover:text-emerald-800">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                    placeholder="Enter code"
                    className="input-base text-sm flex-1 !py-1.5"
                  />
                  <button
                    onClick={validatePromo}
                    disabled={validatingPromo || !promoCode.trim()}
                    className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-50"
                  >
                    {validatingPromo ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="card p-4 space-y-3">
              <p className="text-sm font-semibold text-navy-900">Order Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Promo discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-navy-900 text-base pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">Each item is checked out individually. Click "Pay" next to each course above.</p>

            <button onClick={() => clearCart()} className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors">
              Clear all items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

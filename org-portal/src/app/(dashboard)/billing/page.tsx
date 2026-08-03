"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CreditCard, Loader2, RefreshCw, Armchair, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import type { OrgBilling } from "@/types";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function BillingContent() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seatCount, setSeatCount] = useState("5");
  const [checkingOut, setCheckingOut] = useState<"seats" | "renew" | null>(null);

  const { data, isLoading, mutate } = useSWR(
    accessToken ? ["/org/billing", accessToken] : null,
    ([url, token]) => api.get<OrgBilling>(url, token),
  );

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Payment received — your organization's billing is updating now.");
      mutate();
      router.replace("/billing");
    }
  }, [searchParams, mutate, router]);

  const pricePerSeat = data?.price_per_seat ? Number(data.price_per_seat) : null;
  const billingEnabled = pricePerSeat !== null;
  const parsedSeatCount = Number(seatCount);
  const seatsTotal = billingEnabled && parsedSeatCount > 0 ? parsedSeatCount * pricePerSeat! : 0;
  const renewalTotal = billingEnabled && data ? data.seats_purchased * pricePerSeat! : 0;

  const daysLeft = daysUntil(data?.subscription_expires_at ?? null);
  const expiryTone = data?.is_expired
    ? { label: "Expired", cls: "bg-red-50 text-red-700 border-red-200" }
    : daysLeft !== null && daysLeft <= 30
    ? { label: `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, cls: "bg-amber-50 text-amber-700 border-amber-200" }
    : data?.subscription_expires_at
    ? { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    : { label: "No expiration set", cls: "bg-slate-50 text-slate-600 border-slate-200" };

  async function handleBuySeats() {
    if (!Number.isInteger(parsedSeatCount) || parsedSeatCount < 1) {
      toast.error("Enter a whole number of seats");
      return;
    }
    setCheckingOut("seats");
    try {
      const res = await api.post<{ checkout_url: string }>("/org/billing/checkout/seats", { seat_count: parsedSeatCount }, accessToken!);
      window.location.href = res.checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to start checkout";
      toast.error(msg);
      setCheckingOut(null);
    }
  }

  async function handleRenew() {
    setCheckingOut("renew");
    try {
      const res = await api.post<{ checkout_url: string }>("/org/billing/checkout/renew", {}, accessToken!);
      window.location.href = res.checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to start checkout";
      toast.error(msg);
      setCheckingOut(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="card h-32 animate-pulse" />
        <div className="card h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-display font-black text-navy-900">Billing</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your organization&apos;s seats and subscription</p>
      </div>

      {/* Current plan */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="font-semibold text-navy-900">Current Plan</p>
          <span className={`badge border ${expiryTone.cls}`}>{expiryTone.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center flex-shrink-0">
              <Armchair size={17} />
            </div>
            <div>
              <p className="text-lg font-display font-black text-navy-900">{data?.seats_used ?? 0} / {data?.seats_purchased ?? 0}</p>
              <p className="text-xs text-slate-500">Seats used</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <CreditCard size={17} />
            </div>
            <div>
              <p className="text-lg font-display font-black text-navy-900">
                {pricePerSeat !== null ? `$${pricePerSeat.toFixed(2)}` : "—"}
              </p>
              <p className="text-xs text-slate-500">Price per seat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <CalendarClock size={17} />
            </div>
            <div>
              <p className="text-sm font-bold text-navy-900">{fmtDate(data?.subscription_expires_at ?? null)}</p>
              <p className="text-xs text-slate-500">Renews / expires</p>
            </div>
          </div>
        </div>
      </div>

      {!billingEnabled ? (
        <div className="card p-6 text-center">
          <p className="font-semibold text-navy-900 mb-1">Self-service billing isn&apos;t enabled yet</p>
          <p className="text-sm text-slate-500">Contact your PAII account manager to add seats or renew your subscription.</p>
        </div>
      ) : (
        <>
          {/* Add seats */}
          <div className="card p-6 space-y-4">
            <p className="font-semibold text-navy-900">Add Seats</p>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Number of seats</label>
                <input
                  type="number"
                  min={1}
                  value={seatCount}
                  onChange={(e) => setSeatCount(e.target.value)}
                  className="input-base w-32"
                />
              </div>
              <p className="text-sm text-slate-500 pb-2.5">
                Total: <span className="font-bold text-navy-900">${seatsTotal.toFixed(2)}</span>
              </p>
            </div>
            <button onClick={handleBuySeats} disabled={checkingOut !== null} className="btn-primary !py-2.5 disabled:opacity-60">
              {checkingOut === "seats" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Proceed to Payment
            </button>
          </div>

          {/* Renew */}
          <div className="card p-6 space-y-4">
            <p className="font-semibold text-navy-900">Renew Subscription</p>
            <p className="text-sm text-slate-500">
              Renews your current {data?.seats_purchased ?? 0} seat(s) for {data?.renewal_period_months ?? 12} months.
              Total: <span className="font-bold text-navy-900">${renewalTotal.toFixed(2)}</span>
            </p>
            <button onClick={handleRenew} disabled={checkingOut !== null} className="btn-outline !py-2.5 disabled:opacity-60">
              {checkingOut === "renew" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Renew Now
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return <Suspense><BillingContent /></Suspense>;
}

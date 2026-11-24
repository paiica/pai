"use client";

import { useState } from "react";
import useSWR from "swr";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Loader2, CreditCard, Check, DollarSign, Settings, Receipt, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Package {
  id: string; name: string; tier: string; monthly_price: string | null;
  student_limit: number | null; professor_limit: number | null; course_limit: number | null; features: string[];
}
interface Subscription {
  id: string; status: "active" | "past_due" | "canceled"; cancel_at_period_end: boolean;
  current_period_end: string | null; package: Package; stripe_subscription_id: string | null;
}
interface Billing {
  subscription: Subscription | null;
  usage: { student_count: number; staff_count: number; course_count: number };
}
interface EarningsTx {
  id: string; sale_amount: string; institution_amount: string; institution_status: "pending" | "paid" | "voided";
  course: { title: string }; created_at: string;
}
interface Earnings {
  transactions: EarningsTx[]; totalEarned: number; totalPending: number; totalPaid: number;
}
interface Invoice {
  id: string; amount: string; currency: string; description: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
  stripe_receipt_url: string | null; succeeded_at: string | null; created_at: string;
}

const stripePromises = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string) {
  if (!stripePromises.has(publishableKey)) {
    stripePromises.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromises.get(publishableKey)!;
}

function limitLabel(n: number | null) {
  return n == null ? "Unlimited" : String(n);
}

const CONTACT_SALES_HREF = "mailto:support@paii.ca?subject=" + encodeURIComponent("PAII Academic Cloud — Enterprise plan inquiry");

function PackageCard({ pkg, isCurrent, loading, disabled, onSelect, ctaLabel }: {
  pkg: Package; isCurrent: boolean; loading: boolean; disabled: boolean; onSelect: () => void; ctaLabel: string;
}) {
  return (
    <div className={`card p-5 flex flex-col ${isCurrent ? "ring-2 ring-teal-500" : ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-wide bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full w-fit mb-2">{pkg.tier}</span>
      <h3 className="font-display font-black text-navy-900 text-lg mb-1">{pkg.name}</h3>
      <p className="text-2xl font-display font-black text-navy-900 mb-4">
        {pkg.monthly_price != null ? `$${Number(pkg.monthly_price).toFixed(0)}/mo` : "Contact us"}
      </p>
      <ul className="space-y-1.5 text-sm text-slate-600 mb-5 flex-1">
        <li>{limitLabel(pkg.student_limit)} students</li>
        <li>{limitLabel(pkg.professor_limit)} professors</li>
        <li>{limitLabel(pkg.course_limit)} courses</li>
        {pkg.features.map((f) => (
          <li key={f} className="flex items-center gap-1.5"><Check size={12} className="text-emerald-600" /> {f.replace(/_/g, " ")}</li>
        ))}
      </ul>
      {isCurrent ? (
        <span className="btn-outline !py-2 !text-xs w-full justify-center opacity-60 cursor-default">Current plan</span>
      ) : pkg.monthly_price == null ? (
        <a href={CONTACT_SALES_HREF} className="btn-primary !py-2 !text-xs w-full justify-center">
          Contact sales
        </a>
      ) : (
        <button
          onClick={onSelect}
          disabled={disabled}
          className="btn-primary !py-2 !text-xs w-full justify-center disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span>{used} / {limitLabel(limit)}</span>
      </div>
      {limit != null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { accessToken, currentInstitutionId } = useAuthStore();
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [updatingSub, setUpdatingSub] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ packageId: string; packageName: string; amountDue: number } | null>(null);

  const { data: billing, isLoading, mutate } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/billing`, accessToken] : null,
    ([url, token]) => api.get<Billing>(url, token),
  );

  const { data: packages } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/available-packages`, accessToken] : null,
    ([url, token]) => api.get<Package[]>(url, token),
  );

  const { data: earnings } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/revenue`, accessToken] : null,
    ([url, token]) => api.get<Earnings>(url, token),
  );

  const { data: invoices } = useSWR(
    accessToken && currentInstitutionId ? [`/institutions/${currentInstitutionId}/invoices`, accessToken] : null,
    ([url, token]) => api.get<Invoice[]>(url, token),
  );

  async function subscribe(packageId: string) {
    setSubscribing(packageId);
    try {
      const res: any = await api.post<any>(`/payments/institutions/${currentInstitutionId}/subscribe`, { package_id: packageId }, accessToken!);
      const data = res.data ?? res;
      if (data?.client_secret && data?.publishable_key) {
        setCheckout({ clientSecret: data.client_secret, publishableKey: data.publishable_key });
      } else {
        throw new Error("Failed to start checkout");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start checkout");
    } finally {
      setSubscribing(null);
    }
  }

  async function openChangePlanConfirm(pkg: Package) {
    setLoadingPreview(pkg.id);
    try {
      const res: any = await api.get<any>(`/payments/institutions/${currentInstitutionId}/subscription/preview?package_id=${pkg.id}`, accessToken!);
      const previewData = res.data ?? res;
      setConfirmModal({ packageId: pkg.id, packageName: pkg.name, amountDue: previewData.amount_due });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to preview plan change");
    } finally {
      setLoadingPreview(null);
    }
  }

  async function commitChangePlan() {
    if (!confirmModal) return;
    setChangingPlan(confirmModal.packageId);
    try {
      await api.post(`/payments/institutions/${currentInstitutionId}/subscription/change`, { package_id: confirmModal.packageId }, accessToken!);
      toast.success("Plan changed");
      setConfirmModal(null);
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to change plan");
    } finally {
      setChangingPlan(null);
    }
  }

  async function cancelSubscription() {
    if (!confirm("Stop auto-renewal? Your institution keeps access until the end of the current billing period.")) return;
    setUpdatingSub(true);
    try {
      await api.post(`/payments/institutions/${currentInstitutionId}/subscription/cancel`, {}, accessToken!);
      toast.success("Auto-renewal turned off");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to cancel");
    } finally { setUpdatingSub(false); }
  }

  async function resumeSubscription() {
    setUpdatingSub(true);
    try {
      await api.post(`/payments/institutions/${currentInstitutionId}/subscription/resume`, {}, accessToken!);
      toast.success("Auto-renewal resumed");
      mutate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to resume");
    } finally { setUpdatingSub(false); }
  }

  async function openBillingPortal() {
    setOpeningPortal(true);
    try {
      const res: any = await api.post<any>(`/payments/institutions/${currentInstitutionId}/billing-portal`, {}, accessToken!);
      const data = res.data ?? res;
      if (!data?.portal_url) throw new Error("Failed to open billing portal");
      window.location.href = data.portal_url;
    } catch (e: any) {
      toast.error(e.message ?? "Failed to open billing portal");
      setOpeningPortal(false);
    }
  }

  if (isLoading || !billing) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={28} /></div>;
  }

  // A subscription can exist without ever having gone through Stripe (e.g. a
  // free/staff-granted plan) — there's no real Stripe subscription to modify
  // in place for those, so they upgrade via checkout just like an
  // institution with no subscription at all, rather than the in-place
  // "Change Plan" switch (which requires an existing Stripe subscription).
  const hasStripeSubscription = !!billing.subscription?.stripe_subscription_id;
  const currentPackageId = billing.subscription?.package.id ?? null;

  if (checkout) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl">
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-navy-900 text-white text-sm font-semibold flex items-center gap-2">
            <CreditCard size={15} /> Subscribe — billed monthly, cancel anytime
          </div>
          <EmbeddedCheckoutProvider stripe={getStripe(checkout.publishableKey)} options={{ clientSecret: checkout.clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      {billing.subscription ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display font-black text-navy-900 text-lg">{billing.subscription.package.name} Plan</p>
              <p className="text-sm text-slate-500">
                {billing.subscription.package.monthly_price != null ? `$${Number(billing.subscription.package.monthly_price).toFixed(0)}/month` : "Custom pricing"}
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${billing.subscription.status === "active" ? "bg-emerald-50 text-emerald-700" : billing.subscription.status === "past_due" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
              {billing.subscription.status}
            </span>
          </div>

          {billing.subscription.current_period_end && (
            <p className="text-xs text-slate-400 mb-5">
              {billing.subscription.cancel_at_period_end ? "Cancels" : "Renews"} on {formatDate(billing.subscription.current_period_end)}
            </p>
          )}

          {billing.subscription.status === "past_due" && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-semibold">Your last payment failed</p>
                <p className="text-xs text-amber-700 mt-0.5">Update your payment method to avoid losing access.</p>
                <button
                  onClick={openBillingPortal}
                  disabled={openingPortal}
                  className="btn-primary !bg-amber-600 hover:!bg-amber-700 !py-1.5 !px-3 !text-xs mt-2 disabled:opacity-60"
                >
                  {openingPortal ? <Loader2 size={12} className="animate-spin" /> : null}
                  Update payment method
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-5">
            <UsageBar label="Students" used={billing.usage.student_count} limit={billing.subscription.package.student_limit} />
            <UsageBar label="Professors" used={billing.usage.staff_count} limit={billing.subscription.package.professor_limit} />
            <UsageBar label="Courses" used={billing.usage.course_count} limit={billing.subscription.package.course_limit} />
          </div>

          {billing.subscription.stripe_subscription_id && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openBillingPortal}
                disabled={openingPortal}
                className="btn-outline !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5"
              >
                {openingPortal ? <Loader2 size={12} className="animate-spin" /> : <Settings size={12} />}
                Manage billing
              </button>
              <button
                onClick={billing.subscription.cancel_at_period_end ? resumeSubscription : cancelSubscription}
                disabled={updatingSub}
                className="btn-outline !py-2 !px-4 !text-xs disabled:opacity-60"
              >
                {updatingSub ? <Loader2 size={12} className="animate-spin" /> : null}
                {billing.subscription.cancel_at_period_end ? "Resume auto-renewal" : "Cancel auto-renewal"}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {hasStripeSubscription && packages && packages.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="font-display font-black text-navy-900 text-base">Change Plan</p>
            <p className="text-xs text-slate-400">Switching takes effect immediately — you're charged or credited a prorated difference right away.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isCurrent={pkg.id === currentPackageId}
                loading={changingPlan === pkg.id || loadingPreview === pkg.id}
                disabled={changingPlan !== null || loadingPreview !== null}
                onSelect={() => openChangePlanConfirm(pkg)}
                ctaLabel="Switch to this plan"
              />
            ))}
          </div>
        </div>
      )}

      {!hasStripeSubscription && (
        <>
          {!billing.subscription ? (
            <div className="card p-5 bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800 font-semibold">No active subscription</p>
              <p className="text-xs text-amber-700 mt-1">Subscribe to a package to invite professors and create institution courses.</p>
            </div>
          ) : (
            <div className="card p-5 bg-teal-50 border-teal-100">
              <p className="text-sm text-teal-800 font-semibold">You're on the {billing.subscription.package.name} plan</p>
              <p className="text-xs text-teal-700 mt-1">Upgrade below for more capacity — billed through Stripe once you subscribe.</p>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            {(packages ?? []).map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isCurrent={pkg.id === currentPackageId}
                loading={subscribing === pkg.id}
                disabled={subscribing !== null}
                onSelect={() => subscribe(pkg.id)}
                ctaLabel="Subscribe"
              />
            ))}
          </div>
        </>
      )}

      {invoices && invoices.length > 0 && (
        <div className="card p-5">
          <p className="font-display font-black text-navy-900 text-lg mb-1 flex items-center gap-2">
            <Receipt size={18} className="text-teal-600" /> Billing History
          </p>
          <p className="text-xs text-slate-400 mb-4">Invoices and receipts for this institution's subscription</p>
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="text-navy-900 truncate">{inv.description ?? "Institution subscription"}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.succeeded_at ?? inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-navy-900">${Number(inv.amount).toFixed(2)}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inv.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : inv.status === "failed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    {inv.status}
                  </span>
                  {inv.stripe_receipt_url && (
                    <a href={inv.stripe_receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 font-semibold hover:underline">
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {earnings && earnings.transactions.length > 0 && (
        <div className="card p-5">
          <p className="font-display font-black text-navy-900 text-lg mb-1 flex items-center gap-2">
            <DollarSign size={18} className="text-teal-600" /> Course Sales Revenue
          </p>
          <p className="text-xs text-slate-400 mb-4">Your institution's share of public paid course sales</p>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-xl font-display font-black text-navy-900">${earnings.totalEarned.toFixed(2)}</p>
              <p className="text-xs text-slate-400">Total earned</p>
            </div>
            <div>
              <p className="text-xl font-display font-black text-amber-600">${earnings.totalPending.toFixed(2)}</p>
              <p className="text-xs text-slate-400">Pending payout</p>
            </div>
            <div>
              <p className="text-xl font-display font-black text-emerald-600">${earnings.totalPaid.toFixed(2)}</p>
              <p className="text-xs text-slate-400">Paid out</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {earnings.transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="text-navy-900">{tx.course.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900">${Number(tx.institution_amount).toFixed(2)}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tx.institution_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {tx.institution_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="font-display font-black text-navy-900 text-lg mb-2">Switch to {confirmModal.packageName}?</p>
            <p className="text-sm text-slate-600 mb-1">
              {confirmModal.amountDue >= 0
                ? <>You'll be charged <span className="font-semibold text-navy-900">${confirmModal.amountDue.toFixed(2)}</span> right now for the prorated difference.</>
                : <>You'll receive a <span className="font-semibold text-navy-900">${Math.abs(confirmModal.amountDue).toFixed(2)}</span> credit toward your next invoice.</>}
            </p>
            <p className="text-xs text-slate-400 mb-5">This takes effect immediately.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal(null)} className="btn-outline !py-2 !px-4 !text-xs flex-1 justify-center">Cancel</button>
              <button onClick={commitChangePlan} disabled={changingPlan !== null} className="btn-primary !py-2 !px-4 !text-xs flex-1 justify-center disabled:opacity-60 flex items-center gap-1.5">
                {changingPlan !== null ? <Loader2 size={12} className="animate-spin" /> : null} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

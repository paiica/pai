"use client";

import { Clock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function PendingApprovalPage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Clock size={30} className="text-amber-600" />
      </div>
      <h2 className="text-xl font-display font-black text-navy-900 mb-2">Application Under Review</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">
        Your affiliate application is being reviewed by our team. You&apos;ll receive an email notification once your account is approved — typically within 1–2 business days.
      </p>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 mb-6 text-left space-y-1">
        <p className="font-semibold">What happens next?</p>
        <p>1. Our team reviews your profile</p>
        <p>2. You receive an approval email</p>
        <p>3. Sign in and start earning!</p>
      </div>
      <button onClick={handleLogout} className="btn-outline w-full justify-center text-red-600 border-red-200 hover:bg-red-50">
        <LogOut size={14} /> Sign Out
      </button>
    </div>
  );
}

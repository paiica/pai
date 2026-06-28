"use client";

import { useState } from "react";
import { User, Lock, CreditCard, Copy } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import CopyButton from "@/components/ui/CopyButton";
import { buildReferralLink } from "@/lib/utils";
import toast from "react-hot-toast";

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 bg-navy-50 rounded-lg flex items-center justify-center">
        <Icon size={14} className="text-navy-700" />
      </div>
      <h2 className="font-semibold text-navy-900">{title}</h2>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [payoutForm, setPayoutForm] = useState({
    payout_method: user?.payout_method ?? "",
    payout_details: user?.payout_details ?? "",
  });
  const [savingPayout, setSavingPayout] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [savingPw, setSavingPw] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.patch<typeof user>("/affiliate/profile", profileForm);
      setUser(updated as typeof user);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePayoutSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingPayout(true);
    try {
      await api.patch("/affiliate/profile/payout", payoutForm);
      toast.success("Payout info updated!");
    } catch {
      toast.error("Failed to update payout info.");
    } finally {
      setSavingPayout(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/affiliate/profile/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success("Password changed!");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch {
      toast.error("Failed to change password. Check your current password.");
    } finally {
      setSavingPw(false);
    }
  }

  const referralLink = buildReferralLink("", user?.referral_code ?? "");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-5">
        <SectionHeader icon={User} title="Personal Information" />

        <div className="mb-5 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center font-bold text-base">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="badge bg-gold-50 text-gold-700 mt-0.5">{user?.commission_rate ?? 0}% commission rate</span>
          </div>
        </div>

        <div className="mb-5 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Referral Code</p>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
            <Copy size={13} className="text-slate-400" />
            <span className="font-mono font-bold text-navy-900 tracking-widest">{user?.referral_code}</span>
            <CopyButton text={referralLink} label="Copy Link" size="xs" />
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label">First Name</label>
              <input className="input-base" value={profileForm.first_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="section-label">Last Name</label>
              <input className="input-base" value={profileForm.last_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="section-label">Phone</label>
            <input className="input-base" type="tel" value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="section-label">Email</label>
            <input value={user?.email ?? ""} disabled
              className="input-base opacity-60 cursor-not-allowed" />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <SectionHeader icon={CreditCard} title="Payout Information" />
        <form onSubmit={handlePayoutSave} className="space-y-3">
          <div>
            <label className="section-label">Payout Method</label>
            <select className="input-base" value={payoutForm.payout_method}
              onChange={(e) => setPayoutForm((f) => ({ ...f, payout_method: e.target.value }))}>
              <option value="">Select method…</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="cheque">Cheque</option>
              <option value="interac">Interac e-Transfer</option>
            </select>
          </div>
          <div>
            <label className="section-label">Payout Details</label>
            <textarea
              className="input-base"
              rows={3}
              placeholder="Bank account number, PayPal email, or mailing address…"
              value={payoutForm.payout_details}
              onChange={(e) => setPayoutForm((f) => ({ ...f, payout_details: e.target.value }))}
            />
          </div>
          <button type="submit" disabled={savingPayout} className="btn-primary">
            {savingPayout ? "Saving…" : "Save Payout Info"}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <SectionHeader icon={Lock} title="Change Password" />
        <form onSubmit={handlePasswordSave} className="space-y-3">
          <div>
            <label className="section-label">Current Password</label>
            <input type="password" className="input-base" required value={pwForm.current_password}
              onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))} />
          </div>
          <div>
            <label className="section-label">New Password</label>
            <input type="password" className="input-base" required minLength={8} value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} />
          </div>
          <div>
            <label className="section-label">Confirm New Password</label>
            <input type="password" className="input-base" required value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))} />
          </div>
          <button type="submit" disabled={savingPw} className="btn-primary">
            {savingPw ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

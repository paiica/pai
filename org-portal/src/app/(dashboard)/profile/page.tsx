"use client";

import { useAuthStore } from "@/store/auth.store";

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="p-6 lg:p-8 max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-display font-black text-navy-900">Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your organization admin account</p>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Name</p>
          <p className="text-sm text-navy-900">{user?.first_name} {user?.last_name}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</p>
          <p className="text-sm text-navy-900">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Organization</p>
          <p className="text-sm text-navy-900">{user?.organization_name}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        To update your organization&apos;s seats, name, or billing details, contact your PAII account manager.
      </p>
    </div>
  );
}

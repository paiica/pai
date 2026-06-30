"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, _hasHydrated, fetchMe } = useAuthStore();
  const [syncDone, setSyncDone] = useState(false);
  const syncInitiated = useRef(false);

  // Fetch fresh user from server before evaluating auth state (in case localStorage is stale)
  useEffect(() => {
    if (!_hasHydrated || syncInitiated.current) return;
    syncInitiated.current = true;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    fetchMe().finally(() => setSyncDone(true));
  }, [_hasHydrated, accessToken, router, fetchMe]);

  // Redirect based on fresh user status after sync
  useEffect(() => {
    if (!syncDone) return;
    if (!user) { router.replace("/login"); return; }
    if (user.status === "pending") { router.replace("/pending-approval"); return; }
    if (user.status === "suspended") { router.replace("/login"); }
  }, [syncDone, user, router]);

  if (!syncDone || !user || user.status !== "approved") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-navy-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

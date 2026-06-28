"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    if (user.status === "pending") {
      router.replace("/pending-approval");
      return;
    }
    if (user.status === "suspended") {
      router.replace("/login");
    }
  }, [_hasHydrated, accessToken, user, router]);

  if (!_hasHydrated || !user || user.status !== "approved") {
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

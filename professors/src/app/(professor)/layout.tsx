"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfSidebar } from "@/components/layout/ProfSidebar";
import { useAuthStore } from "@/store/auth.store";

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, _hasHydrated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!accessToken) { router.replace("/login"); return; }
    fetchMe();
  }, [_hasHydrated, accessToken, router, fetchMe]);

  if (!_hasHydrated || !accessToken) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ProfSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

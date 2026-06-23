"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfSidebar } from "@/components/layout/ProfSidebar";
import { useAuthStore } from "@/store/auth.store";

export default function ProfessorsLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      fetchMe().catch(() => router.push("/login"));
    }
  }, [hasHydrated, user, fetchMe, router]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (user && user.role === "student") {
      router.push("/dashboard");
    }
  }, [hasHydrated, user, router]);

  if (!hasHydrated || !user) return null;
  if (user.role === "student") return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ProfSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

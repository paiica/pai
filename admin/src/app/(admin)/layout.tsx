"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { useAuthStore } from "@/store/auth.store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, _hasHydrated, fetchMe, user } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!accessToken) { router.replace("/login"); return; }
    fetchMe();
  }, [_hasHydrated, accessToken, router, fetchMe]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin" && user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!_hasHydrated || !accessToken) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.role !== "admin" && user.role !== "super_admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

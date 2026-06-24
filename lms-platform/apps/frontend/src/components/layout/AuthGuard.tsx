"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.replace("/login");
    }
  }, [_hasHydrated, user]);

  if (!_hasHydrated) return null;
  if (!user) return null;

  return <>{children}</>;
}

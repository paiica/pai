"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("No exam link token found in URL."); return; }

    api.post<any>("/auth/verify-exam-link", { link_token: token })
      .then((res) => {
        const data = res?.data ?? res;
        setSession(data.access_token, data.user);
        router.replace(`/exam/${data.attempt_id}`);
      })
      .catch((e) => setError(e?.message ?? "Your exam link is invalid or not yet active."));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-900/40 border border-red-700">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white mb-2">Cannot enter exam</h1>
            <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
          </div>
          <p className="text-xs text-slate-500">
            If your exam has not started yet, wait until the scheduled time and try the link again.<br />
            Contact your administrator if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700">
          <Shield size={28} className="text-slate-300" />
        </div>
        <div>
          <Loader2 size={24} className="animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-300 text-sm">Verifying your exam link…</p>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}

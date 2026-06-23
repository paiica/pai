"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ScheduleRedirect() {
  const { certId } = useParams<{ certId: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/certificates/${certId}#schedule`); }, [certId, router]);
  return null;
}

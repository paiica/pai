"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfessorsIndexPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/professors/dashboard"); }, [router]);
  return null;
}

"use client";

import { useEffect } from "react";
import { captureRefFromUrl } from "@/lib/referral";

export default function ReferralCapture() {
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  return null;
}

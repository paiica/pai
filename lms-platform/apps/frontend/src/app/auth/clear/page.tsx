"use client";

import { useEffect } from "react";

// Loaded in a hidden iframe by the marketing site to clear the LMS session
// across origins. Removes localStorage and fires a storage event so any
// open student-portal tabs receive it and auto-logout via the store listener.
export default function ClearPage() {
  useEffect(() => {
    localStorage.removeItem("pai-auth");
  }, []);

  return null;
}

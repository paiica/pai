"use client";

import { useEffect, useState } from "react";

// Content zoom for the course player — scales the actual lesson content
// (text and images alike, since it's a CSS transform rather than a
// font-size change) independent of the surrounding chrome, for students
// who find the default size hard to read. Persisted across lessons/
// sessions since it's a reading preference, not a per-lesson setting.
const STORAGE_KEY = "pv-content-zoom";
const MIN = 75;
const MAX = 200;
const STEP = 25;

export function useContentZoom() {
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (stored >= MIN && stored <= MAX) setZoomLevel(stored);
  }, []);

  function set(next: number) {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    setZoomLevel(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }

  return {
    zoomLevel,
    min: MIN,
    max: MAX,
    zoomIn: () => set(zoomLevel + STEP),
    zoomOut: () => set(zoomLevel - STEP),
    reset: () => set(100),
  };
}

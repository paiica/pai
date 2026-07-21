"use client";

import { ZoomIn, ZoomOut } from "lucide-react";

export default function ContentZoomControl({
  zoomLevel,
  min,
  max,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoomLevel: number;
  min: number;
  max: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5" title="Zoom lesson content">
      <button
        onClick={onZoomOut}
        disabled={zoomLevel <= min}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Zoom out"
      >
        <ZoomOut size={15} />
      </button>
      <button
        onClick={onReset}
        className="text-white/50 hover:text-white text-[11px] font-medium w-9 text-center transition-colors"
        title="Reset zoom to 100%"
      >
        {zoomLevel}%
      </button>
      <button
        onClick={onZoomIn}
        disabled={zoomLevel >= max}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Zoom in"
      >
        <ZoomIn size={15} />
      </button>
    </div>
  );
}

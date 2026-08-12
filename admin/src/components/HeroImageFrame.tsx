"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, Image as ImageIcon, Upload, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared with the homepage hero/logo-strip editors (design/blocks/page.tsx) —
// extracted here so the per-page Hero CMS (admin/pages/[id]) can reuse the
// exact same upload + drag-to-position + zoom UI instead of duplicating it.

// Cleans up the replaced file in R2 once a new upload has taken its place —
// otherwise the old object just orphans there forever, since uploadLocal
// never creates an UploadedFile row to track it. Fire-and-forget: this is
// best-effort cleanup, not something that should block or fail the upload
// the user is actually waiting on. No-ops silently if there was no old URL
// (a fresh field) or if it wasn't one of our own uploads (e.g. a pasted
// external URL) — the backend already handles both cases safely.
export function deleteOldUpload(oldUrl: string | undefined, token: string) {
  if (!oldUrl) return;
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  fetch(`${API}/uploads/delete-by-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: oldUrl }),
  }).catch(() => {});
}

export async function uploadHeroImage(file: File, token: string, purpose = "hero"): Promise<string | null> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API}/uploads/local?purpose=${purpose}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.url ?? data?.data?.url) || null;
  } catch {
    return null;
  }
}

export function FocalFrame({ imageUrl, position, zoom = 100, onChange, className, markerSize = 16 }: {
  imageUrl: string; position: string; zoom?: number; onChange: (pos: string) => void; className?: string; markerSize?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [px, py] = (position || "50% 50%").split(" ");
  const [dragging, setDragging] = useState(false);
  // Anchored to where the drag started, not read fresh on every move — CSS
  // background-position is an anchor-point definition ("this % of the image
  // lines up with this % of the frame"), so mapping cursor position directly
  // to it makes the image pan opposite to the hand (drag right → more of the
  // image's right side comes into view, i.e. the photo appears to slide
  // left). Tracking the pointer's movement *delta* from drag-start and
  // subtracting it instead makes the image follow the hand like actually
  // grabbing and dragging a photo.
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: parseFloat(px), posY: parseFloat(py) };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1 || !dragStart.current) return; // only while dragging (primary button/touch held)
    const rect = frameRef.current!.getBoundingClientRect();
    const dxPercent = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dyPercent = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    const x = Math.max(0, Math.min(100, Math.round(dragStart.current.posX - dxPercent)));
    const y = Math.max(0, Math.min(100, Math.round(dragStart.current.posY - dyPercent)));
    onChange(`${x}% ${y}%`);
  }

  function handlePointerUp() {
    setDragging(false);
    dragStart.current = null;
  }

  return (
    <div
      ref={frameRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        "relative w-full overflow-hidden border border-slate-200 bg-slate-100 touch-none select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
    >
      {/* The frame itself (drag hit-area) never transforms — only this inner
          layer scales, so pointer math above (based on the frame's own,
          unscaled bounding box) stays correct at any zoom level. `cover`
          matches the live site's full-bleed hero — position/zoom are what let
          you choose what stays in frame as it crops to fill, anchored at the
          focal point so zooming doesn't fight the position. */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url("${imageUrl}")`,
          backgroundPosition: position || "50% 50%",
          transform: `scale(${zoom / 100})`,
          transformOrigin: position || "50% 50%",
        }}
      />
      <div
        className="absolute rounded-full border-2 border-white bg-navy-700 shadow-md pointer-events-none"
        style={{ left: px, top: py, width: markerSize, height: markerSize, marginLeft: -markerSize / 2, marginTop: -markerSize / 2 }}
      />
    </div>
  );
}

// Facebook-cover-photo-style: the same large frame is both the upload target
// (click or drop a file directly onto it when empty) and the drag-to-position
// editor (once an image is set) — no separate small thumbnail plus a
// disconnected big preview to keep in sync.
export function HeroImageFrame({ imageUrl, position, zoom, uploading, onUpload, onPositionChange, onZoomChange, aspectClassName = "aspect-[1920/775]", expandedMaxWidth = "max-w-5xl" }: {
  imageUrl: string; position: string; zoom: number; uploading: boolean;
  onUpload: (file: File) => void; onPositionChange: (pos: string) => void; onZoomChange: (zoom: number) => void;
  aspectClassName?: string; expandedMaxWidth?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isDefault = position === "50% 50%" && zoom === 100;

  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setExpanded(false); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function reset() {
    onPositionChange("50% 50%");
    onZoomChange(100);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  }

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploading}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onUpload(file);
      }}
    />
  );

  const zoomSlider = (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-slate-400 w-8">Zoom</span>
      <input type="range" min={100} max={200} step={5} value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className="flex-1 accent-navy-700" />
      <span className="text-[10px] font-mono text-slate-400 w-9 text-right">{zoom}%</span>
    </div>
  );

  if (!imageUrl) {
    return (
      <div className="space-y-1.5">
        {fileInput}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
            aspectClassName,
            dragOver ? "border-navy-400 bg-navy-50" : "border-slate-200 hover:border-navy-300 bg-slate-50"
          )}
        >
          {uploading ? <Loader2 size={22} className="animate-spin text-blue-500" /> : (
            <>
              <ImageIcon size={22} className="text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">Click or drop an image here</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {fileInput}
      <div className="relative">
        <FocalFrame imageUrl={imageUrl} position={position} zoom={zoom} onChange={onPositionChange} className={cn(aspectClassName, "rounded-xl")} />
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Replace image"
            disabled={uploading}
            className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="Expand to full screen width"
            className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
      {zoomSlider}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">Click and drag the photo like you're moving it by hand — this frame matches the real hero shape.</p>
        {!isDefault && (
          <button type="button" onClick={reset} className="text-[11px] font-semibold text-navy-600 hover:text-navy-800 flex-shrink-0 ml-2">
            Reset
          </button>
        )}
      </div>

      {expanded && createPortal(
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-6 sm:p-12" onClick={() => setExpanded(false)}>
          <div className={cn("w-full space-y-3", expandedMaxWidth)} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/70">Click and drag the photo to reposition it</p>
              <div className="flex items-center gap-2">
                {!isDefault && (
                  <button type="button" onClick={reset} className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                    Reset
                  </button>
                )}
                <button type="button" onClick={() => setExpanded(false)} className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <FocalFrame imageUrl={imageUrl} position={position} zoom={zoom} onChange={onPositionChange} className={cn(aspectClassName, "rounded-xl")} markerSize={20} />
            <div className="bg-black/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-white/70 w-10">Zoom</span>
                <input
                  type="range"
                  min={100}
                  max={200}
                  step={5}
                  value={zoom}
                  onChange={(e) => onZoomChange(Number(e.target.value))}
                  className="flex-1 accent-teal-400"
                />
                <span className="text-[11px] font-mono text-white/70 w-9 text-right">{zoom}%</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

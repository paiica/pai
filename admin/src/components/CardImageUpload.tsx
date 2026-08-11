"use client";

import { useRef, useState } from "react";
import { Loader2, Image as ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple click/drag-to-upload image box with replace/remove — used for
// catalog card thumbnails (Programs, Certifications, Courses). Deliberately
// lighter than HeroImageFrame — no focal point/zoom, since these are small
// fixed-crop card headers, not full-bleed heroes.
export default function CardImageUpload({ imageUrl, uploading, onUpload, onRemove, aspectClassName = "aspect-[400/120]" }: {
  imageUrl: string; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void; aspectClassName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <div className="space-y-1.5">
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
      {!imageUrl ? (
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
          {uploading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : (
            <>
              <ImageIcon size={20} className="text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">Click or drop an image here</p>
            </>
          )}
        </div>
      ) : (
        <div className={cn("relative w-full rounded-xl overflow-hidden border border-slate-200", aspectClassName)}>
          <img src={imageUrl} alt="Card preview" className="w-full h-full object-cover" />
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
              onClick={onRemove}
              title="Remove image"
              className="p-1.5 rounded-md bg-black/50 text-white hover:bg-red-600 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Speaker = { id: string; name: string; title: string; company: string; bio: string; photo_url: string };

export default function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const [open, setOpen] = useState(false);
  const hasBio = !!speaker.bio?.trim();

  return (
    <button
      type="button"
      onClick={() => hasBio && setOpen((o) => !o)}
      className={`flex gap-5 p-6 rounded-2xl border border-sand-200 bg-white text-left w-full transition-colors ${
        hasBio ? "hover:border-teal-300 cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="w-32 h-32 rounded-full bg-sand-100 overflow-hidden flex-shrink-0">
        {speaker.photo_url && <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-bold text-ink-900 text-lg leading-snug">{speaker.name}</p>
            <p className="text-sm text-sand-500 mb-2">
              {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
            </p>
          </div>
          {hasBio && (
            <ChevronDown size={16} className={`shrink-0 text-sand-400 transition-transform mt-1.5 ${open ? "rotate-180" : ""}`} />
          )}
        </div>
        {speaker.bio && (
          <p className={`text-sm text-ink-500 leading-relaxed ${open ? "" : "line-clamp-2"}`}>
            {speaker.bio}
          </p>
        )}
      </div>
    </button>
  );
}

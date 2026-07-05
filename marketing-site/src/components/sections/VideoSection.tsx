"use client";

import { useState } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
  return null;
}

type VideoItem = { url: string; label?: string; description?: string };

function VideoCard({ item, index }: { item: VideoItem | null; index: number }) {
  const embedUrl = item ? getEmbedUrl(item.url) : null;
  const isDirect = embedUrl?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-[0_12px_50px_rgba(0,0,0,0.5)]">
        {embedUrl ? (
          isDirect ? (
            <video key={`d-${index}`} src={embedUrl} controls className="absolute inset-0 w-full h-full" />
          ) : (
            <iframe
              key={`e-${index}`}
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={item?.label || "PAII Video"}
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Play size={20} className="text-white/30 ml-0.5" />
            </div>
            <p className="text-white/25 text-xs font-medium">No video set</p>
          </div>
        )}
      </div>
      {item?.label && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 rounded-full bg-teal-500 flex-shrink-0" />
          <p className="text-white/80 text-sm font-semibold">{item.label}</p>
        </div>
      )}
      {item?.description && (
        <p className="text-white/50 text-xs leading-relaxed px-1">{item.description}</p>
      )}
    </div>
  );
}

export default function VideoSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const title    = cmsContent.title    || "See PAII in Action";
  const subtitle = cmsContent.subtitle || "Discover how PAII certifications are transforming careers and organizations across industries.";

  const videos: VideoItem[] = Array.isArray(cmsContent.videos) && cmsContent.videos.length
    ? cmsContent.videos
    : cmsContent.video_url
      ? [{ url: cmsContent.video_url as string }]
      : [];

  const activeVideos = videos.filter((v) => v.url?.trim());
  const total = activeVideos.length;

  const [pairIndex, setPairIndex] = useState(0);

  if (total === 0) return null;

  const leftVideo  = activeVideos[pairIndex % Math.max(total, 1)] ?? null;
  const rightVideo = total > 1 ? activeVideos[(pairIndex + 1) % total] ?? null : null;

  function prev() { setPairIndex((i) => (i - 1 + total) % total); }
  function next() { setPairIndex((i) => (i + 1) % total); }

  return (
    <section className="py-20 bg-ink-900 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_1fr] gap-4 lg:gap-5 items-center">

          {/* Left video — always 1fr */}
          <VideoCard item={leftVideo} index={pairIndex} />

          {/* Middle text */}
          <div className="flex flex-col items-center text-center gap-5 py-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest">
              <Play size={9} className="fill-white" /> Featured
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight">
              {title}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {subtitle}
            </p>

            {total > 2 && (
              <div className="flex items-center gap-3 mt-2">
                <button onClick={prev} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex gap-1.5">
                  {activeVideos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPairIndex(i)}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width:           i === pairIndex ? 18 : 7,
                        height:          7,
                        backgroundColor: i === pairIndex ? "#14b8a6" : "rgba(255,255,255,0.25)",
                      }}
                    />
                  ))}
                </div>
                <button onClick={next} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Right video — always 1fr, same grid column as left */}
          <VideoCard item={rightVideo} index={(pairIndex + 1) % Math.max(total, 1)} />

        </div>
      </div>
    </section>
  );
}

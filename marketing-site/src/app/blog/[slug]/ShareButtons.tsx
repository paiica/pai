"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

function XIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const xUrl        = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="space-y-2">
      <button onClick={copyLink} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-semibold text-ink-900 hover:bg-sand-50 rounded-lg transition-colors border border-sand-200">
        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-semibold text-ink-900 hover:bg-sand-50 rounded-lg transition-colors border border-sand-200">
        <XIcon /> Share on X
      </a>
      <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-semibold text-ink-900 hover:bg-sand-50 rounded-lg transition-colors border border-sand-200">
        <LinkedInIcon /> Share on LinkedIn
      </a>
    </div>
  );
}

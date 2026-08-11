"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 bg-ink-900 hover:bg-ink-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors print:hidden"
    >
      <Printer size={13} /> Print Transcript
    </button>
  );
}

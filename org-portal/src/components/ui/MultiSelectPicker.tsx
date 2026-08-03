"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Checkbox-grid multi-select — ported from the same pattern built for promo
// codes in the admin app (and, before that, admin tab permissions). Copied
// rather than shared since org-portal is a separate deployed app with no
// shared component package.
export function MultiSelectPicker({ label, items, selected, onChange, getLabel, getId }: {
  label: string;
  items: any[];
  selected: string[];
  onChange: (ids: string[]) => void;
  getLabel: (item: any) => string;
  getId: (item: any) => string;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  function selectAll() { onChange(items.map(getId)); }
  function clearAll() { onChange([]); }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={selectAll} className="text-xs text-navy-600 hover:underline">All</button>
            <span className="text-xs text-slate-300">|</span>
            <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:underline">None</button>
          </div>
        )}
      </div>
      <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto p-1.5 space-y-0.5">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 px-2 py-1.5">None available</p>
        ) : items.map((item) => {
          const id = getId(item);
          const isSelected = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors",
                isSelected ? "bg-navy-50 text-navy-900" : "hover:bg-slate-50 text-slate-600"
              )}
            >
              <span className={cn(
                "w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0",
                isSelected ? "bg-navy-700 border-navy-700" : "border-slate-300"
              )}>
                {isSelected && <Check size={9} className="text-white" />}
              </span>
              <span className="truncate">{getLabel(item)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

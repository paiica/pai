import {
  GraduationCap, Award, ShieldCheck, Target, Compass,
  BarChart3, Briefcase, Layers, Network, Brain, Cpu, LineChart,
  type LucideIcon,
} from "lucide-react";

// A certification's `badge_icon` field stores one of these keys, not a raw
// emoji — keeps every cert badge on the same stroke-icon visual language as
// the rest of the admin UI instead of mismatched, inconsistent emoji glyphs.
export const CERT_ICONS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  "award": Award,
  "shield-check": ShieldCheck,
  "target": Target,
  "compass": Compass,
  "bar-chart": BarChart3,
  "briefcase": Briefcase,
  "layers": Layers,
  "network": Network,
  "brain": Brain,
  "cpu": Cpu,
  "line-chart": LineChart,
};

export const CERT_ICON_OPTIONS: { key: string; label: string }[] = [
  { key: "graduation-cap", label: "Graduation Cap" },
  { key: "award", label: "Award" },
  { key: "shield-check", label: "Shield Check" },
  { key: "target", label: "Target" },
  { key: "compass", label: "Compass" },
  { key: "bar-chart", label: "Bar Chart" },
  { key: "briefcase", label: "Briefcase" },
  { key: "layers", label: "Layers" },
  { key: "network", label: "Network" },
  { key: "brain", label: "Brain" },
  { key: "cpu", label: "Cpu" },
  { key: "line-chart", label: "Line Chart" },
];

export function getCertIcon(key?: string | null): LucideIcon {
  return (key && CERT_ICONS[key]) || GraduationCap;
}

export function CertIcon({
  iconKey, size = 16, className,
}: { iconKey?: string | null; size?: number; className?: string }) {
  const Icon = getCertIcon(iconKey);
  return <Icon size={size} className={className} />;
}

// Compact picker: a grid of icon swatches, one of which is selected.
export function CertIconPicker({
  value, onChange,
}: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {CERT_ICON_OPTIONS.map(({ key, label }) => {
        const Icon = CERT_ICONS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => onChange(key)}
            className={`aspect-square rounded-xl border flex items-center justify-center transition-colors ${
              selected
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-slate-200 text-slate-500 hover:border-navy-300 hover:text-navy-700"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

import {
  GraduationCap, Award, ShieldCheck, Target, Compass,
  BarChart3, Briefcase, Layers, Network, Brain, Cpu, LineChart,
  type LucideIcon,
} from "lucide-react";

// A certification's `badge_icon` field stores one of these keys, not a raw
// emoji — keeps every cert badge on the same stroke-icon visual language as
// the rest of the product instead of mismatched, inconsistent emoji glyphs.
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

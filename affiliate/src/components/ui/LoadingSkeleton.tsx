import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-slate-200 rounded-xl", className)} />;
}

export function KPICardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 w-${i === 0 ? "32" : i === 1 ? "40" : "20"}`} />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-5 space-y-4 animate-pulse", className)}>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="card p-5 animate-pulse">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="animate-pulse bg-slate-200 rounded-xl w-full" style={{ height }} />
    </div>
  );
}

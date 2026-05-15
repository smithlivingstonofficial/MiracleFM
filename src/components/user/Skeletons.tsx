import { cn } from "@/lib/utils";

export function TrackListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/5 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="hidden h-3 w-12 animate-pulse rounded-full bg-white/5 md:block" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 8, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5", className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="aspect-square animate-pulse rounded-[1.5rem] bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-32 animate-pulse rounded-full bg-[#FF0055]/20" />
      <div className="h-10 w-64 max-w-full animate-pulse rounded-full bg-white/10 md:h-14" />
    </div>
  );
}

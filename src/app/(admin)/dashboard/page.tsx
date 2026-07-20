import { createClient } from "@/lib/supabase/server";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  HardDrive,
  Headphones,
  ListMusic,
  Music,
  Radio,
  RefreshCw,
  Server,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { r2 } from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";
import { createClient as createBaseClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

export const revalidate = 180; // Default cache duration of 3 minutes

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone?: "brand" | "green" | "blue" | "amber" | "red" | "zinc";
};

type MiniMetricProps = {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "green" | "amber" | "red" | "blue" | "zinc";
};

type TrackRow = {
  id: string;
  title: string;
  created_at?: string | null;
  cover_url?: string | null;
  play_count?: number | null;
  audio_status?: string | null;
  artists?: { name?: string | null } | null;
};

function compactNumber(value: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

async function getR2Storage() {
  let continuationToken: string | undefined;
  let bytes = 0;
  let objects = 0;

  do {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of result.Contents || []) {
      bytes += object.Size || 0;
      objects += 1;
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return { bytes, objects, available: true };
}

const getCachedR2Storage = unstable_cache(
  async () => {
    return getR2Storage();
  },
  ["admin-r2-storage"],
  { revalidate: 1800 } // 30 minutes
);

async function fetchDashboardMetrics() {
  const supabase = createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const currentTime = new Date().getTime();
  const since24h = new Date(currentTime - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(currentTime - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    tracksRes,
    readyTracksRes,
    queuedTracksRes,
    encodingTracksRes,
    failedTracksRes,
    artistsRes,
    albumsRes,
    playlistsRes,
    bannersRes,
    prayersPendingRes,
    recentTracksRes,
    topTracksRes,
    playEvents24hRes,
    playEvents7dRes,
    variantsRes,
    jobsRes,
    recommendationSectionsRes,
  ] = await Promise.all([
    supabase.from("tracks").select("*", { count: "exact", head: true }),
    supabase.from("tracks").select("*", { count: "exact", head: true }).eq("audio_status", "ready"),
    supabase.from("tracks").select("*", { count: "exact", head: true }).eq("audio_status", "queued"),
    supabase.from("tracks").select("*", { count: "exact", head: true }).eq("audio_status", "encoding"),
    supabase.from("tracks").select("*", { count: "exact", head: true }).eq("audio_status", "failed"),
    supabase.from("artists").select("*", { count: "exact", head: true }),
    supabase.from("albums").select("*", { count: "exact", head: true }),
    supabase.from("playlists").select("*", { count: "exact", head: true }),
    supabase.from("banners").select("*", { count: "exact", head: true }),
    supabase.from("prayer_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("tracks")
      .select("id, title, cover_url, created_at, audio_status, artists(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tracks")
      .select("id, title, cover_url, play_count, artists(name)")
      .order("play_count", { ascending: false })
      .limit(6),
    supabase.from("play_events").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    supabase.from("play_events").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    supabase.from("track_audio_variants").select("bitrate_kbps, size_bytes"),
    supabase.from("encoding_jobs").select("status, source_size_bytes, source_deleted_at, target_bitrates, include_fallback"),
    supabase.from("recommendation_sections").select("*", { count: "exact", head: true }).eq("enabled", true),
  ]);

  return {
    trackCount: tracksRes.count || 0,
    readyTracks: readyTracksRes.count || 0,
    queuedTracks: queuedTracksRes.count || 0,
    encodingTracks: encodingTracksRes.count || 0,
    failedTracks: failedTracksRes.count || 0,
    artistCount: artistsRes.count || 0,
    albumCount: albumsRes.count || 0,
    playlistCount: playlistsRes.count || 0,
    bannerCount: bannersRes.count || 0,
    pendingPrayers: prayersPendingRes.count || 0,
    events24h: playEvents24hRes.count || 0,
    events7d: playEvents7dRes.count || 0,
    recommendationSections: recommendationSectionsRes.count || 0,
    recentTracks: (recentTracksRes.data || []) as TrackRow[],
    topTracks: (topTracksRes.data || []) as TrackRow[],
    variants: variantsRes.data || [],
    jobs: jobsRes.data || [],
  };
}

const getCachedDashboardMetrics = unstable_cache(
  async () => {
    return fetchDashboardMetrics();
  },
  ["admin-dashboard-metrics-store"],
  { revalidate: 180, tags: ["admin-dashboard"] } // 3 minutes cache
);

interface DashboardPageProps {
  searchParams: Promise<{
    fresh?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const forceFresh = params.fresh === "true";

  let metrics;
  if (forceFresh) {
    metrics = await fetchDashboardMetrics();
  } else {
    metrics = await getCachedDashboardMetrics();
  }

  let r2Storage;
  if (forceFresh) {
    try {
      r2Storage = await getR2Storage();
    } catch {
      r2Storage = { bytes: 0, objects: 0, available: false };
    }
  } else {
    try {
      r2Storage = await getCachedR2Storage();
    } catch {
      r2Storage = { bytes: 0, objects: 0, available: false };
    }
  }

  const {
    trackCount,
    readyTracks,
    queuedTracks,
    encodingTracks,
    failedTracks,
    artistCount,
    albumCount,
    playlistCount,
    bannerCount,
    pendingPrayers,
    events24h,
    events7d,
    recommendationSections,
    recentTracks,
    topTracks,
    variants,
    jobs,
  } = metrics;

  const encodedBytes = variants.reduce((total: number, row: any) => total + Number(row.size_bytes || 0), 0);
  const originalBytes = jobs
    .filter((job: any) => !job.source_deleted_at)
    .reduce((total: number, job: any) => total + Number(job.source_size_bytes || 0), 0);
  const totalVariantRows = variants.length;
  const sourceDeletedCount = jobs.filter((job: any) => job.source_deleted_at).length;
  const fallbackJobs = jobs.filter((job: any) => job.include_fallback !== false).length;
  const readyPercent = percent(readyTracks, trackCount);

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-700">
      {/* 1. Header (Sticky & Compact) */}
      <div className="sticky top-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-md pt-5 pb-4 border-b border-white/[0.06] -mx-8 px-8 lg:-mx-12 lg:px-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">Admin Command Center</h1>
        </div>
        <Link
          href={forceFresh ? "/dashboard" : "/dashboard?fresh=true"}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider text-white border transition-all active:scale-95 shrink-0 self-start md:self-auto",
            forceFresh
              ? "bg-brand border-brand hover:bg-[#ff1a66] shadow-[0_0_15px_rgba(255,0,85,0.25)]"
              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
          )}
        >
          <RefreshCw size={11} className={cn(forceFresh && "animate-spin")} />
          {forceFresh ? "Viewing Live" : "Sync Live Data"}
        </Link>
      </div>

      {/* 2. Mini Metrics & Stat Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 pt-2">
        <MiniMetric label="Ready" value={`${readyPercent}%`} icon={CheckCircle2} tone="green" />
        <MiniMetric label="Queued" value={compactNumber(queuedTracks + encodingTracks)} icon={Clock3} tone="amber" />
        <MiniMetric label="Failed" value={compactNumber(failedTracks)} icon={XCircle} tone={failedTracks > 0 ? "red" : "zinc"} />
        <MiniMetric label="24h Plays" value={compactNumber(events24h)} icon={Headphones} tone="blue" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracks" value={compactNumber(trackCount)} detail={`${compactNumber(readyTracks)} ready to stream`} icon={Music} tone="brand" />
        <StatCard label="Audience Activity" value={compactNumber(events7d)} detail={`${compactNumber(events24h)} playback events in 24h`} icon={TrendingUp} tone="green" />
        <StatCard label="R2 Storage" value={r2Storage.available ? formatBytes(r2Storage.bytes) : "N/A"} detail={r2Storage.available ? `${compactNumber(r2Storage.objects)} objects in bucket` : "Cloudflare check unavailable"} icon={HardDrive} tone="blue" />
        <StatCard label="Encoded Audio" value={formatBytes(encodedBytes)} detail={`${compactNumber(totalVariantRows)} quality variants tracked`} icon={Database} tone="amber" />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <Panel title="Library Health" actionHref="/admin-tracks" actionLabel="Manage tracks" icon={Gauge}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HealthTile label="Artists" value={artistCount} icon={Users} />
            <HealthTile label="Albums" value={albumCount} icon={ListMusic} />
            <HealthTile label="Playlists" value={playlistCount} icon={Sparkles} />
            <HealthTile label="Banners" value={bannerCount} icon={UploadCloud} />
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.05] bg-zinc-900/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-550">Streaming Readiness</p>
                <p className="mt-0.5 text-xs font-bold text-zinc-300">{readyTracks} of {trackCount} tracks ready</p>
              </div>
              <span className="text-xl font-black text-white">{readyPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900 shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF0055] to-green-500 shadow-[0_0_12px_rgba(255,0,85,0.4)]" style={{ width: `${readyPercent}%` }} />
            </div>
            <div className="mt-3.5 grid gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500 sm:grid-cols-3">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {queuedTracks} queued</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {encodingTracks} encoding</span>
              <span className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", failedTracks > 0 ? "bg-red-500" : "bg-zinc-650")} /> <span className={failedTracks > 0 ? "text-red-400" : ""}>{failedTracks} failed</span></span>
            </div>
          </div>
        </Panel>

        <Panel title="Storage Shape" actionHref="/upload" actionLabel="Upload audio" icon={HardDrive}>
          <div className="space-y-2.5">
            <StorageLine label="Encoded Variants" value={formatBytes(encodedBytes)} tone="brand" subtitle="HLS encoded streams size" />
            <StorageLine label="Original Masters" value={formatBytes(originalBytes)} tone="blue" subtitle="Retained source files size" />
            <StorageLine label="Fallback MP3 Jobs" value={compactNumber(fallbackJobs)} tone="green" subtitle="Tracks with legacy MP3 fallback" />
            <StorageLine label="Cleaned Source Files" value={compactNumber(sourceDeletedCount)} tone={sourceDeletedCount > 0 ? "amber" : "zinc"} subtitle="Storage-saving master deletions" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <Panel title="Latest Ingestion" actionHref="/upload" actionLabel="New upload" icon={Activity}>
          <div className="space-y-2">
            {recentTracks.length === 0 ? (
              <EmptyState label="No tracks uploaded yet." />
            ) : (
              recentTracks.map((track) => <TrackListItem key={track.id} track={track} />)
            )}
          </div>
        </Panel>

        <Panel title="Top Tracks" actionHref="/admin-tracks" actionLabel="Library" icon={TrendingUp}>
          <div className="space-y-3">
            {topTracks.length === 0 ? (
              <EmptyState label="No play data yet." />
            ) : (
              topTracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-3 p-1 rounded-xl transition-colors hover:bg-white/[0.02]">
                  <span className={cn(
                    "w-5 text-center text-sm font-black shrink-0",
                    index === 0 ? "text-[#FF0055]" :
                      index === 1 ? "text-amber-500" :
                        index === 2 ? "text-blue-450" : "text-zinc-600"
                  )}>{index + 1}</span>
                  <TrackAvatar track={track} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{track.title}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-550 mt-0.5">{compactNumber(track.play_count || 0)} plays</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Admin Workload" actionHref="/recommendations" actionLabel="Tune" icon={Server}>
          <div className="space-y-3">
            <WorkloadItem icon={AlertTriangle} label="Pending prayers" value={pendingPrayers} urgent={pendingPrayers > 0} />
            <WorkloadItem icon={Sparkles} label="Active recommendation sections" value={recommendationSections} />
            <WorkloadItem icon={Clock3} label="Encoding queue" value={queuedTracks + encodingTracks} urgent={queuedTracks + encodingTracks > 0} />
            <WorkloadItem icon={XCircle} label="Failed audio jobs" value={failedTracks} urgent={failedTracks > 0} />
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone = "zinc" }: StatCardProps) {
  const styles = {
    brand: "text-[#FF0055] bg-[#FF0055]/10 border-[#FF0055]/20 shadow-[0_0_15px_rgba(255,0,85,0.15)]",
    green: "text-green-450 bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]",
    blue: "text-blue-450 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    amber: "text-amber-450 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    red: "text-red-450 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    zinc: "text-zinc-400 bg-white/5 border-white/10 shadow-none",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-zinc-950/40 p-5 shadow-2xl transition-all duration-300 hover:border-brand/20 hover:bg-zinc-950/60 group">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-xl border p-2.5 ${styles}`}>
          <Icon size={18} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight text-white group-hover:text-brand transition-colors">{value}</p>
      <p className="mt-1.5 text-[11px] font-medium text-zinc-500">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon, tone = "zinc" }: MiniMetricProps) {
  const styles = {
    green: "text-green-450 bg-green-500/10 border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]",
    amber: "text-amber-450 bg-amber-500/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]",
    red: "text-red-450 bg-red-500/10 border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]",
    blue: "text-blue-450 bg-blue-500/10 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]",
    zinc: "text-zinc-400 bg-white/5 border-white/10 shadow-none",
  }[tone];

  const dot = {
    green: "bg-green-500 shadow-[0_0_8px_#22c55e]",
    amber: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
    red: "bg-red-500 shadow-[0_0_8px_#ef4444]",
    blue: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
    zinc: "bg-zinc-500 shadow-[0_0_8px_#71717a]",
  }[tone];

  return (
    <div className={`rounded-xl border px-3.5 py-3 transition-all duration-300 ${styles}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-75">{label}</span>
        </div>
        <Icon size={13} className="opacity-60" />
      </div>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  actionHref,
  actionLabel,
  icon: Icon,
  children,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-zinc-950/40 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] bg-zinc-900/10 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
          <Icon size={15} className="text-[#FF0055]" />
          {title}
        </h2>
        <Link href={actionHref} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
          {actionLabel}
          <ArrowUpRight size={12} />
        </Link>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function HealthTile({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-zinc-900/20 p-4 transition-colors hover:border-white/[0.1]">
      <Icon size={16} className="mb-3 text-zinc-500" />
      <p className="text-xl font-black text-white">{compactNumber(value)}</p>
      <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
    </div>
  );
}

function StorageLine({ label, value, tone, subtitle }: { label: string; value: string; tone: "brand" | "blue" | "green" | "amber" | "zinc"; subtitle?: string }) {
  const colors = {
    brand: "border-brand/10 bg-brand/[0.02] text-white",
    blue: "border-blue-500/10 bg-blue-500/[0.02] text-white",
    green: "border-green-500/10 bg-green-500/[0.02] text-white",
    amber: "border-amber-500/10 bg-amber-500/[0.02] text-white",
    zinc: "border-white/5 bg-white/[0.01] text-zinc-300",
  }[tone];

  const dot = {
    brand: "bg-[#FF0055] shadow-[0_0_8px_#FF0055]",
    blue: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
    green: "bg-green-500 shadow-[0_0_8px_#22c55e]",
    amber: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
    zinc: "bg-zinc-500 shadow-[0_0_8px_#71717a]",
  }[tone];

  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border px-4 py-3", colors)}>
      <span className="flex items-center gap-2.5 text-xs font-bold text-zinc-300">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
        <span className="flex flex-col">
          <span>{label}</span>
          {subtitle && <span className="text-[10px] text-zinc-600 font-medium mt-0.5">{subtitle}</span>}
        </span>
      </span>
      <span className="text-xs font-mono font-black text-white">{value}</span>
    </div>
  );
}

function TrackAvatar({ track, size = "md" }: { track: TrackRow; size?: "sm" | "md" }) {
  const className = size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl";
  return (
    <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-zinc-900 ${className}`}>
      {track.cover_url ? (
        <Image src={track.cover_url} alt="" fill className="object-cover" sizes="44px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-700">
          <Music size={size === "sm" ? 14 : 16} />
        </div>
      )}
    </div>
  );
}

function TrackListItem({ track }: { track: TrackRow }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-transparent p-2 transition-colors hover:border-white/[0.05] hover:bg-white/[0.02]">
      <div className="flex min-w-0 items-center gap-3">
        <TrackAvatar track={track} />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-white">{track.title}</p>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500">{track.artists?.name || "Unknown artist"}</p>
        </div>
      </div>
      <div className="shrink-0 text-right flex flex-col items-end gap-1">
        <span className={cn(
          "rounded-full px-1.5 py-0.25 text-[8px] font-black uppercase tracking-wider",
          track.audio_status === "ready" ? "bg-green-500/10 text-green-400" :
            track.audio_status === "failed" ? "bg-red-500/10 text-red-400" :
              "bg-yellow-500/10 text-yellow-400"
        )}>
          {track.audio_status === "ready" ? "Adaptive" : track.audio_status || "legacy"}
        </span>
        <p className="text-[10px] font-bold text-zinc-650">{track.created_at ? new Date(track.created_at).toLocaleDateString() : ""}</p>
      </div>
    </div>
  );
}

function WorkloadItem({ icon: Icon, label, value, urgent = false }: { icon: React.ElementType; label: string; value: number; urgent?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors",
      urgent ? "border-amber-500/10 bg-amber-500/[0.02]" : "border-white/5 bg-white/[0.01]"
    )}>
      <span className="flex items-center gap-2.5 text-xs font-bold text-zinc-300">
        <Icon size={15} className={urgent ? "text-amber-400 animate-pulse" : "text-zinc-500"} />
        {label}
      </span>
      <span className={cn("text-xs font-mono font-black", urgent ? "text-amber-400" : "text-white")}>
        {compactNumber(value)}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs font-bold text-zinc-600">
      {label}
    </div>
  );
}

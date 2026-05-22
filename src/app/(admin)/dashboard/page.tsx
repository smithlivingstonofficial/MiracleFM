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

export const revalidate = 0;

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

export default async function DashboardPage() {
  const supabase = await createClient();
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

  let r2Storage = { bytes: 0, objects: 0, available: false };
  try {
    r2Storage = await getR2Storage();
  } catch {
    r2Storage = { bytes: 0, objects: 0, available: false };
  }

  const trackCount = tracksRes.count || 0;
  const readyTracks = readyTracksRes.count || 0;
  const queuedTracks = queuedTracksRes.count || 0;
  const encodingTracks = encodingTracksRes.count || 0;
  const failedTracks = failedTracksRes.count || 0;
  const artistCount = artistsRes.count || 0;
  const albumCount = albumsRes.count || 0;
  const playlistCount = playlistsRes.count || 0;
  const bannerCount = bannersRes.count || 0;
  const pendingPrayers = prayersPendingRes.count || 0;
  const events24h = playEvents24hRes.count || 0;
  const events7d = playEvents7dRes.count || 0;
  const recommendationSections = recommendationSectionsRes.count || 0;
  const recentTracks = (recentTracksRes.data || []) as TrackRow[];
  const topTracks = (topTracksRes.data || []) as TrackRow[];
  const variants = variantsRes.data || [];
  const jobs = jobsRes.data || [];
  const encodedBytes = variants.reduce((total, row) => total + Number(row.size_bytes || 0), 0);
  const originalBytes = jobs
    .filter((job) => !job.source_deleted_at)
    .reduce((total, job) => total + Number(job.source_size_bytes || 0), 0);
  const totalVariantRows = variants.length;
  const sourceDeletedCount = jobs.filter((job) => job.source_deleted_at).length;
  const fallbackJobs = jobs.filter((job) => job.include_fallback !== false).length;
  const readyPercent = percent(readyTracks, trackCount);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <section className="flex flex-col gap-5 border-b border-white/[0.06] pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
            <Radio size={13} />
            Live operations
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Admin Command Center</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-500">
            Monitor library health, encoding pipeline, storage footprint, listener activity, and pending admin work from one console.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
          <MiniMetric label="Ready" value={`${readyPercent}%`} icon={CheckCircle2} tone="green" />
          <MiniMetric label="Queued" value={compactNumber(queuedTracks + encodingTracks)} icon={Clock3} tone="amber" />
          <MiniMetric label="Failed" value={compactNumber(failedTracks)} icon={XCircle} tone={failedTracks > 0 ? "red" : "zinc"} />
          <MiniMetric label="24h Plays" value={compactNumber(events24h)} icon={Headphones} tone="blue" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracks" value={compactNumber(trackCount)} detail={`${compactNumber(readyTracks)} ready to stream`} icon={Music} tone="brand" />
        <StatCard label="Audience Activity" value={compactNumber(events7d)} detail={`${compactNumber(events24h)} playback events in 24h`} icon={TrendingUp} tone="green" />
        <StatCard label="R2 Storage" value={r2Storage.available ? formatBytes(r2Storage.bytes) : "N/A"} detail={r2Storage.available ? `${compactNumber(r2Storage.objects)} objects in bucket` : "Cloudflare check unavailable"} icon={HardDrive} tone="blue" />
        <StatCard label="Encoded Audio" value={formatBytes(encodedBytes)} detail={`${compactNumber(totalVariantRows)} quality variants tracked`} icon={Database} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <Panel title="Library Health" actionHref="/admin-tracks" actionLabel="Manage tracks" icon={Gauge}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HealthTile label="Artists" value={artistCount} icon={Users} />
            <HealthTile label="Albums" value={albumCount} icon={ListMusic} />
            <HealthTile label="Playlists" value={playlistCount} icon={Sparkles} />
            <HealthTile label="Banners" value={bannerCount} icon={UploadCloud} />
          </div>
          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/35 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Streaming readiness</p>
                <p className="mt-1 text-sm font-semibold text-white">{readyTracks} of {trackCount} tracks ready</p>
              </div>
              <span className="text-2xl font-black text-white">{readyPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-brand" style={{ width: `${readyPercent}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-xs font-bold text-zinc-500 sm:grid-cols-3">
              <span>{queuedTracks} queued</span>
              <span>{encodingTracks} encoding</span>
              <span className={failedTracks > 0 ? "text-red-400" : ""}>{failedTracks} failed</span>
            </div>
          </div>
        </Panel>

        <Panel title="Storage Shape" actionHref="/upload" actionLabel="Upload audio" icon={HardDrive}>
          <div className="space-y-3">
            <StorageLine label="Encoded variants" value={formatBytes(encodedBytes)} tone="brand" />
            <StorageLine label="Original masters" value={formatBytes(originalBytes)} tone="blue" />
            <StorageLine label="Fallback-enabled jobs" value={compactNumber(fallbackJobs)} tone="green" />
            <StorageLine label="Sources deleted" value={compactNumber(sourceDeletedCount)} tone={sourceDeletedCount > 0 ? "amber" : "zinc"} />
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
                <div key={track.id} className="flex items-center gap-3">
                  <span className={index === 0 ? "w-5 text-center text-lg font-black text-brand" : "w-5 text-center text-lg font-black text-zinc-700"}>{index + 1}</span>
                  <TrackAvatar track={track} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{track.title}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{compactNumber(track.play_count || 0)} plays</p>
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
    brand: "border-brand/20 bg-brand/10 text-brand",
    green: "border-green-500/20 bg-green-500/10 text-green-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    red: "border-red-500/20 bg-red-500/10 text-red-400",
    zinc: "border-white/10 bg-white/5 text-zinc-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/70 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl border p-3 ${styles}`}>
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">{label}</span>
      </div>
      <p className="mt-6 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs font-bold text-zinc-500">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon, tone = "zinc" }: MiniMetricProps) {
  const styles = {
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    zinc: "text-zinc-400 bg-white/5 border-white/10",
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 ${styles}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Icon size={15} />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-75">{label}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
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
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/70 shadow-xl">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] p-5">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
          <Icon size={17} className="text-brand" />
          {title}
        </h2>
        <Link href={actionHref} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
          {actionLabel}
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function HealthTile({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/35 p-4">
      <Icon size={18} className="mb-4 text-zinc-500" />
      <p className="text-2xl font-black text-white">{compactNumber(value)}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
    </div>
  );
}

function StorageLine({ label, value, tone }: { label: string; value: string; tone: "brand" | "blue" | "green" | "amber" | "zinc" }) {
  const colors = {
    brand: "bg-brand",
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    zinc: "bg-zinc-600",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-black/35 px-4 py-3">
      <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
        <span className={`h-2 w-2 rounded-full ${colors}`} />
        {label}
      </span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}

function TrackAvatar({ track, size = "md" }: { track: TrackRow; size?: "sm" | "md" }) {
  const className = size === "sm" ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl";
  return (
    <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-zinc-900 ${className}`}>
      {track.cover_url ? (
        <Image src={track.cover_url} alt="" fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-700">
          <Music size={size === "sm" ? 17 : 20} />
        </div>
      )}
    </div>
  );
}

function TrackListItem({ track }: { track: TrackRow }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-transparent p-3 transition-colors hover:border-white/[0.06] hover:bg-white/[0.03]">
      <div className="flex min-w-0 items-center gap-4">
        <TrackAvatar track={track} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{track.title}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">{track.artists?.name || "Unknown artist"}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{track.audio_status || "legacy"}</p>
        <p className="mt-1 text-[10px] font-bold text-zinc-700">{track.created_at ? new Date(track.created_at).toLocaleDateString() : ""}</p>
      </div>
    </div>
  );
}

function WorkloadItem({ icon: Icon, label, value, urgent = false }: { icon: React.ElementType; label: string; value: number; urgent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-black/35 px-4 py-3">
      <span className="flex items-center gap-3 text-xs font-bold text-zinc-500">
        <Icon size={16} className={urgent ? "text-amber-400" : "text-zinc-600"} />
        {label}
      </span>
      <span className={urgent ? "text-sm font-black text-amber-300" : "text-sm font-black text-white"}>
        {compactNumber(value)}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center text-sm font-semibold text-zinc-600">
      {label}
    </div>
  );
}

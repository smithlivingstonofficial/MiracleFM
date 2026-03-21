// src/components/admin/BulkUploader.tsx
"use client";

import React, { useState, useCallback } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Music,
  FileAudio,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemStatus = "idle" | "transcoding" | "uploading" | "completed" | "error";

interface UploadQueueItem {
  file: File;
  status: ItemStatus;
  progress: number;
  errorMessage?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strips accents and non-ASCII chars so FFmpeg never chokes on Tamil filenames. */
const slugify = (text: string): string =>
  text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  idle:       "Queued",
  transcoding: "Transcoding",
  uploading:  "Uploading",
  completed:  "Done",
  error:      "Failed",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkUploader() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging]     = useState(false);

  // ── Queue management ────────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
      .filter((f) => f.type.startsWith("audio/"))
      .map((file) => ({ file, status: "idle" as const, progress: 0 }));
    if (!incoming.length) {
      toast.error("Please select audio files (MP3, WAV)");
      return;
    }
    setQueue((prev) => [...prev, ...incoming]);
  }, []);

  const removeItem = (idx: number) => {
    if (isProcessing) return;
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  };

  const retryItem = (idx: number) => {
    setQueue((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], status: "idle", progress: 0, errorMessage: undefined };
      return next;
    });
  };

  const updateItem = (
    idx: number,
    patch: Partial<Pick<UploadQueueItem, "status" | "progress" | "errorMessage">>
  ) => {
    setQueue((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Pipeline ────────────────────────────────────────────────────────────────

  const processQueue = async () => {
    const pending = queue.filter((item) => item.status !== "completed");
    if (!pending.length) return;

    setIsProcessing(true);

    let ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>;
    try {
      ffmpeg = await getFFmpeg();
    } catch {
      toast.error("FFmpeg failed to load. Refresh and try again.");
      setIsProcessing(false);
      return;
    }

    const supabase = createClient();

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "completed") continue;

      const item = queue[i];
      const trackId = crypto.randomUUID();

      try {
        // ── STEP 0: Sanitise filename ──────────────────────────────────────
        const originalName = item.file.name.replace(/\.[^/.]+$/, "");
        const safeName     = slugify(originalName) || `track-${Date.now()}`;

        // ── STEP 1: Transcode to HLS ───────────────────────────────────────
        //
        // KEY CHANGES from the previous command:
        //
        // -hls_time 4 (was 2)
        //   Each segment is now 4 seconds instead of 2. A 4-min song goes
        //   from ~120 files to ~60 files. Fewer HTTP round-trips to R2
        //   means the player gets the first segment and starts playing
        //   much faster.
        //
        // -hls_list_size 0
        //   Include ALL segments in the .m3u8 playlist. Without this,
        //   FFmpeg only lists the last N segments and seeking breaks.
        //
        // -hls_flags independent_segments
        //   Every .ts segment is a clean decode boundary. Seeking is
        //   instant and gapless with no decoding artefacts.
        //
        updateItem(i, { status: "transcoding", progress: 5 });

        const inputName  = `input_${safeName}.mp3`;
        const outputName = "playlist.m3u8";

        await ffmpeg.writeFile(inputName, await fetchFile(item.file));

        updateItem(i, { progress: 15 });

        await ffmpeg.exec([
          "-i",                   inputName,
          "-codec:a",             "libmp3lame",
          "-b:a",                 "128k",
          "-f",                   "hls",
          "-hls_time",            "4",
          "-hls_list_size",       "0",
          "-hls_flags",           "independent_segments",
          "-hls_playlist_type",   "vod",
          outputName,
        ]);

        updateItem(i, { progress: 35 });

        // ── STEP 2: Collect output files ───────────────────────────────────
        const dirContent   = await ffmpeg.listDir(".");
        const filesToUpload = dirContent.filter(
          (f) => !f.isDir && (f.name.endsWith(".m3u8") || f.name.endsWith(".ts"))
        );

        if (!filesToUpload.length) throw new Error("FFmpeg produced no output files.");

        // ── STEP 3: Upload to R2 ───────────────────────────────────────────
        updateItem(i, { status: "uploading", progress: 35 });

        for (let j = 0; j < filesToUpload.length; j++) {
          const fileObj     = filesToUpload[j];
          const data        = await ffmpeg.readFile(fileObj.name);
          const r2Path      = `tracks/${trackId}/${fileObj.name}`;
          const contentType = fileObj.name.endsWith(".m3u8")
            ? "application/x-mpegURL"
            : "video/MP2T";

          // 3a. Get pre-signed PUT URL from our API route
          const res = await fetch("/api/upload", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ fileName: r2Path, contentType }),
          });
          if (!res.ok) throw new Error(`Signed URL request failed: ${res.statusText}`);
          const { url } = await res.json();

          // 3b. PUT directly to Cloudflare R2
          const uploadRes = await fetch(url, {
            method:  "PUT",
            body:    data as BodyInit,
            headers: { "Content-Type": contentType },
            mode:    "cors",
          });
          if (!uploadRes.ok) throw new Error(`R2 upload failed: ${uploadRes.statusText}`);

          // Spread progress from 35 → 90 across all file uploads
          const uploadProgress = 35 + Math.floor(((j + 1) / filesToUpload.length) * 55);
          updateItem(i, { progress: uploadProgress });
        }

        // ── STEP 4: Write database record ──────────────────────────────────
        const hlsUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/tracks/${trackId}/playlist.m3u8`;

        const { error: dbError } = await supabase.from("tracks").insert({
          id:      trackId,
          title:   originalName, // store original Tamil title, not the slugified version
          hls_url: hlsUrl,
        });
        if (dbError) throw dbError;

        updateItem(i, { status: "completed", progress: 100 });

        // ── STEP 5: Cleanup FFmpeg virtual FS ─────────────────────────────
        await Promise.allSettled([
          ffmpeg.deleteFile(inputName),
          ...filesToUpload.map((f) => ffmpeg.deleteFile(f.name)),
        ]);

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[BulkUploader] Failed: ${item.file.name}`, err);
        updateItem(i, { status: "error", progress: 0, errorMessage: msg });
        toast.error(`Failed: ${item.file.name}`, { description: msg });
      }
    }

    setIsProcessing(false);

    const completed = queue.filter((_, i) => queue[i]?.status === "completed").length;
    const failed    = queue.filter((_, i) => queue[i]?.status === "error").length;
    if (failed === 0) toast.success(`All ${queue.length} tracks uploaded successfully.`);
    else toast.warning(`${completed} succeeded, ${failed} failed. Retry the failed ones.`);
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const pendingCount   = queue.filter((i) => i.status !== "completed").length;
  const completedCount = queue.filter((i) => i.status === "completed").length;
  const errorCount     = queue.filter((i) => i.status === "error").length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-black/40 rounded-4xl p-8 md:p-12 space-y-10">

      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center space-y-6 py-16 rounded-3xl",
          "border-2 border-dashed transition-all duration-300 cursor-default",
          isDragging
            ? "border-brand bg-brand/[0.06] scale-[1.01]"
            : "border-white/10 hover:border-brand/50 hover:bg-brand/[0.02]",
          "group"
        )}
      >
        <div className="relative">
          <div className={cn(
            "w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
            isDragging ? "scale-110" : "group-hover:scale-110"
          )}>
            <UploadCloud className={cn(
              "w-10 h-10 transition-colors",
              isDragging ? "text-brand" : "text-zinc-500 group-hover:text-brand"
            )} />
          </div>
          <div className={cn(
            "absolute inset-0 bg-brand/20 blur-xl rounded-full transition-opacity duration-300",
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />
        </div>

        <div className="text-center space-y-2 select-none">
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isDragging ? "Release to add files" : "Drop Audio Files"}
          </h2>
          <p className="text-zinc-500 font-medium">MP3 · WAV · Max 50 MB per file</p>
        </div>

        <label className="cursor-pointer relative z-10">
          <input
            type="file"
            multiple
            accept="audio/mpeg,audio/wav,audio/*"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
            disabled={isProcessing}
          />
          <div className={cn(
            "px-8 py-4 rounded-full font-bold text-sm shadow-lg shadow-brand/20 transition-all",
            "bg-brand text-white hover:bg-brand-hover hover:scale-105 active:scale-95",
            isProcessing && "opacity-50 pointer-events-none"
          )}>
            Select Files
          </div>
        </label>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">

          {/* Queue header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileAudio className="text-brand" size={20} />
              Queue
            </h3>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  {completedCount} done
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                  {errorCount} failed
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                {queue.length} total
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {queue.map((item, idx) => (
              <QueueItem
                key={`${item.file.name}-${idx}`}
                item={item}
                onRemove={() => removeItem(idx)}
                onRetry={() => retryItem(idx)}
                isProcessing={isProcessing}
              />
            ))}
          </div>

          {/* Action button */}
          {!isProcessing && pendingCount > 0 && (
            <Button
              onClick={processQueue}
              className="w-full mt-4 py-8 text-xl font-black bg-white text-black hover:bg-zinc-200 rounded-3xl shadow-2xl transition-transform active:scale-[0.99]"
            >
              Start Pipeline ({pendingCount} track{pendingCount !== 1 ? "s" : ""})
            </Button>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-6 text-zinc-400">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm font-semibold">Processing — do not close this tab</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Queue Item Sub-component ─────────────────────────────────────────────────

function QueueItem({
  item,
  onRemove,
  onRetry,
  isProcessing,
}: {
  item: UploadQueueItem;
  onRemove: () => void;
  onRetry: () => void;
  isProcessing: boolean;
}) {
  const statusColor = {
    idle:        "text-zinc-600",
    transcoding: "text-yellow-500",
    uploading:   "text-blue-400",
    completed:   "text-green-500",
    error:       "text-red-500",
  }[item.status];

  const progressColor = {
    idle:        "",
    transcoding: "[&>div]:bg-yellow-500",
    uploading:   "[&>div]:bg-blue-500",
    completed:   "[&>div]:bg-green-500",
    error:       "[&>div]:bg-red-500",
  }[item.status];

  return (
    <div className={cn(
      "bg-zinc-900/80 border p-5 rounded-2xl transition-all duration-200",
      item.status === "error"
        ? "border-red-500/20 bg-red-500/[0.03]"
        : item.status === "completed"
        ? "border-green-500/20"
        : "border-white/5 hover:border-white/10"
    )}>
      <div className="flex items-start gap-4">

        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {item.status === "transcoding" && <Loader2 className="animate-spin text-yellow-500" size={20} />}
          {item.status === "uploading"   && <Loader2 className="animate-spin text-blue-400"   size={20} />}
          {item.status === "completed"   && <CheckCircle2 className="text-green-500"           size={20} />}
          {item.status === "error"       && <AlertCircle  className="text-red-500"             size={20} />}
          {item.status === "idle"        && (
            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-dashed mt-0.5" />
          )}
        </div>

        {/* Info + progress */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white truncate flex items-center gap-2">
              <Music size={13} className="text-zinc-600 shrink-0" />
              {item.file.name}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-zinc-600 font-medium hidden sm:block">
                {formatBytes(item.file.size)}
              </span>
              <span className={cn(
                "text-[10px] uppercase tracking-[0.15em] font-black",
                statusColor,
                item.status === "transcoding" && "animate-pulse"
              )}>
                {STATUS_LABEL[item.status]}
              </span>
            </div>
          </div>

          {/* Progress bar — only shown while active */}
          {(item.status === "transcoding" || item.status === "uploading" || item.status === "completed") && (
            <Progress
              value={item.progress}
              className={cn("h-1.5 bg-zinc-800 rounded-full", progressColor)}
            />
          )}

          {/* Error message */}
          {item.status === "error" && item.errorMessage && (
            <p className="text-[11px] text-red-400/80 font-medium truncate">
              {item.errorMessage}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-1">
          {item.status === "error" && !isProcessing && (
            <button
              onClick={onRetry}
              title="Retry"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {item.status !== "transcoding" && item.status !== "uploading" && (
            <button
              onClick={onRemove}
              title="Remove"
              disabled={isProcessing}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// src/components/admin/BulkUploader.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Radio,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ItemStatus = "idle" | "uploading" | "stored" | "queued" | "encoding" | "ready" | "error";

interface UploadQueueItem {
  file: File;
  status: ItemStatus;
  progress: number;
  errorMessage?: string;
  trackId?: string;
  hlsUrl?: string;
  fallbackAudioUrl?: string;
}

type InitUploadResponse = {
  trackId: string;
  sourceKey: string;
  uploadUrl: string;
  expiresIn: number;
};

type UploadStatusResponse = {
  ready: boolean;
  failed: boolean;
  track?: {
    id: string;
    hls_url: string | null;
    fallback_audio_url: string | null;
    audio_status: "legacy" | "queued" | "encoding" | "ready" | "failed";
    audio_version: string | null;
    audio_error: string | null;
  };
  encodingJob?: {
    status: "queued" | "encoding" | "ready" | "failed";
    attempts: number;
    error: string | null;
  } | null;
  objects?: {
    original?: { exists: boolean; key: string | null; error?: string };
    masterPlaylist?: { exists: boolean; key: string | null; error?: string };
    fallbackAudio?: { exists: boolean; key: string | null; error?: string };
    variants?: Record<string, { exists: boolean; key: string | null; error?: string }>;
  };
  nextAction?: string;
};

const MAX_AUDIO_UPLOAD_BYTES = 500 * 1024 * 1024;

const titleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled Track";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  idle: "Selected",
  uploading: "Uploading original",
  stored: "Original stored",
  queued: "Waiting for encoder",
  encoding: "Encoding HLS",
  ready: "Stream ready",
  error: "Failed",
};

const POLL_INTERVAL_MS = 3000;
const BROWSER_UPLOAD_CONCURRENCY = 2;

async function runLimited<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

function putSignedUpload(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(74, 15 + (event.loaded / event.total) * 59));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Cloudflare R2 upload failed: ${xhr.status} ${xhr.statusText || ""}${
            xhr.responseText ? ` ${xhr.responseText}` : ""
          }`.trim()
        )
      );
    };

    xhr.onerror = () => reject(new Error("Cloudflare R2 upload failed due to a network error."));
    xhr.onabort = () => reject(new Error("Cloudflare R2 upload was canceled."));
    xhr.send(file);
  });
}

export default function BulkUploader() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const queueRef = useRef(queue);
  const statusPollInFlightRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
      .filter((file) => file.type.startsWith("audio/") && file.size <= MAX_AUDIO_UPLOAD_BYTES)
      .map((file) => ({ file, status: "idle" as const, progress: 0 }));

    const rejectedCount = Array.from(files).length - incoming.length;
    if (rejectedCount > 0) {
      toast.warning(`${rejectedCount} file${rejectedCount === 1 ? "" : "s"} skipped`, {
        description: "Only audio files up to 500 MB can be queued.",
      });
    }

    if (!incoming.length) {
      toast.error("Please select audio files under 500 MB.");
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
      next[idx] = {
        ...next[idx],
        status: "idle",
        progress: 0,
        errorMessage: undefined,
        trackId: undefined,
        hlsUrl: undefined,
        fallbackAudioUrl: undefined,
      };
      return next;
    });
  };

  const updateItem = useCallback((
    idx: number,
    patch: Partial<
      Pick<UploadQueueItem, "status" | "progress" | "errorMessage" | "trackId" | "hlsUrl" | "fallbackAudioUrl">
    >
  ) => {
    setQueue((prev) => {
      const next = [...prev];
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const initUpload = async (file: File): Promise<InitUploadResponse> => {
    const res = await fetch("/api/audio/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "audio/mpeg",
        size: file.size,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const details = [body?.details, body?.hint, body?.action].filter(Boolean).join(" ");
      throw new Error(
        body?.error ? `${body.error}${details ? ` ${details}` : ""}` : `Upload init failed: ${res.status}`
      );
    }

    return res.json();
  };

  const completeUpload = async (file: File, upload: InitUploadResponse) => {
    const res = await fetch("/api/audio/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: upload.trackId,
        sourceKey: upload.sourceKey,
        title: titleFromFileName(file.name),
        contentType: file.type || "audio/mpeg",
        size: file.size,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const details = [body?.details, body?.hint, body?.action].filter(Boolean).join(" ");
      throw new Error(
        body?.error
          ? `${body.error}${details ? ` ${details}` : ""}`
          : `Upload complete failed: ${res.status}`
      );
    }
  };

  const loadUploadStatus = useCallback(async (trackId: string): Promise<UploadStatusResponse> => {
    const res = await fetch(`/api/audio/uploads/status?trackId=${encodeURIComponent(trackId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.details || body?.error || `Upload status failed: ${res.status}`);
    }

    return body;
  }, []);

  const applyUploadStatus = useCallback((idx: number, status: UploadStatusResponse) => {
    if (status.ready) {
      updateItem(idx, {
        status: "ready",
        progress: 100,
        hlsUrl: status.track?.hls_url || undefined,
        fallbackAudioUrl: status.track?.fallback_audio_url || undefined,
        errorMessage: undefined,
      });
      return;
    }

    if (status.failed) {
      updateItem(idx, {
        status: "error",
        progress: 0,
        errorMessage: status.encodingJob?.error || status.nextAction || "Encoding failed.",
      });
      return;
    }

    const jobStatus = status.encodingJob?.status;
    const originalExists = status.objects?.original?.exists;

    if (jobStatus === "encoding") {
      updateItem(idx, {
        status: "encoding",
        progress: 94,
        errorMessage: "Encoder is processing this track.",
      });
      return;
    }

    updateItem(idx, {
      status: originalExists ? "queued" : "stored",
      progress: originalExists ? 88 : 78,
      errorMessage: status.nextAction,
    });
  }, [updateItem]);

  const refreshItemStatus = async (idx: number) => {
    const item = queue[idx];
    if (!item?.trackId) return;

    try {
      const status = await loadUploadStatus(item.trackId);
      applyUploadStatus(idx, status);
      if (status.ready) toast.success(`${item.file.name} is ready to stream.`);
      else if (status.failed) toast.error(`${item.file.name} failed to encode.`);
      else toast.warning(`${item.file.name} is still waiting for the encoder.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh upload status.";
      toast.error(`Status refresh failed: ${item.file.name}`, { description: message });
    }
  };

  const pollQueuedStatuses = useCallback(async () => {
    if (statusPollInFlightRef.current) return;

    const targets = queueRef.current
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.trackId && (item.status === "queued" || item.status === "encoding"));

    if (!targets.length) return;

    statusPollInFlightRef.current = true;

    try {
      await Promise.all(
        targets.map(async ({ item, idx }) => {
          if (!item.trackId) return;
          const status = await loadUploadStatus(item.trackId);
          applyUploadStatus(idx, status);
        })
      );
    } catch (error) {
      console.error("[BulkUploader] Background status polling failed", error);
    } finally {
      statusPollInFlightRef.current = false;
    }
  }, [applyUploadStatus, loadUploadStatus]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void pollQueuedStatuses();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [pollQueuedStatuses]);

  const processQueue = async () => {
    const pendingIndexes = queue
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "idle" || item.status === "error")
      .map(({ idx }) => idx);

    if (!pendingIndexes.length) return;

    setIsProcessing(true);
    let failed = 0;
    let queued = 0;

    await runLimited(pendingIndexes, BROWSER_UPLOAD_CONCURRENCY, async (idx) => {
      const item = queueRef.current[idx];
      if (!item || (item.status !== "idle" && item.status !== "error")) return;

      try {
        updateItem(idx, { status: "uploading", progress: 5, errorMessage: undefined });

        const upload = await initUpload(item.file);
        updateItem(idx, { trackId: upload.trackId, progress: 15 });

        await putSignedUpload(upload.uploadUrl, item.file, (progress) => {
          updateItem(idx, { progress });
        });

        updateItem(idx, { status: "stored", progress: 75, errorMessage: "Original uploaded to Cloudflare R2." });
        await completeUpload(item.file, upload);

        queued += 1;
        updateItem(idx, {
          status: "queued",
          progress: 88,
          errorMessage: "Supabase row and encoding job created. Encoder will publish HLS in the background.",
        });
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : "Unknown upload error";
        console.error(`[BulkUploader] Failed: ${item.file.name}`, err);
        updateItem(idx, { status: "error", progress: 0, errorMessage: msg });
        toast.error(`Failed: ${item.file.name}`, { description: msg });
      }
    });

    setIsProcessing(false);
    void pollQueuedStatuses();

    if (failed === 0) {
      toast.success(`${queued} upload${queued === 1 ? "" : "s"} queued for background encoding.`);
    } else if (queued > 0) {
      toast.warning(`${queued} queued, ${failed} upload${failed === 1 ? "" : "s"} need attention.`);
    } else {
      toast.warning(`${failed} upload${failed === 1 ? "" : "s"} need attention.`);
    }
  };

  const pendingCount = queue.filter((item) => item.status === "idle" || item.status === "error").length;
  const readyCount = queue.filter((item) => item.status === "ready").length;
  const waitingCount = queue.filter((item) => item.status === "queued" || item.status === "encoding").length;
  const errorCount = queue.filter((item) => item.status === "error").length;

  return (
    <div className="bg-black/40 rounded-4xl p-8 md:p-12 space-y-10">
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
          <div
            className={cn(
              "w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
              isDragging ? "scale-110" : "group-hover:scale-110"
            )}
          >
            <UploadCloud
              className={cn(
                "w-10 h-10 transition-colors",
                isDragging ? "text-brand" : "text-zinc-500 group-hover:text-brand"
              )}
            />
          </div>
          <div
            className={cn(
              "absolute inset-0 bg-brand/20 blur-xl rounded-full transition-opacity duration-300",
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          />
        </div>

        <div className="text-center space-y-2 select-none">
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isDragging ? "Release to add files" : "Drop Master Audio"}
          </h2>
          <p className="text-zinc-500 font-medium">
            MP3, WAV, FLAC, AAC or M4A. Originals queue for adaptive HLS and fallback audio.
          </p>
        </div>

        <label className="cursor-pointer relative z-10">
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
          <div
            className={cn(
              "px-8 py-4 rounded-full font-bold text-sm shadow-lg shadow-brand/20 transition-all",
              "bg-brand text-white hover:bg-brand-hover hover:scale-105 active:scale-95",
              isProcessing && "opacity-80"
            )}
          >
            Select Files
          </div>
        </label>
      </div>

      {queue.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileAudio className="text-brand" size={20} />
              Encoding Queue
            </h3>
            <div className="flex items-center gap-2">
              {readyCount > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  {readyCount} ready
                </span>
              )}
              {waitingCount > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                  {waitingCount} waiting
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

          <div className="space-y-3">
            {queue.map((item, idx) => (
              <QueueItem
                key={`${item.file.name}-${idx}`}
                item={item}
                onRemove={() => removeItem(idx)}
                onRetry={() => retryItem(idx)}
                onRefresh={() => refreshItemStatus(idx)}
                isProcessing={isProcessing}
              />
            ))}
          </div>

          {!isProcessing && pendingCount > 0 && (
            <Button
              onClick={processQueue}
              className="w-full mt-4 py-8 text-xl font-black bg-white text-black hover:bg-zinc-200 rounded-3xl shadow-2xl transition-transform active:scale-[0.99]"
            >
              Upload Originals ({pendingCount} track{pendingCount !== 1 ? "s" : ""})
            </Button>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-6 text-zinc-400">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm font-semibold">
                Storing originals and queueing Supabase jobs. Encoding status updates in the background.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueueItem({
  item,
  onRemove,
  onRetry,
  onRefresh,
  isProcessing,
}: {
  item: UploadQueueItem;
  onRemove: () => void;
  onRetry: () => void;
  onRefresh: () => void;
  isProcessing: boolean;
}) {
  const statusColor = {
    idle: "text-zinc-600",
    uploading: "text-blue-400",
    stored: "text-cyan-400",
    queued: "text-yellow-400",
    encoding: "text-blue-400",
    ready: "text-green-500",
    error: "text-red-500",
  }[item.status];

  const progressColor = {
    idle: "",
    uploading: "[&>div]:bg-blue-500",
    stored: "[&>div]:bg-cyan-500",
    queued: "[&>div]:bg-yellow-500",
    encoding: "[&>div]:bg-blue-500",
    ready: "[&>div]:bg-green-500",
    error: "[&>div]:bg-red-500",
  }[item.status];

  return (
    <div
      className={cn(
        "bg-zinc-900/80 border p-5 rounded-2xl transition-all duration-200",
        item.status === "error"
          ? "border-red-500/20 bg-red-500/[0.03]"
          : item.status === "ready"
          ? "border-green-500/20"
          : "border-white/5 hover:border-white/10"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          {item.status === "uploading" && <Loader2 className="animate-spin text-blue-400" size={20} />}
          {item.status === "stored" && <HardDrive className="text-cyan-400" size={20} />}
          {item.status === "queued" && <Radio className="text-yellow-400" size={20} />}
          {item.status === "encoding" && <Loader2 className="animate-spin text-blue-400" size={20} />}
          {item.status === "ready" && <CheckCircle2 className="text-green-500" size={20} />}
          {item.status === "error" && <AlertCircle className="text-red-500" size={20} />}
          {item.status === "idle" && (
            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-dashed mt-0.5" />
          )}
        </div>

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
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.15em] font-black",
                  statusColor,
                  item.status === "uploading" && "animate-pulse"
                )}
              >
                {STATUS_LABEL[item.status]}
              </span>
            </div>
          </div>

          {(item.status === "uploading" ||
            item.status === "stored" ||
            item.status === "queued" ||
            item.status === "encoding" ||
            item.status === "ready") && (
            <Progress value={item.progress} className={cn("h-1.5 bg-zinc-800 rounded-full", progressColor)} />
          )}

          {item.trackId && (
            <p className="text-[10px] text-zinc-600 font-mono truncate">track: {item.trackId}</p>
          )}

          {item.hlsUrl && (
            <p className="text-[10px] text-green-500/70 font-mono truncate">{item.hlsUrl}</p>
          )}

          {item.fallbackAudioUrl && (
            <p className="text-[10px] text-green-500/70 font-mono truncate">{item.fallbackAudioUrl}</p>
          )}

          {item.errorMessage && (
            <p
              className={cn(
                "text-[11px] font-medium truncate",
                item.status === "error" ? "text-red-400/80" : "text-zinc-500"
              )}
            >
              {item.errorMessage}
            </p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {(item.status === "queued" || item.status === "encoding") && !isProcessing && (
            <button
              onClick={onRefresh}
              title="Refresh status"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {item.status === "error" && !isProcessing && (
            <button
              onClick={onRetry}
              title="Retry"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {item.status !== "uploading" && item.status !== "stored" && item.status !== "encoding" && (
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

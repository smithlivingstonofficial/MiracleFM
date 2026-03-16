"use client";

import React, { useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, Loader2, AlertCircle, Music, FileAudio } from "lucide-react";
import { toast } from "sonner"; 
import { cn } from "@/lib/utils";

interface UploadQueueItem {
  file: File;
  status: "idle" | "transcoding" | "uploading" | "completed" | "error";
  progress: number;
}

// Helper to clean filenames (fixes Tamil/Special Character issues)
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Split accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "-") // Replace special chars with -
    .replace(/-+/g, "-") // Collapse dashes
    .replace(/^-+|-+$/g, ""); // Trim dashes
};

export default function BulkUploader() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        status: "idle" as const,
        progress: 0,
      }));
      setQueue((prev) => [...prev, ...newFiles]);
    }
  };

  const updateStatus = (index: number, status: UploadQueueItem["status"], progress: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      newQueue[index] = { ...newQueue[index], status, progress };
      return newQueue;
    });
  };

  const processQueue = async () => {
    setIsProcessing(true);
    const ffmpeg = await getFFmpeg();
    const supabase = createClient();

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "completed") continue;
      
      const currentItem = queue[i];
      const trackId = crypto.randomUUID();
      
      try {
        // --- STEP 0: Sanitize Filename ---
        const originalName = currentItem.file.name.replace(/\.[^/.]+$/, "");
        const safeName = slugify(originalName) || `track-${Date.now()}`;
        
        // --- STEP 1: TRANSCODING ---
        updateStatus(i, "transcoding", 10);
        const inputName = "input.mp3";
        const outputName = "playlist.m3u8";

        await ffmpeg.writeFile(inputName, await fetchFile(currentItem.file));
        
        await ffmpeg.exec([
          "-i", inputName,
          "-codec:a", "libmp3lame",
          "-b:a", "128k",
          "-f", "hls",
          "-hls_time", "2",
          "-hls_playlist_type", "vod",
          outputName
        ]);

        // --- STEP 2: GET FILE LIST ---
        const dirContent = await ffmpeg.listDir(".");
        const filesToUpload = dirContent.filter(f => f.name.endsWith(".m3u8") || f.name.endsWith(".ts"));

        updateStatus(i, "uploading", 30);

        // --- STEP 3: UPLOAD CHUNKS ---
        for (let j = 0; j < filesToUpload.length; j++) {
          const fileObj = filesToUpload[j];
          const data = await ffmpeg.readFile(fileObj.name);
          
          // Use the UUID for the folder, but keep the file names simple (playlist.m3u8, playlist0.ts)
          const fileName = `tracks/${trackId}/${fileObj.name}`;
          const contentType = fileObj.name.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T";

          // 3a. Get Signed URL
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName, contentType }),
          });
          
          if (!res.ok) throw new Error("Failed to get upload URL");
          const { url } = await res.json();

          // 3b. Direct PUT to Cloudflare R2
          const uploadRes = await fetch(url, {
            method: "PUT",
            body: data as BodyInit,
            headers: { "Content-Type": contentType },
            mode: 'cors'
          });

          if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);

          const chunkProgress = 30 + Math.floor(((j + 1) / filesToUpload.length) * 60);
          updateStatus(i, "uploading", chunkProgress);
        }

        // --- STEP 4: DATABASE RECORD ---
        const hlsUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/tracks/${trackId}/playlist.m3u8`;
        
        // We save the Original Name (with Tamil chars) to the DB Title, 
        // but the file system uses the Clean UUID path.
        const { error: dbError } = await supabase.from("tracks").insert({
          id: trackId,
          title: originalName, 
          hls_url: hlsUrl,
        });

        if (dbError) throw dbError;

        updateStatus(i, "completed", 100);
        
        // Cleanup memory
        for (const f of filesToUpload) await ffmpeg.deleteFile(f.name);
        await ffmpeg.deleteFile(inputName);

      } catch (error) {
        console.error(`Error processing ${currentItem.file.name}:`, error);
        updateStatus(i, "error", 0);
        toast.error(`Failed: ${currentItem.file.name}`);
      }
    }
    setIsProcessing(false);
    toast.success("All tasks completed");
  };

  return (
    <div className="bg-black/40 rounded-4xl p-8 md:p-12">
      {/* 1. Drag & Drop Zone */}
      <div className="flex flex-col items-center justify-center space-y-6 py-12 border-2 border-dashed border-white/10 rounded-3xl hover:border-brand/50 hover:bg-brand/[0.02] transition-all group cursor-default">
        <div className="relative">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <UploadCloud className="w-10 h-10 text-zinc-500 group-hover:text-brand transition-colors" />
          </div>
          <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">Drop Audio Files</h2>
          <p className="text-zinc-500 font-medium">Support: MP3, WAV (Max 50MB)</p>
        </div>
        
        <label className="cursor-pointer relative z-10">
          <input 
            type="file" 
            multiple 
            accept="audio/mpeg,audio/wav" 
            onChange={handleFileChange} 
            className="hidden"
          />
          <div className="bg-brand hover:bg-brand-hover text-white px-8 py-4 rounded-full font-bold text-sm shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95">
            Select Files to Process
          </div>
        </label>
      </div>

      {/* 2. Queue List */}
      {queue.length > 0 && (
        <div className="mt-12 space-y-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileAudio className="text-brand" size={20} />
              Processing Queue
            </h3>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
              {queue.length} Tracks
            </span>
          </div>

          <div className="space-y-3">
            {queue.map((item, idx) => (
              <div key={idx} className="bg-zinc-900/80 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                <div className="flex-1 mr-8 min-w-0">
                  <div className="flex justify-between mb-3 items-center">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                      <Music size={14} className="text-zinc-600" />
                      {item.file.name}
                    </p>
                    <span className={cn(
                      "text-[10px] uppercase tracking-[0.2em] font-black",
                      item.status === "completed" ? "text-green-500" :
                      item.status === "error" ? "text-red-500" :
                      item.status === "transcoding" ? "text-yellow-500 animate-pulse" :
                      "text-zinc-600"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <Progress value={item.progress} className="h-2 bg-black rounded-full" />
                </div>
                
                <div className="shrink-0">
                  {item.status === "transcoding" && <Loader2 className="animate-spin text-yellow-500" size={24} />}
                  {item.status === "uploading" && <Loader2 className="animate-spin text-blue-500" size={24} />}
                  {item.status === "completed" && <CheckCircle2 className="text-green-500" size={24} />}
                  {item.status === "error" && <AlertCircle className="text-red-500" size={24} />}
                  {item.status === "idle" && <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-dashed" />}
                </div>
              </div>
            ))}
          </div>

          {!isProcessing && (
            <Button 
              onClick={processQueue} 
              className="w-full mt-8 py-8 text-xl font-black bg-white text-black hover:bg-zinc-200 rounded-3xl shadow-2xl transition-transform active:scale-[0.99]"
            >
              Start Pipeline ({queue.filter(i => i.status !== 'completed').length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
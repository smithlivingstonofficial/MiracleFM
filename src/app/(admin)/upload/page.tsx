// src/app/(admin)/upload/page.tsx

import BulkUploader from "@/components/admin/BulkUploader";
import { Zap, Globe, ShieldCheck, Cpu, Radio } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Radio size={16} className="text-brand" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
              Miracle FM · Admin
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Ingestion
          </h1>
          <p className="text-zinc-500 mt-3 font-medium text-lg">
            Client-side HLS transcoding pipeline — files never leave your browser.
          </p>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusPill icon={Cpu}   label="FFmpeg WASM" color="brand"  />
          <StatusPill icon={Globe} label="R2 CDN Live"  color="green"  />
        </div>
      </div>

      {/* Pipeline tips — shown before any files are added */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TipCard
          icon={Zap}
          title="6-second segments"
          desc="Optimised HLS chunk size for fast playback start with minimal HTTP round-trips to R2."
          color="brand"
        />
        <TipCard
          icon={Globe}
          title="Edge-cached globally"
          desc="Every segment is served from Cloudflare's 300+ edge locations after the first play."
          color="blue"
        />
        <TipCard
          icon={ShieldCheck}
          title="Zero server CPU"
          desc="FFmpeg runs entirely in your browser via WebAssembly. Your server does nothing."
          color="green"
        />
      </div>

      {/* Uploader */}
      <div className="bg-zinc-900/30 border border-white/[0.05] rounded-[2.5rem] p-2 backdrop-blur-sm">
        <BulkUploader />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: "brand" | "green";
}) {
  const styles = {
    brand: "text-brand border-brand/20 bg-brand/5",
    green: "text-green-500 border-green-500/20 bg-green-500/5",
  }[color];

  return (
    <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${styles}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${color === "brand" ? "bg-brand" : "bg-green-500"}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${color === "brand" ? "bg-brand" : "bg-green-500"}`} />
      </span>
      <Icon size={13} />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function TipCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: "brand" | "blue" | "green";
}) {
  const iconStyles = {
    brand: "text-brand bg-brand/10 border-brand/20",
    blue:  "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-green-500 bg-green-500/10 border-green-500/20",
  }[color];

  return (
    <div className="p-6 rounded-2xl bg-black border border-white/[0.05] hover:border-white/10 transition-colors group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${iconStyles} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={18} />
      </div>
      <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}
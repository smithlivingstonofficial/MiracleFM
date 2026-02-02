import BulkUploader from "@/components/admin/BulkUploader";
import { Zap, Globe, ShieldCheck, Cpu } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Ingestion</h1>
          <p className="text-zinc-500 mt-3 font-medium text-lg">
            Secure HLS transcoding pipeline for R2 Storage.
          </p>
        </div>
        
        {/* System Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-zinc-900/50 rounded-full border border-white/10 flex items-center gap-2">
            <Cpu size={14} className="text-brand" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">FFmpeg Ready</span>
          </div>
          <div className="px-4 py-2 bg-zinc-900/50 rounded-full border border-white/10 flex items-center gap-2">
            <Globe size={14} className="text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">CDN Active</span>
          </div>
        </div>
      </div>
      
      {/* Main Uploader Area */}
      <div className="bg-zinc-900/30 border border-white/[0.05] rounded-[2.5rem] p-2 backdrop-blur-sm">
        <BulkUploader />
      </div>

      {/* Feature Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfoCard 
          icon={Zap} 
          title="Client-Side Transcode" 
          desc="Your browser converts MP3s to HLS chunks automatically. No server CPU required."
          color="brand"
        />
        <InfoCard 
          icon={Globe} 
          title="Global Edge Delivery" 
          desc="Content is instantly cached at Cloudflare's 300+ edge locations worldwide."
          color="blue"
        />
        <InfoCard 
          icon={ShieldCheck} 
          title="Zero Egress Fees" 
          desc="Enterprise-grade R2 storage ensures you never pay for bandwidth spikes."
          color="green"
        />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, desc, color }: any) {
  const colors: any = {
    brand: "text-brand bg-brand/10 border-brand/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-green-500 bg-green-500/10 border-green-500/20",
  };

  return (
    <div className="p-8 rounded-[2rem] bg-black border border-white/[0.05] hover:border-white/10 transition-colors group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${colors[color]} group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  );
}
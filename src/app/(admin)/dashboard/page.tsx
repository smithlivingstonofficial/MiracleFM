import { createClient } from "@/lib/supabase/server";
import { Music, Users, PlayCircle, Server, Activity, ArrowUpRight, HardDrive, TrendingUp, Disc } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { r2 } from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

// Force dynamic to get real-time stats every refresh
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Parallel Data Fetching
  const [tracksRes, artistsRes, recentRes, topRes, allPlaysRes] = await Promise.all([
    // Counts
    supabase.from("tracks").select("*", { count: 'exact', head: true }),
    supabase.from("artists").select("*", { count: 'exact', head: true }),
    
    // Recent Uploads
    supabase.from("tracks")
      .select("*, artists(name)")
      .order("created_at", { ascending: false })
      .limit(5),

    // Top Performing Tracks (Real Trends)
    supabase.from("tracks")
      .select("*, artists(name)")
      .order("play_count", { ascending: false }) // Assumes you increment this on play
      .limit(4),

    // Calculate Total Streams (Lightweight fetch)
    supabase.from("tracks").select("play_count")
  ]);

  const trackCount = tracksRes.count || 0;
  const artistCount = artistsRes.count || 0;
  const recentTracks = recentRes.data || [];
  const topTracks = topRes.data || [];
  
  // Calculate Total Streams from DB
  const totalStreamsCount = allPlaysRes.data?.reduce((acc, curr) => acc + (curr.play_count || 0), 0) || 0;
  
  // Format numbers (e.g. 1200 -> 1.2k)
  const fmt = (n: number) => Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(n);

  // 2. Real-Time Storage Calculation (R2)
  let storageUsed = "0 MB";
  try {
    const listObjects = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME }));
    if (listObjects.Contents) {
      const totalBytes = listObjects.Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
      const mb = totalBytes / (1024 * 1024);
      storageUsed = mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
    }
  } catch (e) {
    storageUsed = "N/A";
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/[0.05] pb-8 gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Dashboard</h2>
          <p className="text-zinc-500 mt-2 font-medium">Real-time platform metrics.</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-green-500/10 rounded-full border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-black text-green-500 uppercase tracking-widest">Live Status: Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Tracks" 
          value={fmt(trackCount)} 
          icon={Music} 
          trend="Library Size"
        />
        <StatCard 
          label="Active Artists" 
          value={fmt(artistCount)} 
          icon={Users} 
          trend="Roster"
        />
        <StatCard 
          label="Total Streams" 
          value={fmt(totalStreamsCount)} 
          icon={PlayCircle} 
          trend="All-time Plays"
          highlight
        />
        <StatCard 
          label="Storage Used" 
          value={storageUsed} 
          icon={HardDrive} 
          trend="Cloudflare R2"
        />
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Recent Activity Feed */}
        <div className="lg:col-span-2 bg-zinc-900/30 border border-white/[0.05] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-zinc-900/50">
            <h3 className="text-lg font-bold flex items-center gap-3 text-white">
              <Activity size={20} className="text-[#FF0055]" />
              Latest Ingestion
            </h3>
            <Link href="/admin-tracks" className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">
              Manage Library
            </Link>
          </div>
          
          <div className="p-4 space-y-2">
            {recentTracks.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No tracks uploaded yet.</div>
            ) : (
              recentTracks.map((track) => (
                <div 
                  key={track.id} 
                  className="group flex items-center justify-between p-4 hover:bg-white/[0.03] rounded-2xl transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                >
                  <div className="flex items-center gap-5">
                    <div className="relative w-14 h-14 bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 group-hover:border-[#FF0055]/30 transition-colors shadow-lg">
                       {track.cover_url ? (
                         <Image src={track.cover_url} alt="" fill className="object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-zinc-800">
                           <Music size={24} />
                         </div>
                       )}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm group-hover:text-[#FF0055] transition-colors line-clamp-1">{track.title}</p>
                      <p className="text-xs text-zinc-500 mt-1 font-medium">{track.artists?.name || "Unknown"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className="hidden sm:block text-[10px] font-bold text-zinc-600 px-3 py-1 bg-black rounded-full border border-white/5">
                      {new Date(track.created_at).toLocaleDateString()}
                    </span>
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-[#FF0055] group-hover:border-[#FF0055] transition-all shadow-lg">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Trending / Top Tracks (Replaces simple upload button) */}
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/[0.05] rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF0055]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-[#FF0055]" />
              Trending Now
            </h3>
          </div>

          <div className="relative z-10 space-y-4 flex-1">
            {topTracks.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No play data yet.</p>
            ) : (
              topTracks.map((track, i) => (
                <div key={track.id} className="flex items-center gap-4 group cursor-default">
                  <span className={`text-lg font-black w-4 text-center ${i === 0 ? "text-[#FF0055]" : "text-zinc-700"}`}>
                    {i + 1}
                  </span>
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-white/5">
                    {track.cover_url ? <Image src={track.cover_url} alt="" fill className="object-cover" /> : <Disc size={20} className="m-auto text-zinc-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-[#FF0055] transition-colors">{track.title}</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{fmt(track.play_count)} Plays</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
             <Link 
               href="/admin-tracks" 
               className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
             >
               Full Analytics <ArrowUpRight size={14} />
             </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

// Reusable Stat Card
function StatCard({ label, value, icon: Icon, trend, highlight = false }: any) {
  return (
    <div className={`
      relative p-8 rounded-[2.5rem] border transition-all duration-300 group overflow-hidden
      ${highlight 
        ? "bg-[#FF0055] text-white border-[#FF0055] shadow-[0_20px_40px_-10px_rgba(255,0,85,0.5)]" 
        : "bg-zinc-900/40 border-white/[0.05] hover:border-white/10 hover:bg-zinc-900/60"}
    `}>
      {!highlight && <div className="absolute -right-4 -bottom-4 text-white/[0.02] transform rotate-12 group-hover:scale-110 transition-transform duration-500"><Icon size={120} /></div>}

      <div className="flex justify-between items-start relative z-10">
        <div className={`p-3.5 rounded-2xl ${highlight ? "bg-white/20 backdrop-blur-md text-white" : "bg-black border border-white/10 text-zinc-500 group-hover:text-[#FF0055] group-hover:border-[#FF0055]/30"} transition-colors`}>
          <Icon size={22} />
        </div>
        {trend && (
          <span className={`text-[10px] font-black uppercase tracking-widest ${highlight ? "text-white/80" : "text-zinc-600"}`}>
            {trend}
          </span>
        )}
      </div>
      
      <div className="mt-8 relative z-10">
        <h3 className={`text-5xl font-black tracking-tighter leading-none ${highlight ? "text-white" : "text-white"}`}>
          {value}
        </h3>
        <p className={`text-xs font-bold uppercase tracking-widest mt-3 ${highlight ? "text-white/80" : "text-zinc-500"}`}>
          {label}
        </p>
      </div>
    </div>
  )
}
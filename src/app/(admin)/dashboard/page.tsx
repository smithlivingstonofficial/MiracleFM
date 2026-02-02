import { createClient } from "@/lib/supabase/server";
import { Music, Users, PlayCircle, Server, Activity, ArrowUpRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch Real Data
  const { count: trackCount } = await supabase.from("tracks").select("*", { count: 'exact', head: true });
  const { count: artistCount } = await supabase.from("artists").select("*", { count: 'exact', head: true });
  const { data: recentTracks } = await supabase
    .from("tracks")
    .select("*, artists(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-12">
      
      {/* Header */}
      <div className="flex items-end justify-between border-b border-border pb-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Dashboard</h2>
          <p className="text-text-muted mt-2 font-medium">Real-time platform overview & analytics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Systems Nominal</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Tracks" 
          value={trackCount || 0} 
          icon={Music} 
          trend="+4 this week"
        />
        <StatCard 
          label="Active Artists" 
          value={artistCount || 0} 
          icon={Users} 
          trend="Stable"
        />
        <StatCard 
          label="Total Streams" 
          value="12.8K" 
          icon={PlayCircle} 
          trend="+12% vs last month"
          highlight
        />
        <StatCard 
          label="Storage (R2)" 
          value="1.2 GB" 
          icon={Server} 
          trend="0.5% of quota"
        />
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-panel border border-border rounded-3xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity size={18} className="text-brand" />
              Recent Uploads
            </h3>
            <button className="text-xs font-bold text-text-muted hover:text-brand transition-colors">
              View All Library
            </button>
          </div>
          
          <div className="p-2">
            {recentTracks?.map((track) => (
              <div 
                key={track.id} 
                className="group flex items-center justify-between p-4 hover:bg-white/[0.02] rounded-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-5">
                  <div className="relative w-14 h-14 bg-zinc-900 rounded-xl overflow-hidden border border-border group-hover:border-border-hover transition-colors">
                     {track.cover_url ? (
                       <img src={track.cover_url} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-zinc-700">
                         <Music size={20} />
                       </div>
                     )}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm group-hover:text-brand transition-colors line-clamp-1">{track.title}</p>
                    <p className="text-xs text-text-muted mt-1">{track.artists?.name || "Unknown Artist"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className="hidden sm:block text-xs font-medium text-text-dim px-3 py-1 bg-white/[0.02] rounded-full">
                    {new Date(track.created_at).toLocaleDateString()}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-muted group-hover:text-white group-hover:bg-brand group-hover:border-brand transition-all">
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Mini Chart */}
        <div className="bg-gradient-to-br from-panel to-surface border border-border rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Quick Upload</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Drag and drop MP3s here to instantly start the HLS transcoding pipeline.
            </p>
          </div>

          <div className="mt-8 border-2 border-dashed border-border hover:border-brand/50 rounded-2xl h-48 flex flex-col items-center justify-center transition-colors cursor-pointer group bg-surface/50">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-text-muted group-hover:text-brand group-hover:scale-110 transition-all shadow-xl">
              <ArrowUpRight size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-dim mt-4 group-hover:text-text-muted transition-colors">
              Click to browse
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-component for Stats to keep code clean
function StatCard({ label, value, icon: Icon, trend, highlight = false }: any) {
  return (
    <div className={`
      relative p-8 rounded-[2rem] border transition-all duration-300 group
      ${highlight 
        ? "bg-brand text-white border-brand shadow-xl shadow-brand/20" 
        : "bg-panel border-border hover:border-border-hover"}
    `}>
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${highlight ? "bg-white/20" : "bg-surface border border-border"}`}>
          <Icon size={20} className={highlight ? "text-white" : "text-text-muted group-hover:text-brand transition-colors"} />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? "text-white/80" : "text-text-dim"}`}>
            {trend}
          </span>
        )}
      </div>
      
      <div className="mt-6">
        <h3 className={`text-5xl font-black tracking-tighter ${highlight ? "text-white" : "text-white"}`}>
          {value}
        </h3>
        <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${highlight ? "text-white/70" : "text-text-dim"}`}>
          {label}
        </p>
      </div>
    </div>
  )
}
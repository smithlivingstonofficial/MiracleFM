"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, LogOut, ShieldCheck, Heart, ListMusic, 
  Sparkles, Loader2, Edit3, LayoutDashboard 
} from "lucide-react";
import TasteProfileModal from "@/components/user/TasteProfileModal";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("listener");
  const [stats, setStats] = useState({ likes: 0, playlists: 0 });
  const [genres, setGenres] = useState<string[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/signin");
      return;
    }
    setUser(user);

    // Fetch all user-related data in parallel
    const[profileRes, likesRes, playlistsRes, interestsRes] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase.from("user_likes").select("*", { count: 'exact', head: true }).eq("user_id", user.id),
      supabase.from("playlists").select("*", { count: 'exact', head: true }).eq("user_id", user.id),
      supabase.from("user_interests").select("genres").eq("user_id", user.id).single(),
    ]);

    if (profileRes.data) setRole(profileRes.data.role);
    setStats({
      likes: likesRes.count || 0,
      playlists: playlistsRes.count || 0,
    });
    if (interestsRes.data?.genres) setGenres(interestsRes.data.genres);
    
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // Force full reload to clear cache
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchUserData(); // Refresh genres after closing modal
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="animate-spin text-[#FF0055] w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen pb-32 bg-[#050505] relative overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#FF0055]/10 to-transparent blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-10 pt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-full shadow-lg">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-3 px-4 py-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-bold"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* --- 1. USER IDENTITY CARD (Hero Bento) --- */}
          <div className="md:col-span-8 relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 group">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 pointer-events-none" />
            
            {/* Avatar */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2rem] overflow-hidden bg-black border-4 border-zinc-800 shadow-[0_0_40px_rgba(255,0,85,0.2)] shrink-0 group-hover:border-[#FF0055]/50 transition-colors duration-500">
              {user?.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="Profile" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-600">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF0055]/10 border border-[#FF0055]/20 text-[#FF0055] text-[10px] font-black uppercase tracking-widest mb-4">
                <ShieldCheck size={14} /> 
                {role === "admin" ? "System Administrator" : "Premium Member"}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter truncate w-full">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </h1>
              <p className="text-zinc-400 font-medium mt-2">{user?.email}</p>
              
              {role === "admin" && (
                <Link href="/dashboard" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 transition-transform shadow-xl">
                  <LayoutDashboard size={16} /> Open Pro Console
                </Link>
              )}
            </div>
          </div>

          {/* --- 2. MUSICAL IDENTITY (Genres Bento) --- */}
          <div className="md:col-span-4 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 via-black to-[#FF0055]/10 border border-white/5 shadow-2xl p-8 flex flex-col">
             <div className="flex items-start justify-between mb-6 z-10 relative">
               <div className="w-12 h-12 rounded-2xl bg-[#FF0055]/20 text-[#FF0055] flex items-center justify-center">
                 <Sparkles size={24} />
               </div>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="p-2.5 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                 title="Edit Preferences"
               >
                 <Edit3 size={16} />
               </button>
             </div>
             
             <div className="flex-1 relative z-10">
               <h3 className="text-2xl font-black text-white tracking-tight mb-2">Taste Profile</h3>
               <p className="text-xs text-zinc-400 font-medium mb-6">Your personalized daily mix is built on these styles.</p>
               
               <div className="flex flex-wrap gap-2">
                 {genres.length > 0 ? (
                   genres.map((g) => (
                     <span key={g} className="px-3 py-1.5 rounded-lg bg-black border border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-300">
                       {g}
                     </span>
                   ))
                 ) : (
                   <button onClick={() => setIsModalOpen(true)} className="text-sm font-bold text-[#FF0055] hover:underline">
                     Tap to set up your profile
                   </button>
                 )}
               </div>
             </div>
          </div>

          {/* --- 3. STATS: LIKED SONGS --- */}
          <Link href="/library/liked" className="md:col-span-6 relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 shadow-2xl p-8 group hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Heart size={32} className="text-white fill-white" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">Collection</p>
                <h3 className="text-3xl font-black text-white tracking-tight">Liked Songs</h3>
                <p className="text-sm text-zinc-400 font-medium mt-1">{stats.likes} Saved Tracks</p>
              </div>
            </div>
          </Link>

          {/* --- 4. STATS: USER PLAYLISTS --- */}
          <Link href="/library" className="md:col-span-6 relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 shadow-2xl p-8 group hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-800 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/5">
                <ListMusic size={32} className="text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">Library</p>
                <h3 className="text-3xl font-black text-white tracking-tight">My Playlists</h3>
                <p className="text-sm text-zinc-400 font-medium mt-1">{stats.playlists} Custom Collections</p>
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* Render the Taste Profile Modal */}
      <TasteProfileModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        initialGenres={genres} // Pass current genres so they aren't lost
      />
    </div>
  );
}

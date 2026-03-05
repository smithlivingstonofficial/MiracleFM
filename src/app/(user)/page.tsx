import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/user/HeroSection";
import HomeHeader from "@/components/user/home/HomeHeader";
import DailyMixSection from "@/components/user/home/DailyMixSection";
import EditorialSection from "@/components/user/home/EditorialSection";
import NewReleasesSection from "@/components/user/home/NewReleasesSection";
import PopularArtistsSection from "@/components/user/home/PopularArtistsSection";
import HomeFooter from "@/components/user/home/HomeFooter";

export const revalidate = 0; 

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Data Fetching
  const [bannersRes, playlistsRes, artistsRes, albumsRes] = await Promise.all([
    supabase.from("banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").is("user_id", null).limit(6),
    supabase.from("artists").select("*").limit(12),
    supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  // 2. Daily Mix Logic
  let dailyMix: any[] = [];
  if (user) {
    const { data: mixData } = await supabase.rpc('get_personalized_mix', { uid: user.id, limit_count: 20 });
    if (mixData && mixData.length > 0) {
      const { data: enrichedTracks } = await supabase
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .in("id", mixData.map((t: any) => t.id));
      dailyMix = enrichedTracks || [];
    }
  }

  // Note: "Greeting" logic is now handled internally by <HomeHeader /> for animation

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[500px] md:h-[600px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] right-[-50px] md:top-[-200px] md:right-[-100px] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#FF0055]/10 md:bg-[#FF0055]/5 rounded-full blur-[100px] md:blur-[120px] pointer-events-none -z-10" />

      {/* 1. Header (Animated Blessings & Logo) */}
      <HomeHeader user={user} />

      {/* 2. Hero & Mix Grid */}
      <div className="px-4 md:px-8 mt-4 md:mt-6 mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Hero Slider */}
          <div className="lg:col-span-2 w-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
             <HeroSection banners={bannersRes.data || []} />
          </div>

          {/* Daily Mix Card */}
          <DailyMixSection user={user} dailyMix={dailyMix} />
        </div>
      </div>

      {/* 3. Sections Stack */}
      <div className="space-y-16 md:space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-forwards">
        
        <EditorialSection playlists={playlistsRes.data || []} />
        
        <NewReleasesSection albums={albumsRes.data || []} />
        
        <PopularArtistsSection artists={artistsRes.data || []} />

      </div>

      {/* 4. Footer */}
      <HomeFooter />
    </div>
  );
}
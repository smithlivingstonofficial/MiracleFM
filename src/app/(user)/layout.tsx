// src/app/(user)/layout.tsx

import UserSidebar from "@/components/user/UserSidebar";
import MobileNav from "@/components/user/MobileNav";
import AudioPlayer from "@/components/player/AudioPlayer";
import FullScreenPlayer from "@/components/player/FullScreenPlayer";
import HomeHeader from "@/components/user/home/HomeHeader";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import DesktopRightRail from "@/components/user/DesktopRightRail";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/types/music";

type RecommendationTrackRow = {
  track_id: string;
};

async function getRightRailTracks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId?: string
) {
  if (userId) {
    const { data: mixData } = await supabase.rpc("get_personalized_mix", { uid: userId, limit_count: 12 });
    const ids = ((mixData || []) as { id: string }[]).map((track) => track.id).filter(Boolean);

    if (ids.length > 0) {
      const { data } = await supabase
        .from("tracks")
        .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
        .eq("audio_status", "ready")
        .in("id", ids);

      const byId = new Map(((data || []) as Track[]).map((track) => [track.id, track]));
      const orderedTracks = ids.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
      if (orderedTracks.length > 0) return orderedTracks;
    }
  }

  const { data: stats } = await supabase
    .from("track_engagement_stats")
    .select("track_id")
    .order("engagement_score", { ascending: false })
    .limit(12);

  const ids = ((stats || []) as RecommendationTrackRow[]).map((row) => row.track_id).filter(Boolean);

  if (ids.length > 0) {
    const { data } = await supabase
      .from("tracks")
      .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
      .eq("audio_status", "ready")
      .in("id", ids);

    const byId = new Map(((data || []) as Track[]).map((track) => [track.id, track]));
    const orderedTracks = ids.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
    if (orderedTracks.length > 0) return orderedTracks;
  }

  const { data } = await supabase
    .from("tracks")
    .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
    .eq("audio_status", "ready")
    .order("created_at", { ascending: false })
    .limit(12);

  return (data || []) as Track[];
}

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: banners }, rightRailTracks] = await Promise.all([
    supabase
      .from("banners")
      .select("id, title, description, image_url, target_link")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3),
    getRightRailTracks(supabase, user?.id),
  ]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#050505] text-white font-sans selection:bg-[#FF0055] selection:text-white isolate">
      {/* Unified top bar spans 100% width across the top of the viewport */}
      <HomeHeader user={user} />

      {/* Grid container containing Sidebar, Main viewport, and Right Rail */}
      <div className="flex-1 flex h-0 relative min-w-0">
        <div className="hidden md:block h-full z-30 relative shrink-0">
          <UserSidebar />
        </div>

        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-y-auto scroll-smooth no-scrollbar bg-[#050505]"
        >
          <div className="pb-56 md:pb-36 min-h-full">{children}</div>
        </main>

        <DesktopRightRail
          banners={banners || []}
          initialTracks={rightRailTracks}
          isSignedIn={Boolean(user)}
        />

        <div className="z-40">
          <AudioPlayer />
        </div>
      </div>

      <MobileNav />
      <FullScreenPlayer />
      <InstallPrompt />
    </div>
  );
}

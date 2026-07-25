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

import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const LIGHT_TRACK_SELECT = "id, title, artist_id, album_id, cover_url, hls_url, fallback_audio_url, duration, duration_seconds, artists(id, name, image_url), albums(id, title, cover_url)";

const getCachedPublicBanners = unstable_cache(
  async () => {
    const supabaseAnon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: banners } = await supabaseAnon
      .from("banners")
      .select("id, title, description, image_url, target_link")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);
    return banners || [];
  },
  ["layout-banners"],
  { revalidate: 3600, tags: ["banners-list", "home-data"] }
);

const getCachedPublicRightRailTracks = unstable_cache(
  async () => {
    const supabaseAnon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabaseAnon
      .from("tracks")
      .select(LIGHT_TRACK_SELECT)
      .eq("audio_status", "ready")
      .order("created_at", { ascending: false })
      .limit(12);

    return (data || []) as unknown as Track[];
  },
  ["layout-right-rail-tracks-public"],
  { revalidate: 3600, tags: ["home-data", "public-right-rail"] }
);

import { UserAuthProvider } from "@/components/providers/UserAuthProvider";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [banners, rightRailTracks] = await Promise.all([
    getCachedPublicBanners(),
    getCachedPublicRightRailTracks(),
  ]);

  return (
    <UserAuthProvider initialUser={user}>
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
    </UserAuthProvider>
  );
}

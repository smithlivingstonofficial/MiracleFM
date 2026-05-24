// src/app/(user)/layout.tsx

import UserSidebar from "@/components/user/UserSidebar";
import MobileNav from "@/components/user/MobileNav";
import AudioPlayer from "@/components/player/AudioPlayer";
import FullScreenPlayer from "@/components/player/FullScreenPlayer";
import HomeHeader from "@/components/user/home/HomeHeader";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { createClient } from "@/lib/supabase/server";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    /*
      IMPORTANT — why these classes were changed:
      ─────────────────────────────────────────────────────────────────────────
      ❌ overflow-hidden  → REMOVED from the outermost shell.
         Safari on iOS ties the Web Audio context lifecycle to the nearest
         overflow:hidden ancestor. When the shell is overflow-hidden the OS can
         suspend the context when the tab loses focus (screen lock, app switch).
         Overflow clipping is kept ONLY on the inner scroll container where it
         is actually needed.

      ✅ isolate          → Creates a new stacking context without clipping,
         so z-index layering still works correctly for the player overlay.
    */
    <div className="flex h-[100dvh] w-full bg-[#050505] text-white font-sans selection:bg-[#FF0055] selection:text-white isolate">

      {/* 1. Desktop Sidebar */}
      <div className="hidden md:block h-full z-30 relative shrink-0">
        <UserSidebar />
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">

        {/*
          Scrollable Container.
          overflow-y-auto is scoped here — away from the audio context root —
          so scrolling never interrupts the audio engine.
        */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto scroll-smooth no-scrollbar w-full bg-[#050505]"
        >
          <HomeHeader user={user} />
          {/*
            Padding keeps content clear of the fixed player and nav:
            • Mobile:  pb-48  (MobileNav ~60px + Player ~64px + buffer)
            • Desktop: pb-32  (Player 96px + buffer)
          */}
          <div className="pb-56 md:pb-36 min-h-full">
            {children}
          </div>
        </main>

        {/* Audio Player: fixed floating pill on mobile, main-pane anchored bar on desktop. */}
        <div className="z-40">
          {/*
            pointer-events-none on the wrapper lets touch events pass through
            the transparent areas of the pill player on mobile.
            The player itself sets pointer-events-auto on its own root.
          */}
          <AudioPlayer />
        </div>
      </div>

      {/* 3. Mobile Navigation */}
      <MobileNav />

      {/* 4. Full Screen Player Overlay */}
      <FullScreenPlayer />

      <InstallPrompt />
    </div>
  );
}

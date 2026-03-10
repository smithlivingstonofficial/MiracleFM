import UserSidebar from "@/components/user/UserSidebar";
import MobileNav from "@/components/user/MobileNav";
import AudioPlayer from "@/components/player/AudioPlayer";
import FullScreenPlayer from "@/components/player/FullScreenPlayer";
import { Analytics } from "@vercel/analytics/next"

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    // Changed h-screen to h-[100dvh] for better mobile browser support
    <div className="flex h-[100dvh] w-full bg-[#050505] text-white overflow-hidden font-sans selection:bg-[#FF0055] selection:text-white">
      
      {/* 1. Desktop Sidebar (Fixed Left) */}
      <div className="hidden md:block h-full z-30 relative shrink-0">
        <UserSidebar />
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* 
           Scrollable Container 
           - id="main-content" allows for potential "scroll to top" features later
        */}
        <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth no-scrollbar w-full bg-[#050505]">
          {/* 
             Padding Logic:
             - Mobile: pb-48 (Nav Height + Player Height + Buffer)
             - Desktop: pb-32 (Player Height + Buffer)
          */}
          <div className="pb-48 md:pb-32 min-h-full">
            {children}
          </div>
        </main>

        {/* Player Overlay (Z-Index ensures it sits above scrolling content) */}
        <div className="z-40">
          <AudioPlayer />
        </div>
      </div>

      {/* 3. Mobile Navigation (Fixed Bottom) */}
      <MobileNav />
      
      {/* 4. Full Screen Overlay (Highest Z-Index) */}
      <FullScreenPlayer />
      <Analytics />
    </div>
  );
}
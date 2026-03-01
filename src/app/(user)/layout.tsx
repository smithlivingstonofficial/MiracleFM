// src/app/(user)/layout.tsx

import UserSidebar from "@/components/user/UserSidebar";
import MobileNav from "@/components/user/MobileNav";
import AudioPlayer from "@/components/player/AudioPlayer";
import FullScreenPlayer from "@/components/player/FullScreenPlayer";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans selection:bg-[#FF0055] selection:text-white">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <div className="hidden md:block h-full z-30 relative">
        <UserSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <main className="flex-1 overflow-y-auto scroll-smooth no-scrollbar w-full">
          {/* 
             Mobile Padding: pb-48 (Space for Nav + Player) 
             Desktop Padding: pb-32 (Space for Player only)
          */}
          <div className="pb-48 md:pb-32 min-h-full">
            {children}
          </div>
        </main>

        {/* Player Overlay */}
        <div className="z-40">
          <AudioPlayer />
        </div>
      </div>

      {/* Mobile Navigation (Fixed Bottom) */}
      <MobileNav />
      
      {/* Full Screen Overlay */}
      <FullScreenPlayer />
    </div>
  );
}
import UserSidebar from "@/components/user/UserSidebar";
import MobileNav from "@/components/user/MobileNav";
import AudioPlayer from "@/components/player/AudioPlayer";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden selection:bg-[#FF0055] selection:text-white font-sans">
      
      {/* 1. Desktop Sidebar (Fixed Left) */}
      <div className="hidden md:block h-full z-30 relative">
        <UserSidebar />
      </div>

      {/* 2. Main Content Area (Scrollable) */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto scroll-smooth no-scrollbar w-full">
          {/* 
             IMPORTANT: pb-[120px] ensures the last song is visible 
             above the fixed player bar.
          */}
          <div className="pb-[120px] min-h-full">
            {children}
          </div>
        </main>

        {/* 3. The Player (Fixed Overlay on top of content at the bottom) */}
        <div className="absolute bottom-0 left-0 right-0 z-50">
          <AudioPlayer />
        </div>
        
      </div>

      {/* 4. Mobile Navigation (Fixed Bottom, below Player on mobile) */}
      <MobileNav />
    </div>
  );
}
import UserSidebar from "@/components/user/UserSidebar";
import MobileNav from "@/components/user/MobileNav";
import AudioPlayer from "@/components/player/AudioPlayer";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden selection:bg-[#FF0055] selection:text-white">
      {/* Desktop Sidebar */}
      <UserSidebar />

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto relative pb-32 scroll-smooth no-scrollbar">
        {children}
      </main>

      {/* Persistent Components */}
      <AudioPlayer />
      <MobileNav />
    </div>
  );
}
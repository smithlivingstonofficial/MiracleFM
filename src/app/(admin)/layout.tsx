import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AudioPlayer from "@/components/player/AudioPlayer";
import AdminSidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Role Check
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      {/* Sidebar (Fixed Height, Sticky) */}
      <AdminSidebar />
      
      {/* Main Content (Scrollable) */}
      <main className="flex-1 overflow-y-auto relative min-w-0">
        <div className="p-8 lg:p-12 pb-32">
          <div className="max-w-[1600px] mx-auto w-full animate-in fade-in duration-700">
            {children}
          </div>
        </div>
      </main>

      {/* Audio Player (Floating on top of everything) */}
      <div className="z-[100] relative">
         <AudioPlayer />
      </div>
    </div>
  );
}
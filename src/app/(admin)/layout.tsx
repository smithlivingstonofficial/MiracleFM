import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AudioPlayer from "@/components/player/AudioPlayer";
import AdminSidebar from "@/components/admin/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Role Check
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden text-white isolate">
      <AdminSidebar />

      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <div className="flex-1 overflow-y-auto scroll-smooth min-w-0">
          <div className="p-8 pb-40 lg:p-12 lg:pb-40">
            <div className="max-w-[1600px] mx-auto w-full animate-in fade-in duration-700">
              {children}
            </div>
          </div>
        </div>

        <div className="z-[100]">
          <AudioPlayer />
        </div>
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AudioPlayer from "@/components/player/AudioPlayer";
import AdminSidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen bg-surface font-sans">
      {/* Sidebar is fixed height, sticky */}
      <AdminSidebar />
      
      {/* Main Content scrolls independently */}
      <main className="flex-1 flex flex-col relative min-w-0 overflow-x-hidden">
        <div className="flex-1 p-8 lg:p-12 pb-32">
          <div className="max-w-[1600px] mx-auto w-full animate-in fade-in duration-700">
            {children}
          </div>
        </div>
      </main>

      <AudioPlayer />
    </div>
  );
}
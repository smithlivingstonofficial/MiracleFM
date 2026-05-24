import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileExperience from "@/components/user/ProfileExperience";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const [profileRes, likesRes, playlistsRes, interestsRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("user_likes").select("track_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("playlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_interests").select("genres").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <ProfileExperience
      user={{
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Listener",
        avatarUrl: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at,
      }}
      role={profileRes.data?.role || "listener"}
      stats={{
        likes: likesRes.count || 0,
        playlists: playlistsRes.count || 0,
      }}
      genres={Array.isArray(interestsRes.data?.genres) ? interestsRes.data.genres : []}
    />
  );
}

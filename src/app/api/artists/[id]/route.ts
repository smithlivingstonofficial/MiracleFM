import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File } from "@/lib/r2-helpers";
import { deleteTrackMedia } from "@/lib/track-media-cleanup";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  const { deleteMode } = await req.json(); // 'orphan' or 'cascade'

  try {
    // 2. Fetch Artist details (for image)
    const { data: artist } = await supabase.from("artists").select("image_url").eq("id", id).single();

    if (deleteMode === 'cascade') {
      // --- CASCADE MODE: Deep Clean ---
      
      // A. Find all tracks associated with this artist
      const { data: tracks } = await supabase.from("tracks").select("id").eq("artist_id", id);

      if (tracks && tracks.length > 0) {
        for (const track of tracks) {
          await deleteTrackMedia(supabase, track.id, { strict: true });
        }
        
        const trackIds = tracks.map(t => t.id);
        await supabase.from("tracks").delete().in("id", trackIds);
      }
    }

    // 3. Delete Artist Image
    if (artist?.image_url) {
      await deleteR2File(artist.image_url);
    }

    // 4. Delete Artist Record
    const { error } = await supabase.from("artists").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

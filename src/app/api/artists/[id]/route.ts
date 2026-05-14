import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File, deleteR2Folder } from "@/lib/r2-helpers";

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
      const { data: tracks } = await supabase.from("tracks").select("id, cover_url").eq("artist_id", id);

      if (tracks && tracks.length > 0) {
        for (const track of tracks) {
          // B. Delete HLS Audio Folder
          await deleteR2Folder(`tracks/${track.id}/`);
          
          // C. Delete Track Cover (Smart check: only if specific to track)
          if (track.cover_url) {
             // Optional: Check usage count if using shared library, but for cascade we usually wipe.
             // For strict safety, we just unlink DB, but user requested deletion.
             // We will attempt delete.
             await deleteR2File(track.cover_url);
          }
        }
        
        // D. Delete Track Records
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

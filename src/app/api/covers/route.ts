import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2File } from "@/lib/r2-helpers";

// DELETE method: Force delete a cover and unlink from ALL tracks
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { coverUrl } = await req.json();

  if (!coverUrl) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

  try {
    // 1. Unlink from all tracks
    await supabase.from("tracks").update({ cover_url: null }).eq("cover_url", coverUrl);
    
    // 2. Unlink from all albums/artists (optional, if you use shared covers there too)
    
    // 3. Delete from R2
    await deleteR2File(coverUrl);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST method: Check usage and delete only if unused (Smart Clean)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { coverUrl } = await req.json();

  // Check how many tracks use this
  const { count } = await supabase.from("tracks").select("*", { count: 'exact', head: true }).eq("cover_url", coverUrl);

  // If 0 tracks use it (meaning we just unlinked the last one), delete file
  if (count === 0) {
    await deleteR2File(coverUrl);
    return NextResponse.json({ status: "deleted" });
  }
  
  return NextResponse.json({ status: "kept", count });
}
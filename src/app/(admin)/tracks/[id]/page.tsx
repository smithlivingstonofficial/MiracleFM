"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Upload, Image as ImageIcon, Loader2, Sparkles, Disc, Grid, User, Music, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildMediaUrl } from "@/lib/media";

// Standardized Genre List for consistency across the app
const GENRES = [
  "Worship", "Gospel", "Contemporary", "Instrumental", "Hymns", 
  "Christian Pop", "Tamil Christian", "Sermon", "Kids", "Devotional", "Live", "Acoustic"
];

type LibraryImage = {
  url: string;
  type: 'track' | 'artist' | 'album';
};

export default function TrackEditor() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Data State (Genre is now an array of strings)
  const [form, setForm] = useState({ 
    title: "", 
    artist_id: "", 
    album_id: "", 
    lyrics: "", 
    cover_url: "", 
    genre: [] as string[] // Changed to array
  });
  const [originalCover, setOriginalCover] = useState("");
  
  const [artists, setArtists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [coverLibrary, setCoverLibrary] = useState<LibraryImage[]>([]);

  useEffect(() => {
    async function init() {
      const [t, art, alb] = await Promise.all([
        supabase.from("tracks").select("*").eq("id", id).single(),
        supabase.from("artists").select("*").order("name"),
        supabase.from("albums").select("*").order("title")
      ]);
      
      if (t.data) {
        setForm({
          title: t.data.title || "",
          artist_id: t.data.artist_id || "",
          album_id: t.data.album_id || "",
          lyrics: t.data.lyrics || "",
          cover_url: t.data.cover_url || "",
          genre: t.data.genre || [] // Load genre array
        });
        setOriginalCover(t.data.cover_url || "");
      }
      if (art.data) setArtists(art.data);
      if (alb.data) setAlbums(alb.data);
      setLoading(false);
    }
    init();
  }, [id, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const path = `covers/${id}-${Date.now()}.jpg`;
      const res = await fetch("/api/upload", { 
        method: "POST", 
        body: JSON.stringify({ fileName: path, contentType: file.type }) 
      });
      if(!res.ok) throw new Error("API Error");
      const { url } = await res.json();
      
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      
      const publicUrl = buildMediaUrl(path);
      setForm(prev => ({ ...prev, cover_url: publicUrl }));
      toast.success("Artwork uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleGenre = (g: string) => {
    if (form.genre.includes(g)) {
      setForm({ ...form, genre: form.genre.filter(item => item !== g) });
    } else {
      setForm({ ...form, genre: [...form.genre, g] });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      // 1. Smart Cleanup Logic
      if (originalCover && originalCover !== form.cover_url) {
        await fetch('/api/covers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverUrl: originalCover })
        });
      }
      
      // 2. Prepare Payload
      const payload = {
        title: form.title,
        artist_id: form.artist_id || null,
        album_id: form.album_id || null,
        lyrics: form.lyrics,
        cover_url: form.cover_url || null,
        genre: form.genre // Save the array
      };

      const { error } = await supabase.from("tracks").update(payload).eq("id", id);
      if (error) throw error;
      
      toast.success("Track successfully synced");
      router.push("/admin-tracks");
    } catch (err: any) {
      toast.error(`Sync error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openCoverLibrary = async () => {
    const libraryMap = new Map<string, LibraryImage>();
    const { data: trackCovers } = await supabase.rpc('get_cover_art_usage');
    if (trackCovers) {
      trackCovers.forEach((c: any) => libraryMap.set(c.cover_url, { url: c.cover_url, type: 'track' }));
    }
    if (form.artist_id) {
      const art = artists.find(a => a.id === form.artist_id);
      if (art?.image_url) libraryMap.set(art.image_url, { url: art.image_url, type: 'artist' });
    }
    setCoverLibrary(Array.from(libraryMap.values()));
    setIsLibraryOpen(true);
  };

  const selectCoverFromLibrary = (url: string) => {
    setForm({ ...form, cover_url: url });
    setIsLibraryOpen(false);
    toast.success("Artwork linked from library");
  };

  const availableAlbums = albums.filter(a => a.artist_id === form.artist_id);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand w-10 h-10" /></div>;

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <div className="sticky top-6 z-40 bg-surface/90 backdrop-blur-xl p-4 -mx-4 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center justify-between">
          <button onClick={() => router.back()} className="group flex items-center gap-3 px-4 py-2 rounded-full text-zinc-500 hover:text-white transition-all font-bold">
            <div className="p-2 rounded-full bg-zinc-900 border border-white/10 group-hover:border-brand transition-colors"><ArrowLeft size={20} /></div>
            Back to Library
          </button>
          <div className="flex items-center gap-4">
            <button onClick={save} disabled={saving} className="bg-brand hover:bg-brand-hover text-white h-12 px-10 rounded-full font-black text-sm shadow-xl shadow-brand/20 transition-all active:scale-95 disabled:opacity-50">
              {saving ? "Syncing..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="group relative aspect-square rounded-[3rem] overflow-hidden bg-panel border-2 border-dashed border-white/10 hover:border-brand/40 transition-all shadow-2xl flex items-center justify-center">
              {form.cover_url ? (
                <Image src={form.cover_url} alt="Cover" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center"><Music size={64} className="text-zinc-800 mb-4" /><p className="text-[10px] font-black text-zinc-600 uppercase">No Selection</p></div>
              )}
              <label className="absolute inset-0 bg-brand/90 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                {uploadingImage ? <Loader2 size={32} className="animate-spin text-white" /> : <Upload size={32} className="text-white mb-2" />}
                <span className="font-black text-xs uppercase text-white">Upload New</span>
              </label>
            </div>
            <div className="space-y-3">
              <button onClick={openCoverLibrary} className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-panel border border-white/10 hover:border-brand/50 text-sm font-black uppercase"><Grid size={18} className="text-brand" /> Asset Library</button>
              <button onClick={() => setForm({...form, cover_url: ""})} className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-red-500">Remove Artwork</button>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 space-y-12">
            <div className="bg-panel rounded-[3rem] p-10 border border-white/5 space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl p-6 text-xl font-bold text-white outline-none focus:border-brand" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Artist</label>
                  <select value={form.artist_id} onChange={e => setForm({ ...form, artist_id: e.target.value, album_id: "" })} className="w-full bg-black border border-white/10 rounded-2xl p-6 font-bold text-white outline-none focus:border-brand appearance-none cursor-pointer">
                    <option value="">No Artist</option>
                    {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Album</label>
                  <select value={form.album_id} onChange={e => setForm({ ...form, album_id: e.target.value })} disabled={!form.artist_id} className="w-full bg-black border border-white/10 rounded-2xl p-6 font-bold text-white outline-none focus:border-brand appearance-none cursor-pointer disabled:opacity-30">
                    <option value="">{form.artist_id ? (availableAlbums.length > 0 ? "Select Album..." : "No albums found") : "Select Artist First"}</option>
                    {availableAlbums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            {/* --- NEW MULTI-SELECT GENRE UI --- */}
            <div className="bg-panel rounded-[3rem] p-10 border border-white/5 space-y-6">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">Genres & Moods</label>
              <div className="flex flex-wrap gap-3">
                {GENRES.map(g => {
                  const isSelected = form.genre.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={cn(
                        "px-4 py-2.5 rounded-full text-xs font-bold border-2 transition-all duration-300 active:scale-95 flex items-center gap-2.5",
                        isSelected 
                          ? "bg-brand border-transparent text-white shadow-lg shadow-brand/20" 
                          : "bg-black/20 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"
                      )}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-panel rounded-[3rem] p-8 border border-white/5">
               <textarea rows={8} value={form.lyrics} onChange={e => setForm({...form, lyrics: e.target.value})} className="w-full bg-transparent outline-none text-zinc-400 resize-none font-medium" placeholder="Paste Lyrics..." />
            </div>
          </div>
        </div>
      </div>

      {/* Library Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-panel border border-white/10 rounded-[3rem] shadow-2xl max-w-5xl w-full flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-2xl font-black">Asset Selector</h2>
              <button onClick={() => setIsLibraryOpen(false)} className="text-zinc-400 hover:text-white">Close</button>
            </div>
            <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 overflow-y-auto">
              {coverLibrary.map(item => (
                <div key={item.url} onClick={() => selectCoverFromLibrary(item.url)} className="group relative aspect-square rounded-[1.5rem] overflow-hidden cursor-pointer border-2 border-transparent hover:border-brand">
                  <Image src={item.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

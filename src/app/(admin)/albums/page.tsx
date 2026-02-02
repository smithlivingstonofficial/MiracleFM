"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Disc, Plus, Trash2, Upload, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [albumRes, artistRes] = await Promise.all([
      supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }),
      supabase.from("artists").select("id, name").order("name")
    ]);
    
    if (albumRes.data) setAlbums(albumRes.data);
    if (artistRes.data) setArtists(artistRes.data);
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function addAlbum() {
    if (!title.trim() || !artistId) return toast.error("Album title and Artist are required");
    setIsSubmitting(true);

    try {
      // 1. Create Album Record
      const { data: album, error: dbError } = await supabase
        .from("albums")
        .insert({ title, artist_id: artistId })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Upload Cover (if selected)
      if (imageFile && album) {
        const fileName = `albums/${album.id}-${Date.now()}.jpg`;
        
        const res = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({ fileName, contentType: imageFile.type }),
        });
        const { url } = await res.json();

        await fetch(url, { method: "PUT", body: imageFile, headers: { "Content-Type": imageFile.type } });

        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
        await supabase.from("albums").update({ cover_url: publicUrl }).eq("id", album.id);
      }

      toast.success("Album released successfully");
      // Reset Form
      setTitle("");
      setArtistId("");
      setImageFile(null);
      setPreviewUrl(null);
      fetchData();

    } catch (error) {
      toast.error("Failed to create album");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- UPDATED DELETE FUNCTION ---
  const deleteAlbum = async (id: string) => {
    if(!confirm("Delete this album? The cover art will also be deleted from storage.")) return;
    
    // Call API for cleanup
    const res = await fetch(`/api/albums/${id}`, { method: "DELETE" });
    
    if(res.ok) {
      toast.success("Album and cover deleted");
      fetchData();
    } else {
      toast.error("Failed to delete album");
    }
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <div>
        <h1 className="text-5xl font-black tracking-tighter text-white">Album Releases</h1>
        <p className="text-zinc-500 mt-2 font-medium text-lg">
          Group tracks into collections.
        </p>
      </div>

      {/* Creator Card */}
      <div className="bg-panel border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Cover Uploader */}
          <div className="shrink-0">
            <div className="group relative w-40 h-40 rounded-3xl bg-black border-2 border-dashed border-white/10 hover:border-brand/50 transition-all overflow-hidden flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" />
              ) : (
                <Disc size={40} className="text-zinc-700" />
              )}
              
              <label className="absolute inset-0 bg-brand/90 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                <Upload size={24} className="text-white mb-2" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Upload Art</span>
                <input type="file" hidden accept="image/*" onChange={handleImageSelect} />
              </label>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Album Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl p-5 text-lg font-bold text-white outline-none focus:border-brand transition-all placeholder:text-zinc-800"
                  placeholder="e.g. Sunday Service Vol.1"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Select Artist</label>
                <select 
                  value={artistId}
                  onChange={(e) => setArtistId(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl p-5 text-lg font-bold text-white outline-none focus:border-brand transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Choose Artist --</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={addAlbum} 
                disabled={isSubmitting}
                className="bg-brand hover:bg-brand-hover text-white h-14 px-10 rounded-full font-black text-sm shadow-lg shadow-brand/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" size={18} />}
                Create Album
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Album List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {albums.map((album) => (
          <div key={album.id} className="group bg-panel border border-white/[0.05] hover:border-white/10 p-4 rounded-[2rem] transition-all hover:-translate-y-1">
            <div className="aspect-square relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-4 shadow-lg">
              {album.cover_url ? (
                <Image src={album.cover_url} alt={album.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Disc size={40} />
                </div>
              )}
              
              <button 
                onClick={() => deleteAlbum(album.id)}
                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="px-2 pb-2">
              <h3 className="font-bold text-white text-lg truncate group-hover:text-brand transition-colors">{album.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <UserIcon size={12} className="text-zinc-500" />
                <p className="text-xs font-bold text-zinc-500">{album.artists?.name || "Various"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
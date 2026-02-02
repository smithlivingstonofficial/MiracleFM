"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, User as UserIcon, Trash2, Upload, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal"; // Import the modal

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([]);
  
  // Form State
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<any | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchArtists();
  }, []);

  async function fetchArtists() {
    const { data } = await supabase.from("artists").select("*").order("name");
    if (data) setArtists(data);
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function addArtist() {
    if (!name.trim()) return toast.error("Artist name is required");
    setIsSubmitting(true);

    try {
      const { data: artist, error: dbError } = await supabase.from("artists").insert({ name }).select().single();
      if (dbError) throw dbError;

      if (imageFile && artist) {
        const fileName = `artists/${artist.id}-${Date.now()}.jpg`;
        const res = await fetch("/api/upload", {
          method: "POST",
          body: JSON.stringify({ fileName, contentType: imageFile.type }),
        });
        const { url } = await res.json();

        await fetch(url, { method: "PUT", body: imageFile, headers: { "Content-Type": imageFile.type } });

        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
        await supabase.from("artists").update({ image_url: publicUrl }).eq("id", artist.id);
      }

      toast.success("Artist created successfully");
      setName("");
      setImageFile(null);
      setPreviewUrl(null);
      fetchArtists();
    } catch (error) {
      toast.error("Failed to create artist");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Functions to control the new Deletion Modal ---
  const openDeleteModal = (artist: any) => {
    setArtistToDelete(artist);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setArtistToDelete(null);
  };

  const handleConfirmDelete = async (deleteMode: "orphan" | "cascade") => {
    if (!artistToDelete) return;

    // Show a loading toast
    const promise = fetch(`/api/artists/${artistToDelete.id}`, { 
      method: "DELETE",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteMode })
    });
    
    toast.promise(promise, {
      loading: "Processing deletion...",
      success: (res) => {
        if (!res.ok) throw new Error("API request failed");
        fetchArtists(); // Refresh the list
        return `Artist "${artistToDelete.name}" and assets deleted.`;
      },
      error: "Failed to delete artist."
    });
    
    closeDeleteModal();
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div>
        <h1 className="text-5xl font-black tracking-tighter text-white">Artist Roster</h1>
        <p className="text-zinc-500 mt-2 font-medium text-lg">
          Manage profiles and default artwork for {artists.length} artists.
        </p>
      </div>

      {/* Creation Card */}
      <div className="bg-panel border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          <div className="shrink-0">
            <div className="group relative w-32 h-32 rounded-full bg-black border-2 border-dashed border-white/10 hover:border-brand/50 transition-all overflow-hidden flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={32} className="text-zinc-700" />
              )}
              
              <label className="absolute inset-0 bg-brand/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                <Upload size={20} className="text-white mb-1" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white">Upload</span>
                <input type="file" hidden accept="image/*" onChange={handleImageSelect} />
              </label>
            </div>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">New Artist Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl p-5 text-lg font-bold text-white outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all placeholder:text-zinc-800"
                placeholder="e.g. Hillsong Worship"
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={addArtist} 
                disabled={isSubmitting}
                className="bg-brand hover:bg-brand-hover text-white h-12 px-8 rounded-full font-black text-sm shadow-lg shadow-brand/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" size={18} />}
                Add to Roster
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Artist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists.map((artist) => (
          <div key={artist.id} className="group bg-panel border border-white/[0.05] hover:border-white/10 p-5 rounded-3xl flex items-center justify-between transition-all hover:-translate-y-1">
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0">
                {artist.image_url ? (
                  <Image src={artist.image_url} alt={artist.name} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <UserIcon size={24} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg group-hover:text-brand transition-colors">{artist.name}</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Artist</p>
              </div>
            </div>
            
            <button 
              onClick={() => openDeleteModal(artist)} // UPDATED to call modal
              className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      
      {/* The Modal is rendered here but only visible when isOpen is true */}
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        itemName={artistToDelete?.name || ""}
      />
    </div>
  );
}
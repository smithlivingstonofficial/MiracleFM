"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ImageIcon, Trash2, Search, Music, Loader2 } from "lucide-react";
import TextVerificationModal from "@/components/admin/TextVerificationModal";

export default function CoverManagerPage() {
  const [covers, setCovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverToDelete, setCoverToDelete] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchCoverUsage();
  }, []);

  async function fetchCoverUsage() {
    setLoading(true);
    const { data } = await supabase.rpc('get_cover_art_usage');
    if (data) setCovers(data);
    setLoading(false);
  }

  const openDeleteModal = (coverUrl: string) => {
    setCoverToDelete(coverUrl);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setCoverToDelete(null);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!coverToDelete) return;
    
    const promise = fetch('/api/covers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverUrl: coverToDelete })
    });

    toast.promise(promise, {
      loading: "Deleting asset and unlinking from tracks...",
      success: (res) => {
        if (!res.ok) throw new Error("API request failed");
        fetchCoverUsage();
        return "Cover art deleted successfully.";
      },
      error: "Failed to delete cover art."
    });

    closeDeleteModal();
  };
  
  const filteredCovers = covers.filter(cover => 
    cover.cover_url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white">Asset Library</h1>
            <p className="text-zinc-500 mt-2 font-medium text-lg">
              Manage all uploaded cover artwork.
            </p>
          </div>
          
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand transition-colors" size={20} />
            <input 
              placeholder="Search by URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-panel border border-white/[0.05] rounded-full py-3.5 pl-14 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand/20 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredCovers.map((cover) => (
              <div key={cover.cover_url} className="group relative aspect-square">
                <div className="absolute inset-0 rounded-[2rem] overflow-hidden border border-white/5 bg-panel shadow-lg transition-transform duration-500 group-hover:-translate-y-2">
                  <Image src={cover.cover_url} alt="Cover" fill className="object-cover" sizes="30vw" />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full w-fit">
                    <Music size={12} className="text-brand" />
                    <span className="text-xs font-bold">{cover.usage_count} Track(s)</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => openDeleteModal(cover.cover_url)}
                  className="absolute top-3 right-3 p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                  title="Delete this cover"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <TextVerificationModal
        isOpen={isModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Asset Deletion"
        description="This will permanently delete the cover art from R2 and unlink it from all associated tracks. This action is irreversible."
        confirmationText="DELETE"
      />
    </>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, Loader2, LayoutTemplate, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildMediaUrl } from "@/lib/media";

type Banner = {
  id: string;
  title: string;
  description: string | null;
  target_link: string | null;
  image_url: string;
  is_active: boolean;
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Could not load banners", { description: error.message });
    if (data) setBanners(data as Banner[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function addBanner() {
    if (!title.trim() || !imageFile) return toast.error("Title and Image are required");
    setIsSubmitting(true);

    try {
      const fileName = `banners/hero-${Date.now()}.jpg`;
      
      // 1. Upload to R2
      const res = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ fileName, contentType: imageFile.type }),
      });
      if (!res.ok) throw new Error("Could not create banner upload URL.");
      const { url } = await res.json();
      const uploadRes = await fetch(url, { method: "PUT", body: imageFile, headers: { "Content-Type": imageFile.type } });
      if (!uploadRes.ok) throw new Error("Banner image upload failed.");

      const publicUrl = buildMediaUrl(fileName);

      // 2. Save to DB
      const { error } = await supabase.from("banners").insert({
        title,
        description: desc,
        target_link: link,
        image_url: publicUrl,
        is_active: true
      });

      if (error) throw error;

      toast.success("Banner published");
      setTitle(""); setDesc(""); setLink(""); setImageFile(null); setPreviewUrl(null);
      void fetchBanners();

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown banner publishing error";
      toast.error("Failed to publish banner", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const deleteBanner = async (id: string) => {
    if(!confirm("Remove this banner?")) return;
    const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Banner removed");
      void fetchBanners();
    } else {
      toast.error("Delete failed");
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("banners").update({ is_active: !currentStatus }).eq("id", id);
    if (error) toast.error("Could not update banner visibility", { description: error.message });
    else void fetchBanners();
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-4 bg-brand/10 rounded-2xl text-brand">
          <LayoutTemplate size={32} />
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Hero Banners</h1>
          <p className="text-zinc-500 mt-2 font-medium text-lg">
            Manage the featured highlights on the user home screen.
          </p>
        </div>
      </div>

      {/* Creator Card */}
      <div className="bg-panel border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Preview / Uploader (Left) */}
          <div className="lg:col-span-5">
            <div className="group relative aspect-video rounded-3xl bg-black border-2 border-dashed border-white/10 hover:border-brand/50 transition-all overflow-hidden flex items-center justify-center shadow-lg">
              {previewUrl ? (
                <img src={previewUrl} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <LayoutTemplate size={48} className="text-zinc-800 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">1920 x 1080 (16:9)</p>
                </div>
              )}
              
              <label className="absolute inset-0 bg-brand/90 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                <Upload size={32} className="text-white mb-2" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Upload Banner</span>
                <input type="file" hidden accept="image/*" onChange={handleImageSelect} />
              </label>
            </div>
          </div>

          {/* Form (Right) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Headline</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl p-5 text-xl font-bold text-white outline-none focus:border-brand transition-all"
                placeholder="e.g. New Album Available Now"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Description</label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl p-5 font-medium text-white outline-none focus:border-brand transition-all"
                  placeholder="e.g. Listen to the latest worship..."
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Link Target (Optional)</label>
                <div className="relative">
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-2xl p-5 font-mono text-sm text-brand outline-none focus:border-brand transition-all pl-12"
                    placeholder="/album/uuid"
                  />
                  <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={addBanner} 
                disabled={isSubmitting}
                className="bg-brand hover:bg-brand-hover text-white h-14 px-10 rounded-full font-black text-sm shadow-lg shadow-brand/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" size={18} />}
                Publish Banner
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-brand" size={28} />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.05] bg-panel p-12 text-center">
          <LayoutTemplate className="mx-auto mb-3 text-zinc-700" size={36} />
          <h2 className="text-lg font-bold text-white">No hero banners yet</h2>
          <p className="mt-2 text-sm text-zinc-500">Publish a banner to feature content on the user home screen.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {banners.map((banner) => (
          <div key={banner.id} className="group bg-panel border border-white/[0.05] rounded-[2rem] overflow-hidden hover:border-white/10 transition-all">
            <div className="relative aspect-video">
              <Image src={banner.image_url} alt={banner.title} fill className="object-cover" />
              <div className={cn(
                "absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md",
                banner.is_active ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-zinc-800/80 text-zinc-500 border border-white/10"
              )}>
                {banner.is_active ? "Active" : "Hidden"}
              </div>
            </div>
            
            <div className="p-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{banner.title}</h3>
                <p className="text-sm text-zinc-500 font-medium">{banner.description || "No description"}</p>
                {banner.target_link && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-mono text-brand">
                    <LinkIcon size={12} />
                    {banner.target_link}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleStatus(banner.id, banner.is_active)}
                  className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-colors"
                  title="Toggle Visibility"
                >
                  {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button 
                  onClick={() => deleteBanner(banner.id)}
                  className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

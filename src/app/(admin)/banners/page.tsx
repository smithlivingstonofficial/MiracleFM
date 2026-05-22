"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BadgeDollarSign,
  Calendar,
  Eye,
  EyeOff,
  LayoutTemplate,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildMediaUrl } from "@/lib/media";
import type { CustomAd, CustomAdImageRatio, CustomAdPlacement } from "@/types/custom-ad";

type Banner = {
  id: string;
  title: string;
  description: string | null;
  target_link: string | null;
  image_url: string;
  is_active: boolean;
};

type Tab = "hero" | "custom";

const placementLabels: Record<CustomAdPlacement, string> = {
  feed_fallback: "Feed Fallback",
};

const adImageRatios: { value: CustomAdImageRatio; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
];

const ratioPreviewClass: Record<CustomAdImageRatio, string> = {
  "16:9": "aspect-video",
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "4:3": "aspect-[4/3]",
};

function normalizeDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function localDateValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export default function BannersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("hero");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [customAds, setCustomAds] = useState<CustomAd[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  const [adTitle, setAdTitle] = useState("");
  const [adDesc, setAdDesc] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adCta, setAdCta] = useState("Learn More");
  const [adImageRatio, setAdImageRatio] = useState<CustomAdImageRatio>("16:9");
  const [adWeight, setAdWeight] = useState(1);
  const [adIsActive, setAdIsActive] = useState(true);
  const [adStartsAt, setAdStartsAt] = useState("");
  const [adEndsAt, setAdEndsAt] = useState("");
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adPreviewUrl, setAdPreviewUrl] = useState<string | null>(null);
  const [isAdSubmitting, setIsAdSubmitting] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bannersRes, customAdsRes] = await Promise.all([
      supabase.from("banners").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_ads").select("*").order("created_at", { ascending: false }),
    ]);

    if (bannersRes.error) toast.error("Could not load hero banners", { description: bannersRes.error.message });
    if (customAdsRes.error) toast.error("Could not load custom ads", { description: customAdsRes.error.message });
    if (bannersRes.data) setBanners(bannersRes.data as Banner[]);
    if (customAdsRes.data) setCustomAds(customAdsRes.data as CustomAd[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAdImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAdImageFile(file);
    setAdPreviewUrl(URL.createObjectURL(file));
  };

  async function uploadImage(file: File, prefix: string) {
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const res = await fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ fileName, contentType: file.type }),
    });
    if (!res.ok) throw new Error("Could not create upload URL.");
    const { url } = await res.json();
    const uploadRes = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!uploadRes.ok) throw new Error("Image upload failed.");
    return buildMediaUrl(fileName);
  }

  async function revalidateHomeData() {
    await fetch("/api/admin/revalidate-home", { method: "POST" });
  }

  function resetBannerForm() {
    setEditingBannerId(null);
    setTitle("");
    setDesc("");
    setLink("");
    setImageFile(null);
    setPreviewUrl(null);
  }

  function editBanner(banner: Banner) {
    setActiveTab("hero");
    setEditingBannerId(banner.id);
    setTitle(banner.title);
    setDesc(banner.description || "");
    setLink(banner.target_link || "");
    setImageFile(null);
    setPreviewUrl(banner.image_url);
  }

  function resetCustomAdForm() {
    setEditingAdId(null);
    setAdTitle("");
    setAdDesc("");
    setAdLink("");
    setAdCta("Learn More");
    setAdImageRatio("16:9");
    setAdWeight(1);
    setAdIsActive(true);
    setAdStartsAt("");
    setAdEndsAt("");
    setAdImageFile(null);
    setAdPreviewUrl(null);
  }

  function editCustomAd(ad: CustomAd) {
    if (!ad.id) return;
    setActiveTab("custom");
    setEditingAdId(ad.id);
    setAdTitle(ad.title);
    setAdDesc(ad.description || "");
    setAdLink(ad.target_link || "");
    setAdCta(ad.cta_label || "Learn More");
    setAdImageRatio(ad.image_ratio || "16:9");
    setAdWeight(ad.weight || 1);
    setAdIsActive(ad.is_active !== false);
    setAdStartsAt(localDateValue(ad.starts_at));
    setAdEndsAt(localDateValue(ad.ends_at));
    setAdImageFile(null);
    setAdPreviewUrl(ad.image_url || null);
  }

  async function saveBanner() {
    if (!title.trim()) return toast.error("Title is required");
    if (!editingBannerId && !imageFile) return toast.error("Title and image are required");
    setIsSubmitting(true);

    try {
      const publicUrl = imageFile ? await uploadImage(imageFile, "banners") : null;
      let errorMessage: string | null = null;

      if (editingBannerId) {
        const res = await fetch(`/api/banners/${editingBannerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: desc,
            target_link: link,
            ...(publicUrl ? { image_url: publicUrl } : {}),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          errorMessage = data?.error || "Update failed";
        }
      } else {
        const { error } = await supabase.from("banners").insert({
          title,
          description: desc,
          target_link: link,
          image_url: publicUrl!,
          is_active: true,
        });
        if (error) errorMessage = error.message;
      }

      if (errorMessage) throw new Error(errorMessage);

      toast.success(editingBannerId ? "Hero banner updated" : "Hero banner published");
      if (!editingBannerId) await revalidateHomeData();
      resetBannerForm();
      void fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown banner save error";
      toast.error("Failed to save banner", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveCustomAd() {
    if (!adTitle.trim()) return toast.error("Ad title is required");
    if (!editingAdId && !adImageFile) return toast.error("Ad title and image are required");
    setIsAdSubmitting(true);

    try {
      const publicUrl = adImageFile ? await uploadImage(adImageFile, "custom-ads") : null;
      const payload = {
        title: adTitle,
        description: adDesc,
        target_link: adLink,
        cta_label: adCta || "Learn More",
        placement: "feed_fallback" as CustomAdPlacement,
        image_ratio: adImageRatio,
        weight: Math.min(100, Math.max(1, Number(adWeight) || 1)),
        is_active: adIsActive,
        starts_at: normalizeDateTime(adStartsAt),
        ends_at: normalizeDateTime(adEndsAt),
        ...(publicUrl ? { image_url: publicUrl } : {}),
      };
      let errorMessage: string | null = null;

      if (editingAdId) {
        const res = await fetch(`/api/admin/custom-ads/${editingAdId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          errorMessage = data?.error || "Update failed";
        }
      } else {
        const { error } = await supabase.from("custom_ads").insert({
          ...payload,
          image_url: publicUrl!,
        });
        if (error) errorMessage = error.message;
      }

      if (errorMessage) throw new Error(errorMessage);

      toast.success(editingAdId ? "Custom ad updated" : "Custom ad created");
      if (!editingAdId) await revalidateHomeData();
      resetCustomAdForm();
      void fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown custom ad error";
      toast.error("Failed to save custom ad", { description: message });
    } finally {
      setIsAdSubmitting(false);
    }
  }

  const deleteBanner = async (id: string) => {
    if (!confirm("Remove this hero banner?")) return;
    const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Hero banner removed");
      if (editingBannerId === id) resetBannerForm();
      void fetchData();
    } else {
      toast.error("Delete failed");
    }
  };

  const deleteCustomAd = async (id?: string) => {
    if (!id || !confirm("Remove this custom ad?")) return;
    const res = await fetch(`/api/admin/custom-ads/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Custom ad removed");
      if (editingAdId === id) resetCustomAdForm();
      void fetchData();
    } else {
      toast.error("Delete failed");
    }
  };

  const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const res = await fetch(`/api/banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error("Could not update banner visibility", { description: data?.error || "Update failed" });
      return;
    }

    setBanners((items) => items.map((banner) => (banner.id === id ? { ...banner, is_active: nextStatus } : banner)));
    toast.success(nextStatus ? "Hero banner is visible" : "Hero banner is hidden");
  };

  const toggleCustomAdStatus = async (id: string | undefined, currentStatus?: boolean | null) => {
    if (!id) return;
    const nextStatus = !currentStatus;
    const res = await fetch(`/api/admin/custom-ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error("Could not update custom ad", { description: data?.error || "Update failed" });
      return;
    }

    setCustomAds((items) => items.map((ad) => (ad.id === id ? { ...ad, is_active: nextStatus } : ad)));
    toast.success(nextStatus ? "Custom ad is active" : "Custom ad is hidden");
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-brand/10 p-4 text-brand">
            <LayoutTemplate size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white md:text-5xl">Ads & Banners</h1>
            <p className="mt-2 max-w-2xl text-base font-medium text-zinc-500 md:text-lg">
              Manage hero banners separately from feed fallback ads.
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit rounded-2xl border border-white/10 bg-black p-1">
          {[
            { id: "hero" as Tab, label: "Hero Banners", icon: LayoutTemplate },
            { id: "custom" as Tab, label: "Custom Ads", icon: Megaphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors",
                activeTab === tab.id ? "bg-brand text-white" : "text-zinc-500 hover:text-white"
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "hero" ? (
        <>
          <div className="rounded-[2.5rem] border border-white/[0.05] bg-panel p-8 shadow-2xl lg:p-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-white/10 bg-black shadow-lg transition-all hover:border-brand/50">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Banner preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <LayoutTemplate size={48} className="mx-auto mb-3 text-zinc-800" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">1920 x 1080 (16:9)</p>
                    </div>
                  )}

                  <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-brand/90 opacity-0 backdrop-blur-[2px] transition-all group-hover:opacity-100">
                    <Upload size={32} className="mb-2 text-white" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">{editingBannerId ? "Replace Banner" : "Upload Banner"}</span>
                    <input type="file" hidden accept="image/*" onChange={handleImageSelect} />
                  </label>
                </div>
              </div>

              <div className="space-y-6 lg:col-span-7">
                <div className="space-y-3">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Headline</label>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 text-xl font-bold text-white outline-none transition-all focus:border-brand" placeholder="e.g. New Album Available Now" />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Description</label>
                    <input value={desc} onChange={(event) => setDesc(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 font-medium text-white outline-none transition-all focus:border-brand" placeholder="e.g. Listen to the latest worship..." />
                  </div>
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Link Target</label>
                    <div className="relative">
                      <input value={link} onChange={(event) => setLink(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 pl-12 font-mono text-sm text-brand outline-none transition-all focus:border-brand" placeholder="/album/uuid" />
                      <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-4">
                  {editingBannerId && (
                    <Button onClick={resetBannerForm} disabled={isSubmitting} variant="outline" className="h-14 rounded-full border-white/10 bg-black px-8 text-sm font-black text-white hover:bg-white/5">
                      <X className="mr-2" size={18} />
                      Cancel
                    </Button>
                  )}
                  <Button onClick={saveBanner} disabled={isSubmitting} className="h-14 rounded-full bg-brand px-10 text-sm font-black text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-hover active:scale-95 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Plus className="mr-2" size={18} />}
                    {editingBannerId ? "Update Banner" : "Publish Banner"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

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
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {banners.map((banner) => (
                <div key={banner.id} className={cn("group overflow-hidden rounded-[2rem] border border-white/[0.05] bg-panel transition-all hover:border-white/10", !banner.is_active && "opacity-75")}>
                  <div className="relative aspect-video">
                    <Image src={banner.image_url} alt={banner.title} fill className={cn("object-cover transition-all", !banner.is_active && "grayscale brightness-50")} />
                    <div className={cn("absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md", banner.is_active ? "border border-green-500/30 bg-green-500/20 text-green-400" : "border border-white/10 bg-zinc-800/80 text-zinc-500")}>
                      {banner.is_active ? "Active" : "Hidden"}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-4 p-6">
                    <div className="min-w-0">
                      <h3 className="mb-1 truncate text-xl font-bold text-white">{banner.title}</h3>
                      <p className="line-clamp-2 text-sm font-medium text-zinc-500">{banner.description || "No description"}</p>
                      {banner.target_link && <div className="mt-3 flex items-center gap-2 truncate text-xs font-mono text-brand"><LinkIcon size={12} />{banner.target_link}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => editBanner(banner)} className="rounded-xl bg-zinc-900 p-3 text-zinc-500 transition-colors hover:text-white" title="Edit">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => toggleBannerStatus(banner.id, banner.is_active)} className="rounded-xl bg-zinc-900 p-3 text-zinc-500 transition-colors hover:text-white" title="Toggle Visibility">
                        {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button onClick={() => deleteBanner(banner.id)} className="rounded-xl bg-zinc-900 p-3 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-500" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-[2.5rem] border border-white/[0.05] bg-panel p-8 shadow-2xl lg:p-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className={cn("group relative flex items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-white/10 bg-black shadow-lg transition-all hover:border-brand/50", ratioPreviewClass[adImageRatio])}>
                  {adPreviewUrl ? (
                    <img src={adPreviewUrl} alt="Custom ad preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <BadgeDollarSign size={48} className="mx-auto mb-3 text-zinc-800" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Native ad creative</p>
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-brand/90 opacity-0 backdrop-blur-[2px] transition-all group-hover:opacity-100">
                    <Upload size={32} className="mb-2 text-white" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">{editingAdId ? "Replace Ad Image" : "Upload Ad Image"}</span>
                    <input type="file" hidden accept="image/*" onChange={handleAdImageSelect} />
                  </label>
                </div>
              </div>

              <div className="space-y-6 lg:col-span-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Ad Headline</label>
                    <input value={adTitle} onChange={(event) => setAdTitle(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 font-bold text-white outline-none transition-all focus:border-brand" placeholder="e.g. Discover Tamil Bible" />
                  </div>
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">CTA Label</label>
                    <input value={adCta} onChange={(event) => setAdCta(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 font-bold text-white outline-none transition-all focus:border-brand" placeholder="Learn More" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Description</label>
                  <input value={adDesc} onChange={(event) => setAdDesc(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 font-medium text-white outline-none transition-all focus:border-brand" placeholder="Short ad copy shown in native fallback placements." />
                </div>

                <div className="space-y-3">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Image Ratio</label>
                  <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black p-1.5">
                    {adImageRatios.map((ratio) => (
                      <button
                        key={ratio.value}
                        type="button"
                        onClick={() => setAdImageRatio(ratio.value)}
                        className={cn(
                          "h-11 rounded-xl text-xs font-black uppercase tracking-widest transition-colors",
                          adImageRatio === ratio.value ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-zinc-500 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Placement</label>
                    <div className="flex h-[58px] w-full items-center rounded-2xl border border-white/10 bg-black px-5 text-sm font-bold text-white">
                      Feed Fallback
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Weight</label>
                    <input type="number" min={1} max={100} value={adWeight} onChange={(event) => setAdWeight(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-black p-5 font-bold text-white outline-none transition-all focus:border-brand" />
                  </div>
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</label>
                    <button type="button" onClick={() => setAdIsActive((current) => !current)} className={cn("h-[58px] w-full rounded-2xl border px-5 text-sm font-black uppercase tracking-widest transition-colors", adIsActive ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-white/10 bg-black text-zinc-500")}>
                      {adIsActive ? "Active" : "Hidden"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Link Target</label>
                    <div className="relative">
                      <input value={adLink} onChange={(event) => setAdLink(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 pl-12 font-mono text-sm text-brand outline-none transition-all focus:border-brand" placeholder="https:// or /path" />
                      <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Starts</label>
                    <div className="relative">
                      <input type="datetime-local" value={adStartsAt} onChange={(event) => setAdStartsAt(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 pl-12 text-sm font-bold text-white outline-none transition-all focus:border-brand" />
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Ends</label>
                    <div className="relative">
                      <input type="datetime-local" value={adEndsAt} onChange={(event) => setAdEndsAt(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black p-5 pl-12 text-sm font-bold text-white outline-none transition-all focus:border-brand" />
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-4">
                  {editingAdId && (
                    <Button onClick={resetCustomAdForm} disabled={isAdSubmitting} variant="outline" className="h-14 rounded-full border-white/10 bg-black px-8 text-sm font-black text-white hover:bg-white/5">
                      <X className="mr-2" size={18} />
                      Cancel
                    </Button>
                  )}
                  <Button onClick={saveCustomAd} disabled={isAdSubmitting} className="h-14 rounded-full bg-brand px-10 text-sm font-black text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-hover active:scale-95 disabled:opacity-50">
                    {isAdSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Plus className="mr-2" size={18} />}
                    {editingAdId ? "Update Custom Ad" : "Create Custom Ad"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          ) : customAds.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-panel p-12 text-center">
              <Megaphone className="mx-auto mb-3 text-zinc-700" size={36} />
              <h2 className="text-lg font-bold text-white">No custom ads yet</h2>
              <p className="mt-2 text-sm text-zinc-500">Create native fallback ads for AdSense-unfilled feed slots.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {customAds.map((ad) => {
                const placement = (ad.placement || "feed_fallback") as CustomAdPlacement;
                const imageRatio = ad.image_ratio || "16:9";
                return (
                  <div key={ad.id} className="group overflow-hidden rounded-[2rem] border border-white/[0.05] bg-panel transition-all hover:border-white/10">
                    <div className={cn("relative bg-black", ratioPreviewClass[imageRatio])}>
                      {ad.image_url && <Image src={ad.image_url} alt={ad.title} fill className="object-cover" />}
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md", ad.is_active ? "border border-green-500/30 bg-green-500/20 text-green-400" : "border border-white/10 bg-zinc-800/80 text-zinc-500")}>
                          {ad.is_active ? "Active" : "Hidden"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">
                          {placementLabels[placement]}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">
                          {imageRatio}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 p-6">
                      <div>
                        <h3 className="line-clamp-1 text-xl font-bold text-white">{ad.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-500">{ad.description || "No description"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Weight {ad.weight || 1}</span>
                        <span>{ad.cta_label || "Learn More"}</span>
                        <span>{localDateValue(ad.starts_at) || "No start"}</span>
                        <span>{localDateValue(ad.ends_at) || "No end"}</span>
                      </div>
                      {ad.target_link && <div className="flex items-center gap-2 truncate text-xs font-mono text-brand"><LinkIcon size={12} />{ad.target_link}</div>}
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => editCustomAd(ad)} className="rounded-xl bg-zinc-900 p-3 text-zinc-500 transition-colors hover:text-white" title="Edit">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => toggleCustomAdStatus(ad.id, ad.is_active)} className="rounded-xl bg-zinc-900 p-3 text-zinc-500 transition-colors hover:text-white" title="Toggle Visibility">
                          {ad.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button onClick={() => deleteCustomAd(ad.id)} className="rounded-xl bg-zinc-900 p-3 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-500" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

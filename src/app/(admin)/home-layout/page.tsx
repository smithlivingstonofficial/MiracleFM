"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Loader2, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HomeLayoutSection } from "@/lib/home-layout";

type HomeLayoutResponse = {
  sections: HomeLayoutSection[];
  defaults: HomeLayoutSection[];
};

const sectionTypeLabel = (type: HomeLayoutSection["section_type"]) =>
  type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const maxItemsLabel = (section: HomeLayoutSection) => {
  if (section.section_type === "ad") return section.settings.variant === "banner" ? "Banner" : "Feed";
  if (section.section_type === "song_list") return section.settings.source || "songs";
  return `${section.settings.max_items || 8} items`;
};

export default function HomeLayoutAdminPage() {
  const [sections, setSections] = useState<HomeLayoutSection[]>([]);
  const [defaults, setDefaults] = useState<HomeLayoutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/home-layout", { cache: "no-store" });
      const result = (await response.json()) as HomeLayoutResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load home layout");
      setSections(result.sections);
      setDefaults(result.defaults);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load home layout");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLayout();
  }, []);

  const updateSection = <K extends keyof HomeLayoutSection>(slug: string, key: K, value: HomeLayoutSection[K]) => {
    setSections((current) => current.map((section) => (section.slug === slug ? { ...section, [key]: value } : section)));
  };

  const updateSettings = (slug: string, settings: HomeLayoutSection["settings"]) => {
    setSections((current) =>
      current.map((section) => (section.slug === slug ? { ...section, settings: { ...section.settings, ...settings } } : section))
    );
  };

  const moveSection = (slug: string, direction: -1 | 1) => {
    setSections((current) => {
      const index = current.findIndex((section) => section.slug === slug);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next.map((section, orderIndex) => ({ ...section, sort_order: (orderIndex + 1) * 10 }));
    });
  };

  const resetToDefaults = () => {
    setSections(defaults.map((section) => ({ ...section })));
    toast.message("Default collection-first layout restored. Save to publish it.");
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/home-layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      const result = (await response.json()) as { sections?: HomeLayoutSection[]; error?: string };
      if (!response.ok || !result.sections) throw new Error(result.error || "Could not save home layout");
      setSections(result.sections);
      toast.success("Home layout saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save home layout");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-[#FF0055]" size={30} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#FF0055]">
            <SlidersHorizontal size={20} />
            <span className="text-xs font-black uppercase tracking-widest">User Home</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white md:text-5xl">Home Layout</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-500">
            Rearrange, hide, and tune the sections shown on the user home page. The default layout favors playlists,
            albums, artists, and recommendations over long song lists.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={resetToDefaults}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:text-white"
          >
            <RotateCcw size={15} /> Defaults
          </button>
          <button
            onClick={saveLayout}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF0055] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#ff1a66] disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Layout
          </button>
        </div>
      </header>

      <section className="rounded-[2rem] border border-white/[0.06] bg-zinc-900/35 p-3 md:p-5">
        <div className="space-y-3">
          {sections.map((section, index) => (
            <article
              key={section.slug}
              className={cn(
                "rounded-2xl border p-4 transition",
                section.enabled ? "border-white/10 bg-black/35" : "border-white/[0.04] bg-black/18 opacity-60"
              )}
            >
              <div className="grid gap-4 xl:grid-cols-[40px_minmax(0,1fr)_220px_156px] xl:items-center">
                <div className="flex items-center gap-3 text-zinc-600">
                  <GripVertical size={18} />
                  <span className="font-mono text-xs font-bold">{String(index + 1).padStart(2, "0")}</span>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Title</span>
                    <input
                      value={section.title}
                      onChange={(event) => updateSection(section.slug, "title", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</span>
                    <input
                      value={section.description}
                      onChange={(event) => updateSection(section.slug, "description", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Type</p>
                    <p className="mt-1 truncate text-xs font-black text-zinc-200">{sectionTypeLabel(section.section_type)}</p>
                  </div>

                  {section.section_type === "ad" ? (
                    <label className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Variant</span>
                      <select
                        value={section.settings.variant || "feed"}
                        onChange={(event) => updateSettings(section.slug, { variant: event.target.value as "feed" | "banner" })}
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-xs font-black text-white outline-none focus:border-[#FF0055]/50"
                      >
                        <option value="feed">Feed</option>
                        <option value="banner">Banner</option>
                      </select>
                    </label>
                  ) : section.section_type === "song_list" ? (
                    <label className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Source</span>
                      <select
                        value={section.settings.source || "trending"}
                        onChange={(event) => updateSettings(section.slug, { source: event.target.value as "trending" | "new" | "related" })}
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-xs font-black text-white outline-none focus:border-[#FF0055]/50"
                      >
                        <option value="trending">Trending</option>
                        <option value="new">New</option>
                        <option value="related">Related</option>
                      </select>
                    </label>
                  ) : (
                    <label className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Max</span>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={section.settings.max_items || 8}
                        onChange={(event) => updateSettings(section.slug, { max_items: Number(event.target.value) })}
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-xs font-black text-white outline-none focus:border-[#FF0055]/50"
                      />
                    </label>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <span className="mr-auto rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 xl:mr-0">
                    {maxItemsLabel(section)}
                  </span>
                  <button
                    onClick={() => moveSection(section.slug, -1)}
                    disabled={index === 0}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:text-white disabled:opacity-30"
                    aria-label={`Move ${section.title} up`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveSection(section.slug, 1)}
                    disabled={index === sections.length - 1}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:text-white disabled:opacity-30"
                    aria-label={`Move ${section.title} down`}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => updateSection(section.slug, "enabled", !section.enabled)}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full border transition",
                      section.enabled
                        ? "border-[#FF0055]/35 bg-[#FF0055]/10 text-[#FF4D89]"
                        : "border-white/10 text-zinc-500 hover:text-white"
                    )}
                    aria-label={section.enabled ? `Hide ${section.title}` : `Show ${section.title}`}
                  >
                    {section.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

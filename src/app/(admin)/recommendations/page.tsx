"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BarChart3, Check, Eye, Loader2, Music, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import GenrePicker from "@/components/admin/GenrePicker";
import { fallbackGenreRows } from "@/lib/genres";
import type { GeneratedPlaylist, Genre, RecommendationAlgorithm, RecommendationSection, RecommendedTrack } from "@/types/music";

type Diagnostics = {
  readyTracks: number;
  missingGenreTracks: number;
  unknownGenreTracks?: number;
  genreCoveragePercent?: number;
  impressions: { cardViews: number; opens: number; plays: number };
  bySection: Record<string, { views: number; opens: number; plays: number }>;
};

type AdminResponse = {
  sections: RecommendationSection[];
  diagnostics: Diagnostics;
  algorithms: RecommendationAlgorithm[];
};

type PreviewResponse = {
  playlist: GeneratedPlaylist;
  mode: "guest" | "admin";
};

const trackImage = (track: RecommendedTrack) =>
  track.cover_url || track.albums?.cover_url || track.artists?.image_url || "";

export default function RecommendationsAdminPage() {
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [algorithms, setAlgorithms] = useState<RecommendationAlgorithm[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [draft, setDraft] = useState<RecommendationSection | null>(null);
  const [genres, setGenres] = useState<Genre[]>(fallbackGenreRows());
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedMetrics = useMemo(
    () => (selectedSlug && diagnostics ? diagnostics.bySection[selectedSlug] || { views: 0, opens: 0, plays: 0 } : null),
    [diagnostics, selectedSlug]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/recommendations", { cache: "no-store" });
      const result = (await response.json()) as AdminResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load recommendations");

      setSections(result.sections);
      setDiagnostics(result.diagnostics);
      setAlgorithms(result.algorithms);
      const nextSelected = selectedSlug || result.sections[0]?.slug || "";
      setSelectedSlug(nextSelected);
      setDraft(result.sections.find((section) => section.slug === nextSelected) || result.sections[0] || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/genres")
      .then((response) => response.json())
      .then((result: { genres?: Genre[] }) => {
        if (!cancelled && result.genres?.length) setGenres(result.genres);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectSection = (section: RecommendationSection) => {
    setSelectedSlug(section.slug);
    setDraft(section);
    setPreview(null);
  };

  const updateDraft = <K extends keyof RecommendationSection>(key: K, value: RecommendationSection[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as { section?: RecommendationSection; error?: string };
      if (!response.ok || !result.section) throw new Error(result.error || "Could not save section");

      setSections((current) =>
        current.map((section) => (section.slug === result.section?.slug ? result.section : section))
      );
      setDraft(result.section);
      toast.success("Recommendation section saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save section");
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async (mode: "admin" | "guest") => {
    if (!draft) return;
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/admin/recommendations?preview=${encodeURIComponent(draft.slug)}&mode=${mode}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as PreviewResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load preview");
      setPreview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load preview");
    } finally {
      setPreviewLoading(false);
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
    <div className="space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#FF0055]">
            <Sparkles size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Automatic Playlists</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white md:text-5xl">Recommendations</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-500">
            Configure the auto-updating mixes shown on the user Home page and generated playlist pages.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:border-[#FF0055]/40 hover:text-white"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {diagnostics && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Ready Tracks", diagnostics.readyTracks],
            ["Missing Genres", diagnostics.missingGenreTracks],
            ["Unknown Genres", diagnostics.unknownGenreTracks || 0],
            ["Genre Coverage", `${diagnostics.genreCoveragePercent || 0}%`],
            ["Card Opens", diagnostics.impressions.opens],
            ["Playlist Plays", diagnostics.impressions.plays],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/[0.05] bg-zinc-900/40 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          {sections.map((section) => (
            <button
              key={section.slug}
              onClick={() => selectSection(section)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition",
                selectedSlug === section.slug
                  ? "border-[#FF0055]/50 bg-[#FF0055]/10"
                  : "border-white/[0.05] bg-zinc-900/40 hover:border-white/15"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-white">{section.title}</h2>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-500">{section.slug}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                    section.enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {section.enabled ? "Live" : "Off"}
                </span>
              </div>
            </button>
          ))}
        </aside>

        {draft && (
          <section className="space-y-6 rounded-[2rem] border border-white/[0.05] bg-zinc-900/35 p-5 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{draft.title}</h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">{draft.description}</p>
              </div>
              <button
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#FF0055] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#ff1a66] disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Algorithm</span>
                <select
                  value={draft.algorithm_type}
                  onChange={(event) => updateDraft("algorithm_type", event.target.value as RecommendationAlgorithm)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                >
                  {algorithms.map((algorithm) => (
                    <option key={algorithm} value={algorithm}>
                      {algorithm}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                />
              </label>
              <div className="md:col-span-2">
                <GenrePicker
                  genres={genres}
                  selected={draft.fallback_genres || []}
                  onChange={(fallbackGenres) => updateDraft("fallback_genres", fallbackGenres)}
                  compact
                  label="Fallback Genres"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Order</span>
                  <input
                    type="number"
                    value={draft.sort_order}
                    onChange={(event) => updateDraft("sort_order", Number(event.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Limit</span>
                  <input
                    type="number"
                    value={draft.track_limit}
                    onChange={(event) => updateDraft("track_limit", Number(event.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Days</span>
                  <input
                    type="number"
                    value={draft.freshness_days}
                    onChange={(event) => updateDraft("freshness_days", Number(event.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => updateDraft("enabled", !draft.enabled)}
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-xs font-black uppercase tracking-widest transition md:w-fit",
                  draft.enabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-black/30 text-zinc-500"
                )}
              >
                <Check size={15} /> {draft.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            {selectedMetrics && (
              <div className="flex flex-wrap gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-4 text-xs font-bold text-zinc-400">
                <span className="inline-flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#FF0055]" /> Views {selectedMetrics.views}
                </span>
                <span>Opens {selectedMetrics.opens}</span>
                <span>Plays {selectedMetrics.plays}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPreview("admin")}
                    disabled={previewLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white"
                  >
                    <Eye size={14} /> Admin
                  </button>
                  <button
                    onClick={() => loadPreview("guest")}
                    disabled={previewLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white"
                  >
                    <Eye size={14} /> Guest
                  </button>
                </div>
              </div>

              {previewLoading ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-white/[0.05] bg-black/20">
                  <Loader2 className="animate-spin text-[#FF0055]" size={24} />
                </div>
              ) : preview ? (
                <div className="space-y-2 rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                  {preview.playlist.tracks.slice(0, 10).map((track, index) => {
                    const image = trackImage(track);
                    return (
                      <div key={track.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03]">
                        <span className="w-6 text-right text-[10px] font-black text-zinc-600">{index + 1}</span>
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                          {image ? <Image src={image} alt="" fill className="object-cover" /> : <Music className="m-3 text-zinc-700" size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{track.title}</p>
                          <p className="truncate text-xs text-zinc-500">{track.artists?.name || "Unknown Artist"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center text-sm font-bold text-zinc-600">
                  Choose a preview mode to inspect generated songs.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

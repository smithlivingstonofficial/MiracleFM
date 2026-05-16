"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check, Loader2, Plus, Save, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Genre } from "@/types/music";

type GenreDiagnostics = {
  missingGenreTracks: number;
  unknownGenreTracks: number;
  unknownGenres: string[];
  zeroTrackGenres: string[];
  topGenres: { name: string; count: number }[];
};

type AdminGenresResponse = {
  genres: Genre[];
  diagnostics: GenreDiagnostics;
};

const emptyDraft: Genre = {
  name: "",
  slug: "",
  description: "",
  is_active: true,
  sort_order: 999,
};

export default function GenresAdminPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [diagnostics, setDiagnostics] = useState<GenreDiagnostics | null>(null);
  const [draft, setDraft] = useState<Genre>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGenres = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/genres", { cache: "no-store" });
      const result = (await response.json()) as AdminGenresResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load genres");
      setGenres(result.genres);
      setDiagnostics(result.diagnostics);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load genres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGenres();
  }, []);

  const editGenre = (genre: Genre) => setDraft({ ...genre });
  const resetDraft = () => setDraft(emptyDraft);

  const saveGenre = async () => {
    if (!draft.name.trim()) return toast.error("Genre name is required");
    setSaving(true);
    try {
      const method = draft.id ? "PATCH" : "POST";
      const response = await fetch("/api/admin/genres", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as { genre?: Genre; error?: string };
      if (!response.ok || !result.genre) throw new Error(result.error || "Could not save genre");
      toast.success(draft.id ? "Genre updated" : "Genre created");
      resetDraft();
      await loadGenres();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save genre");
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
    <div className="space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#FF0055]">
            <Tags size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Taxonomy</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white md:text-5xl">Genres</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-500">
            Manage the controlled genre list used by tracks, recommendations, and taste profiles.
          </p>
        </div>
        <button
          onClick={resetDraft}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF0055] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#ff1a66]"
        >
          <Plus size={16} /> New Genre
        </button>
      </header>

      {diagnostics && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Missing Genre Tracks", diagnostics.missingGenreTracks],
            ["Inactive/Unknown Tracks", diagnostics.unknownGenreTracks],
            ["Unknown Genres", diagnostics.unknownGenres.length],
            ["Zero Track Genres", diagnostics.zeroTrackGenres.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/[0.05] bg-zinc-900/40 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="rounded-[2rem] border border-white/[0.05] bg-zinc-900/35 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {genres.map((genre) => (
              <button
                key={genre.id || genre.slug}
                onClick={() => editGenre(genre)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition hover:border-[#FF0055]/40",
                  draft.id === genre.id ? "border-[#FF0055]/50 bg-[#FF0055]/10" : "border-white/[0.05] bg-black/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-white">{genre.name}</h2>
                    <p className="mt-1 text-xs font-bold text-zinc-600">{genre.slug}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest", genre.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-500")}>
                    {genre.is_active ? "Active" : "Off"}
                  </span>
                </div>
                {genre.description && <p className="mt-3 line-clamp-2 text-xs font-medium text-zinc-500">{genre.description}</p>}
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-white/[0.05] bg-zinc-900/40 p-5">
            <h2 className="mb-5 text-lg font-black text-white">{draft.id ? "Edit Genre" : "Create Genre"}</h2>
            <div className="space-y-4">
              <label className="space-y-2 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</span>
                <textarea
                  value={draft.description || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sort Order</span>
                <input
                  type="number"
                  value={draft.sort_order}
                  onChange={(event) => setDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF0055]/50"
                />
              </label>
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, is_active: !current.is_active }))}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-black uppercase tracking-widest",
                  draft.is_active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-zinc-500"
                )}
              >
                {draft.is_active ? <Check size={15} /> : <X size={15} />}
                {draft.is_active ? "Active" : "Disabled"}
              </button>
              <button
                onClick={saveGenre}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF0055] px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#ff1a66] disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Genre
              </button>
            </div>
          </section>

          {diagnostics && (
            <section className="rounded-[2rem] border border-white/[0.05] bg-zinc-900/40 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                <BarChart3 size={15} className="text-[#FF0055]" /> Coverage
              </h2>
              <div className="space-y-3">
                {diagnostics.topGenres.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-300">{item.name}</span>
                    <span className="font-black text-zinc-500">{item.count}</span>
                  </div>
                ))}
              </div>
              {diagnostics.unknownGenres.length > 0 && (
                <p className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs font-bold text-yellow-200">
                  Unknown or inactive: {diagnostics.unknownGenres.join(", ")}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

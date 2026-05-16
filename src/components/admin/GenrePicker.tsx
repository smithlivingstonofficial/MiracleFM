"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeGenreList } from "@/lib/genres";
import type { Genre } from "@/types/music";

type GenrePickerProps = {
  genres: Genre[];
  selected: string[];
  onChange: (genres: string[]) => void;
  disabled?: boolean;
  includeInactive?: boolean;
  compact?: boolean;
  label?: string;
};

export default function GenrePicker({
  genres,
  selected,
  onChange,
  disabled = false,
  includeInactive = false,
  compact = false,
  label = "Genres",
}: GenrePickerProps) {
  const [search, setSearch] = useState("");
  const normalizedSelected = useMemo(() => normalizeGenreList(selected), [selected]);
  const selectedSet = useMemo(() => new Set(normalizedSelected), [normalizedSelected]);

  const options = useMemo(
    () =>
      genres
        .filter((genre) => includeInactive || genre.is_active)
        .filter((genre) => genre.name.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [genres, includeInactive, search]
  );

  const toggle = (name: string) => {
    if (disabled) return;
    const next = selectedSet.has(name)
      ? normalizedSelected.filter((item) => item !== name)
      : [...normalizedSelected, name];
    onChange(normalizeGenreList(next));
  };

  return (
    <div className={cn("space-y-3", disabled && "opacity-60")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</p>
          <p className="mt-1 text-xs font-bold text-zinc-600">{normalizedSelected.length} selected</p>
        </div>
        <div className={cn("relative", compact ? "md:w-52" : "md:w-64")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={disabled}
            placeholder="Search genres"
            className="w-full rounded-full border border-white/10 bg-black/30 py-2 pl-9 pr-4 text-xs font-bold text-white outline-none transition focus:border-[#FF0055]/50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className={cn("flex flex-wrap gap-2", compact ? "max-h-44 overflow-y-auto pr-1" : "gap-3")}>
        {options.map((genre) => {
          const active = selectedSet.has(genre.name);
          return (
            <button
              type="button"
              key={genre.slug}
              onClick={() => toggle(genre.name)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed",
                active
                  ? "border-transparent bg-[#FF0055] text-white shadow-lg shadow-[#FF0055]/20"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/30 hover:text-white",
                !genre.is_active && "border-yellow-500/30 text-yellow-300"
              )}
            >
              {active && <Check size={14} strokeWidth={3} />}
              {genre.name}
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-xs font-bold text-zinc-600">
            No genres found.
          </p>
        )}
      </div>
    </div>
  );
}

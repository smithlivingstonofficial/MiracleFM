import type { Genre } from "@/types/music";

export const DEFAULT_GENRES = [
  "Worship",
  "Gospel",
  "Contemporary",
  "Instrumental",
  "Hymns",
  "Christian Pop",
  "Tamil Christian",
  "Sermon",
  "Kids",
  "Devotional",
  "Live",
  "Acoustic",
];

export const slugifyGenre = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeGenreName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const normalizeGenreList = (values: string[] = []) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeGenreName(value);
    const key = slugifyGenre(normalized);
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result;
};

export const sortGenres = <T extends Pick<Genre, "name" | "sort_order">>(genres: T[]) =>
  [...genres].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

export const fallbackGenreRows = (): Genre[] =>
  DEFAULT_GENRES.map((name, index) => ({
    name,
    slug: slugifyGenre(name),
    description: null,
    is_active: true,
    sort_order: (index + 1) * 10,
  }));

// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { buildMediaUrl } from "@/lib/media"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(path: string | null) {
  if (!path) return "/miraclefm.jpg";
  if (path.startsWith("http")) return path;
  const cleanPath = path.replace(/^\//, ""); // Remove leading slash
  
  return buildMediaUrl(cleanPath);
}

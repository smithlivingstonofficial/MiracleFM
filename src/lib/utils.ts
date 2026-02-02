import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(path: string | null) {
  if (!path) return "/placeholder-music.png"; // You can add a default image in public folder
  if (path.startsWith("http")) return path;
  
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, ""); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ""); // Remove leading slash
  
  return `${baseUrl}/${cleanPath}`;
}
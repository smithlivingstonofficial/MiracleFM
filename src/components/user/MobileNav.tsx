"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[80px]">
      <Link href="/" className={cn("flex flex-col items-center gap-1", pathname === "/" ? "text-[#FF0055]" : "text-zinc-500")}>
        <Home size={24} />
        <span className="text-[10px] font-bold">Home</span>
      </Link>
      <Link href="/search" className={cn("flex flex-col items-center gap-1", pathname === "/search" ? "text-[#FF0055]" : "text-zinc-500")}>
        <Search size={24} />
        <span className="text-[10px] font-bold">Search</span>
      </Link>
      <Link href="/library" className={cn("flex flex-col items-center gap-1", pathname === "/library" ? "text-[#FF0055]" : "text-zinc-500")}>
        <Library size={24} />
        <span className="text-[10px] font-bold">Library</span>
      </Link>
    </div>
  );
}
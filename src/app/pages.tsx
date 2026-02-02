// src/app/page.tsx
import Link from "next/link";
import { PlayCircle, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-white to-gray-500">
          MIRACLE FM
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Experience high-fidelity Christian audio streaming, powered by Cloudflare R2 & HLS.
        </p>
        
        <div className="flex gap-4 justify-center pt-8">
          <Link href="/browse" className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition">
            <PlayCircle size={20} /> Listen Now
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-800 px-8 py-3 rounded-full font-bold hover:bg-zinc-800 transition">
            <ShieldCheck size={20} /> Admin Panel
          </Link>
        </div>
      </div>
    </main>
  );
}
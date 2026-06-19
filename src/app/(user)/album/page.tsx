import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Disc, Play } from "lucide-react";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { Fragment } from "react";

export const revalidate = 60;

export default async function AllAlbumsPage() {
  const supabase = await createClient();

  const [albumsRes] = await Promise.all([
    supabase
      .from("albums")
      .select("*, artists(name)")
      .order("created_at", { ascending: false })
  ]);

  const albums = albumsRes.data ||[];

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-40 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#16080d] via-[#050505]/90 to-[#050505] -z-10" />

      <div className="px-4 md:px-8 mt-5 md:mt-8 space-y-7 md:space-y-9">

        {/* Albums Grid with Embedded Ads */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-x-5 md:gap-y-8">
          {albums.map((album, i) => (
            <Fragment key={album.id}>
              
              {albums.length >= 9 && i === 8 && (
                <ResponsiveAd variant="banner" className="col-span-2 my-1 px-0 sm:col-span-3 md:hidden" />
              )}

              <Link 
                href={`/album/${album.id}`} 
                className="group block animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
                style={{ animationDelay: `${i * 50}ms`, animationDuration: '700ms' }}
              >
                {/* Premium Card Container */}
                <div className="aspect-square relative rounded-lg overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-all duration-300 md:group-hover:border-[#FF0055]/35 md:group-hover:shadow-[0_10px_32px_-12px_rgba(255,0,85,0.28)] md:group-hover:-translate-y-1">
                  
                  {album.cover_url ? (
                    <Image 
                      src={album.cover_url} 
                      alt={album.title} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-110" 
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <Disc size={48} />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                     <div className="bg-[#FF0055] p-3 md:p-4 rounded-full shadow-2xl transform scale-50 group-hover:scale-100 transition-all duration-300">
                       <Play fill="white" className="text-white w-5 h-5 md:w-6 md:h-6 ml-0.5" />
                     </div>
                  </div>
                </div>
                
                <div className="mt-2 px-1">
                  <h3 className="font-bold text-white truncate text-sm md:text-base group-hover:text-[#FF0055] transition-colors">
                    {album.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-zinc-500 font-bold truncate group-hover:text-zinc-300 transition-colors">
                      {album.artists?.name}
                    </p>
                    <span className="hidden md:inline-block w-1 h-1 bg-zinc-700 rounded-full" />
                    <span className="hidden md:inline-block text-[10px] font-mono text-zinc-600">
                      {new Date(album.created_at).getFullYear()}
                    </span>
                  </div>
                </div>
              </Link>
            </Fragment>
          ))}
        </div>

        <ResponsiveAd variant="banner" className="hidden px-0 md:block" />
      </div>
    </div>
  );
}

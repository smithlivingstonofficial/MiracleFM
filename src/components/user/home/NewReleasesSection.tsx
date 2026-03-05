import Link from "next/link";
import Image from "next/image";
import { Disc, ChevronRight } from "lucide-react";

interface NewReleasesSectionProps {
  albums: any[];
}

export default function NewReleasesSection({ albums }: NewReleasesSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">New Releases</h2>
        
        {/* VIEW ALL LINK */}
        <Link 
          href="/album" 
          className="flex items-center gap-1 text-[10px] md:text-xs font-black text-zinc-500 hover:text-[#FF0055] transition-colors uppercase tracking-widest border border-white/5 px-4 py-2 rounded-full backdrop-blur-md"
        >
          View All <ChevronRight size={14} />
        </Link>
      </div>
      
      <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {albums.map((album) => (
          <Link key={album.id} href={`/album/${album.id}`} className="min-w-[150px] md:min-w-[220px] snap-start group block">
            <div className="aspect-square relative rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-xl group-hover:opacity-90 transition-all border border-white/5 group-hover:border-[#FF0055]/30 duration-500">
              {album.cover_url ? (
                <Image 
                  src={album.cover_url} 
                  alt={album.title} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                  sizes="(max-width: 768px) 40vw, 20vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                  <Disc size={40} />
                </div>
              )}
              {/* Subtle Shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className="mt-4 px-2">
              <h3 className="font-bold text-white truncate text-sm md:text-lg group-hover:text-[#FF0055] transition-colors">{album.title}</h3>
              <p className="text-xs md:text-sm text-zinc-500 font-bold mt-1 truncate">{album.artists?.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
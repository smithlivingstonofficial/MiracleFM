import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Mic2 } from "lucide-react";
import { Fragment } from "react";
import ResponsiveAd from "@/components/ads/ResponsiveAd";

export const revalidate = 86400;

export default async function AllArtistsPage() {
  const supabase = await createClient();

  // 1. Fetch Artists
  const [artistsRes] = await Promise.all([
    supabase.from("artists").select("*").order("name", { ascending: true })
  ]);

  const artists = artistsRes.data || [];

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-40 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#16080d] via-[#050505]/90 to-[#050505] -z-10" />

      <div className="px-4 md:px-8 mt-5 md:mt-8 space-y-7 md:space-y-9">

        {/* 3. Artists Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-4 md:grid-cols-[repeat(auto-fill,minmax(164px,1fr))] md:gap-5">
          {artists.map((artist, i) => (
            <Fragment key={artist.id}>
              {artists.length >= 9 && i === 8 && <ResponsiveAd variant="banner" className="col-span-2 my-1 px-0 sm:col-span-3 md:hidden" />}

              <article
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]/80 p-3 transition-all duration-300 active:scale-95 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards md:hover:-translate-y-1 md:hover:border-[#FF0055]/30 md:hover:bg-white/[0.04]"
                style={{ animationDelay: `${i * 50}ms`, animationDuration: "700ms" }}
              >
                <div className="absolute left-3 top-3 z-20 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">
                  #{i + 1}
                </div>

                <Link
                  href={`/artist/${artist.id}`}
                  className="block"
                >
                  <div className="relative mx-auto mb-3 mt-5 h-28 w-28 rounded-full p-[3px] md:h-32 md:w-32 md:p-1">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FF0055] via-[#ff1a66] to-[#4d001a] shadow-[0_0_22px_rgba(255,0,85,0.28)] transition-all duration-500 md:group-hover:shadow-[0_0_34px_rgba(255,0,85,0.48)]" />
                    <div className="absolute -right-1 bottom-4 h-9 w-9 rounded-full bg-[#FF0055] shadow-[0_0_26px_rgba(255,0,85,0.42)]" />

                    <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-[4px] border-[#050505] bg-zinc-900">
                      {artist.image_url ? (
                        <Image
                          src={artist.image_url}
                          alt={artist.name}
                          fill
                          className="object-cover transition-transform duration-700 md:group-hover:scale-105"
                          sizes="128px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                          <Mic2 size={34} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 text-center">
                    <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-white transition-colors md:group-hover:text-[#FF0055]">{artist.name}</p>
                  </div>
                </Link>
              </article>
            </Fragment>
          ))}
        </div>

        <ResponsiveAd variant="banner" className="hidden px-0 md:block" />
      </div>
    </div>
  );
}

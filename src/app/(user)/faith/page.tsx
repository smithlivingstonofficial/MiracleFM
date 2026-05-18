import { BookOpenText, HeartHandshake, Music2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import PrayerRequestForm from "@/components/faith/PrayerRequestForm";
import TrackRow from "@/components/user/TrackRow";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
import { shouldRenderSongListAdAfter } from "@/lib/ads";
import type { Track } from "@/types/music";

export const dynamic = "force-dynamic";

export default async function FaithPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: worshipTracks } = await supabase
    .from("tracks")
    .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
    .eq("audio_status", "ready")
    .order("play_count", { ascending: false })
    .limit(8);

  const tracks = (worshipTracks || []) as Track[];
  const todayTrack = tracks[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] pb-56 text-white selection:bg-[#FF0055] selection:text-white sm:pb-52 md:pb-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top_left,rgba(255,0,85,0.18),transparent_34%),linear-gradient(to_bottom,#1a0b10_0%,rgba(5,5,5,0.82)_48%,#050505_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-6 sm:px-5 md:gap-8 md:px-8 md:pt-10">
        <header className="max-w-3xl">
          <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#FF0055] sm:text-[10px]">
            <Sparkles size={12} /> Daily Faith
          </div>
          <h1 className="text-[2.75rem] font-black leading-[0.9] tracking-tighter text-white sm:text-6xl md:text-7xl">Faith</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-zinc-400 sm:text-base md:mt-4">
            A quiet place for daily worship, Scripture focus, and private prayer requests.
          </p>
        </header>

        <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-3">
          <section className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-6 md:rounded-[2rem] lg:col-span-2">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#FF0055]/10 blur-3xl" />
            <div className="mb-5 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF0055]/10 text-[#FF0055]">
                <BookOpenText size={21} />
              </div>
              <h2 className="min-w-0 text-xl font-black tracking-tighter text-white sm:text-2xl">Verse of the Day</h2>
            </div>
            <blockquote className="relative max-w-3xl text-[1.55rem] font-black leading-[1.08] tracking-tighter text-white sm:text-3xl md:text-4xl">
              The Lord is my strength and my song; he has given me victory.
            </blockquote>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-[#FF0055] sm:text-sm">Exodus 15:2</p>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-6 md:rounded-[2rem]">
            <div className="mb-5 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF0055]/10 text-[#FF0055]">
                <HeartHandshake size={21} />
              </div>
              <h2 className="min-w-0 text-xl font-black tracking-tighter text-white sm:text-2xl">Today&apos;s Worship</h2>
            </div>
            {todayTrack ? (
              <div className="min-w-0">
                <p className="line-clamp-3 break-words text-[1.55rem] font-black leading-[0.98] tracking-tighter text-white sm:text-3xl">{todayTrack.title}</p>
                <p className="mt-2 text-sm font-bold text-zinc-400">{todayTrack.artists?.name || "Miracle FM"}</p>
                <div className="mt-6">
                  <CollectionPlayButton tracks={tracks} />
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium leading-6 text-zinc-500">Today&apos;s worship song will appear when playable tracks are available.</p>
            )}
          </section>
        </div>

        <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <section className="min-w-0">
            <div className="mb-4 flex min-w-0 items-end justify-between gap-3 sm:mb-5">
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tighter text-white sm:text-3xl">Daily Worship Playlist</h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">Start with a few songs and let the player continue.</p>
              </div>
              <Music2 size={22} className="hidden shrink-0 text-[#FF0055] sm:block" />
            </div>
            {tracks.length > 0 ? (
              <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/5 bg-[#0A0A0A]/80 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-2 md:rounded-[2rem]">
                {tracks.map((track, index) => (
                  <div key={track.id}>
                    <TrackRow track={track} index={index} context="Faith" allTracks={tracks} />
                    {shouldRenderSongListAdAfter(index, tracks.length) && <SongListAdRow />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm font-medium text-zinc-500 md:rounded-[2rem] md:p-10">
                Worship songs will appear here after tracks are ready.
              </div>
            )}
          </section>

          <div className="min-w-0 space-y-4 sm:space-y-5">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-6 md:rounded-[2rem]">
              <h2 className="text-xl font-black tracking-tighter text-white sm:text-2xl">Short Devotion</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-zinc-400 sm:text-[15px]">
                Begin with worship before the day gets loud. Let one song become a prayer, and let one verse stay with you as a quiet anchor.
              </p>
            </section>
            <PrayerRequestForm isSignedIn={Boolean(user)} />
            <ResponsiveAd variant="compact" className="px-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

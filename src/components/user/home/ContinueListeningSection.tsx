import MixCard from "@/components/user/MixCard";
import TrackRow from "@/components/user/TrackRow";
import type { Track } from "@/types/music";

type ContinueListeningSectionProps = {
  tracks: Track[];
};

export default function ContinueListeningSection({ tracks }: ContinueListeningSectionProps) {
  if (tracks.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-5">
        <h2 className="text-2xl font-black tracking-tighter text-white md:text-3xl">Continue Listening</h2>
        <p className="mt-1 text-sm font-medium text-zinc-500">Recent worship songs from your listening history.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <div className="lg:col-span-1">
          <MixCard tracks={tracks} title="Recently Played" description="Pick up where your worship time paused." />
        </div>
        <div className="rounded-[2rem] border border-white/5 bg-[#0A0A0A]/70 p-2 lg:col-span-2">
          {tracks.slice(0, 6).map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} context="Recent" allTracks={tracks} />
          ))}
        </div>
      </div>
    </section>
  );
}

import MixCard from "@/components/user/MixCard";
import type { User } from "@supabase/supabase-js";
import type { Track } from "@/types/music";

interface DailyMixSectionProps {
  user: User | null;
  dailyMix: Track[];
}

export default function DailyMixSection({ user, dailyMix }: DailyMixSectionProps) {
  if (!user || dailyMix.length === 0) return null;

  return (
    <div className="lg:col-span-1 w-full h-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
      <MixCard 
        tracks={dailyMix}
        title="Daily Mix"
        description="Fresh tunes for your spirit."
        href="/mix/daily-mix"
      />
    </div>
  );
}

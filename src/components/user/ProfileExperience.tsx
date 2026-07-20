"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Edit3,
  Heart,
  LayoutDashboard,
  ListMusic,
  Loader2,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import TasteProfileModal from "@/components/user/TasteProfileModal";

type ProfileExperienceProps = {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt?: string;
  };
  role: string;
  stats: {
    likes: number;
    playlists: number;
  };
  genres: string[];
};

export default function ProfileExperience({ user, role, stats, genres }: ProfileExperienceProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const memberSince = useMemo(() => {
    if (!user.createdAt) return "Miracle FM listener";
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(user.createdAt));
  }, [user.createdAt]);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not sign out. Please try again.");
      setIsSigningOut(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  const closeTasteProfile = () => {
    setIsModalOpen(false);
    router.refresh();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] pb-32 text-white selection:bg-[#FF0055] selection:text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,85,0.18),transparent_36%),linear-gradient(to_bottom,#12070b_0%,#050505_70%)]" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
        <nav className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-2 backdrop-blur-xl">
          <button
            onClick={() => router.back()}
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-red-500/15 bg-red-500/10 px-4 text-sm font-black text-red-300 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
          >
            {isSigningOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
            Sign out
          </button>
        </nav>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl md:rounded-[2.5rem] md:p-8">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900 shadow-2xl md:h-40 md:w-40 md:rounded-[2rem]">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" fill className="object-cover" sizes="160px" priority unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-black text-zinc-600">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#FF0055]">
                  <ShieldCheck size={13} />
                  {role === "admin" ? "Administrator" : "Verified Listener"}
                </div>
                <h1 className="break-words text-4xl font-black leading-[1.12] tracking-tight text-white md:text-7xl">
                  {user.name}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-zinc-400">
                  <span className="inline-flex items-center gap-2">
                    <UserRound size={15} /> {user.email}
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={15} /> Since {memberSince}
                  </span>
                </div>

                {role === "admin" && (
                  <Link
                    href="/dashboard"
                    className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-black transition-transform hover:scale-[1.02]"
                  >
                    <LayoutDashboard size={17} />
                    Open console
                  </Link>
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[#0A0A0A]/90 p-5 shadow-2xl md:rounded-[2.5rem] md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF0055]/15 text-[#FF0055]">
                <Sparkles size={22} />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Edit taste profile"
                title="Edit taste profile"
              >
                <Edit3 size={16} />
              </button>
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight text-white">Taste Profile</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">
              Used to tune mixes, recommendations, and worship discovery.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {genres.length > 0 ? (
                genres.map((genre) => (
                  <span key={genre} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    {genre}
                  </span>
                ))
              ) : (
                <button onClick={() => setIsModalOpen(true)} className="text-sm font-black text-[#FF0055] transition-colors hover:text-white">
                  Set up recommendations
                </button>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ProfileTile href="/library/liked" icon={<Heart size={28} className="fill-white text-white" />} label="Collection" title="Liked Songs" value={`${stats.likes} saved tracks`} accent />
          <ProfileTile href="/library" icon={<ListMusic size={28} />} label="Library" title="My Playlists" value={`${stats.playlists} custom collections`} />
        </section>
      </main>

      <TasteProfileModal isOpen={isModalOpen} onClose={closeTasteProfile} initialGenres={genres} />
    </div>
  );
}

function ProfileTile({
  href,
  icon,
  label,
  title,
  value,
  accent = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="group flex items-center gap-5 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 transition-colors hover:bg-white/[0.06] md:p-7">
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] ${accent ? "bg-[#FF0055]" : "bg-zinc-900 text-zinc-300"} transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
        <h3 className="mt-1 truncate text-2xl font-black leading-tight tracking-tight text-white">{title}</h3>
        <p className="mt-1 text-sm font-bold text-zinc-500">{value}</p>
      </div>
      <ChevronRight size={20} className="shrink-0 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}

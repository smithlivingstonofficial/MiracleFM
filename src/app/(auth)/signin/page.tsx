"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Music2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function UserSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      toast.error("Google sign-in could not start. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,85,0.2),transparent_34%),linear-gradient(to_bottom,#16070d_0%,#050505_74%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_430px] lg:px-10">
        <section className="hidden min-w-0 lg:block">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10">
              <Image src="/miraclefm.jpg" alt="Miracle FM" fill className="object-cover" priority />
            </span>
            <span>
              <span className="block text-2xl font-black leading-tight tracking-tight">MIRACLE FM</span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Tamil Christian Worship</span>
            </span>
          </Link>
          <h1 className="max-w-2xl text-6xl font-black leading-[1.12] tracking-tight">
            Keep your worship library close, wherever you listen.
          </h1>
          <p className="mt-5 max-w-xl text-base font-medium leading-7 text-zinc-400">
            Save songs, build playlists, follow artists, and tune recommendations around your worship taste.
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-5 h-20 w-20 overflow-hidden rounded-[1.5rem] border border-white/10 shadow-2xl">
              <Image src="/miraclefm.jpg" alt="Miracle FM" fill className="object-cover" priority />
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#FF0055]">
              <Sparkles size={13} />
              Listener account
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-white">Welcome back</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">
              Sign in to sync your liked songs, playlists, and recommendations.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-sm font-black text-black transition-transform hover:scale-[1.01] disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="mt-6 grid gap-3 text-sm font-medium text-zinc-500">
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/25 p-3">
              <Music2 size={18} className="shrink-0 text-[#FF0055]" />
              <span>Personal playlists and library sync across devices.</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/25 p-3">
              <ShieldCheck size={18} className="shrink-0 text-[#FF0055]" />
              <span>Authentication is handled securely by Google and Supabase.</span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-medium leading-5 text-zinc-600">
            By continuing, you agree to the{" "}
            <Link href="/terms" className="text-zinc-400 hover:text-white">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy-policy" className="text-zinc-400 hover:text-white">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

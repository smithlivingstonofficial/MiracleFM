"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Enter your admin email and password.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      toast.error("Invalid admin credentials.");
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();
      toast.error("This account does not have admin access.");
      setIsLoading(false);
      return;
    }

    toast.success("Welcome back.");
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,85,0.18),transparent_34%),linear-gradient(to_bottom,#16070d_0%,#050505_72%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_440px] lg:px-10">
        <section className="hidden min-w-0 lg:block">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10">
              <Image src="/miraclefm.jpg" alt="Miracle FM" fill className="object-cover" priority />
            </span>
            <span>
              <span className="block text-2xl font-black leading-tight tracking-tight">MIRACLE FM</span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Admin Console</span>
            </span>
          </Link>
          <h1 className="max-w-2xl text-6xl font-black leading-[1.12] tracking-tight">
            Secure access for the people stewarding Miracle FM.
          </h1>
          <p className="mt-5 max-w-xl text-base font-medium leading-7 text-zinc-400">
            Manage tracks, artists, recommendations, and storage tools from one protected workspace.
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#FF0055]">
                <ShieldCheck size={13} />
                Admin only
              </div>
              <h2 className="text-3xl font-black leading-tight tracking-tight text-white">Sign in</h2>
              <p className="mt-1 text-sm font-medium text-zinc-500">Use an approved administrator account.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-[#FF0055]">
              <LockKeyhole size={22} />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-13 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-sm font-bold text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#FF0055]/60"
                placeholder="admin@miraclefm.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-13 w-full rounded-2xl border border-white/10 bg-black/45 px-4 pr-12 text-sm font-bold text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#FF0055]/60"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF0055] text-sm font-black text-white shadow-[0_18px_45px_rgba(255,0,85,0.22)] transition-transform hover:scale-[1.01] disabled:opacity-65"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={18} />}
              Continue
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 text-xs font-bold text-zinc-500">
            <Link href="/" className="transition-colors hover:text-white">Back to Miracle FM</Link>
            <Link href="/signin" className="transition-colors hover:text-white">Listener sign-in</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

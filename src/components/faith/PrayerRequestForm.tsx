"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type PrayerRequestFormProps = {
  isSignedIn: boolean;
};

export default function PrayerRequestForm({ isSignedIn }: PrayerRequestFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Please add a short title and prayer details.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      toast.message("Sign in to share a prayer request.");
      return;
    }

    const { error } = await supabase.from("prayer_requests").insert({
      user_id: user.id,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 1200),
      is_anonymous: isAnonymous,
      visibility: "private",
      status: "pending",
    });

    setLoading(false);
    if (error) {
      toast.error("Prayer request could not be saved.");
      return;
    }

    setTitle("");
    setBody("");
    setIsAnonymous(true);
    toast.success("Prayer request saved privately.");
  };

  if (!isSignedIn) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-6 md:rounded-[2rem]">
        <h2 className="text-xl font-black tracking-tighter text-white sm:text-2xl">Prayer Requests</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-zinc-400">
          Sign in to save a private prayer request. Listening, lyrics, sharing, and worship discovery stay open for guests.
        </p>
        <Link
          href="/signin"
          className="mt-5 inline-flex rounded-full bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition-transform active:scale-95 sm:mt-6"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-6 md:rounded-[2rem]">
      <div className="mb-5">
        <h2 className="text-xl font-black tracking-tighter text-white sm:text-2xl">Prayer Requests</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-zinc-400">Saved privately for this MVP. Public prayer wall comes later with moderation.</p>
      </div>

      <div className="space-y-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Prayer title"
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF0055]/60"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1200}
          rows={5}
          placeholder="Share what you want prayer for"
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-medium leading-7 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF0055]/60"
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-3 text-left text-sm font-bold leading-6 text-zinc-300 sm:items-center">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#FF0055] sm:mt-0"
          />
          Keep anonymous for future public display
        </label>
        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF0055] px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#ff1a66] active:scale-95 disabled:opacity-60 sm:w-auto"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Save Prayer
        </button>
      </div>
    </form>
  );
}

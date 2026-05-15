"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import HomeTrackSection from "@/components/user/home/HomeTrackSection";
import { usePlayerStore } from "@/store/usePlayerStore";
import { isPlayableTrack, type Track } from "@/types/music";

const STORAGE_KEY = "miraclefm-guest-recent-tracks";
const UPDATE_EVENT = "miraclefm-guest-recent-updated";
const MAX_RECENT = 10;

const readRecentSnapshot = () => {
  if (typeof window === "undefined") return "[]";
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    const tracks = Array.isArray(parsed) ? (parsed as Track[]).filter(isPlayableTrack).slice(0, MAX_RECENT) : [];
    return JSON.stringify(tracks);
  } catch {
    return "[]";
  }
};

const subscribeToRecent = (callback: () => void) => {
  window.addEventListener(UPDATE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(UPDATE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

export default function GuestRecentlyPlayedSection({ enabled }: { enabled: boolean }) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const snapshot = useSyncExternalStore(subscribeToRecent, readRecentSnapshot, () => "[]");
  const tracks = useMemo(() => {
    try {
      return JSON.parse(snapshot) as Track[];
    } catch {
      return [];
    }
  }, [snapshot]);

  useEffect(() => {
    if (!enabled || !isPlaying || !isPlayableTrack(currentTrack)) return;

    let existing: Track[] = [];
    try {
      existing = (JSON.parse(readRecentSnapshot()) as Track[]).filter(isPlayableTrack);
    } catch {}
    const next = [currentTrack, ...existing.filter((track) => track.id !== currentTrack.id)].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }, [currentTrack, enabled, isPlaying]);

  if (!enabled || tracks.length === 0) return null;

  return (
    <HomeTrackSection
      title="Recently Played"
      description="Saved on this device so guests can quickly return to worship songs."
      tracks={tracks}
      context="Guest Recent"
    />
  );
}

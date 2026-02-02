import { create } from "zustand";

interface Track {
  id: string;
  title: string;
  hls_url: string;
  artists?: { name: string };
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  setTrack: (track: Track) => void;
  setIsPlaying: (playing: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  setTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}));
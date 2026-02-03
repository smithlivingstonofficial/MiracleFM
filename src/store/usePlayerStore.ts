import { create } from "zustand";

interface Track {
  id: string;
  title: string;
  hls_url: string;
  cover_url?: string;
  artists?: { name: string; image_url?: string };
  albums?: { title: string; cover_url?: string };
}

type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  // Core State
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;

  // Modifiers
  isShuffled: boolean;
  repeatMode: RepeatMode;
  
  // UI State
  isFullScreen: boolean;
  
  // Time Synchronization State
  currentTime: number;
  duration: number;

  // Actions
  setTrack: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  setIsPlaying: (playing: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFullScreen: () => void;
  
  // Time Actions
  setCurrentTime: (time: number) => void;
  setDuration: (time: number) => void;
  seekTo: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial State
  isPlaying: false,
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isShuffled: false,
  repeatMode: "off",
  isFullScreen: false,
  currentTime: 0,
  duration: 0,

  // --- ACTIONS ---

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),

  // Play a single track (creates a new queue of 1)
  setTrack: (track) => set({ 
    currentTrack: track, 
    queue: [track], 
    currentIndex: 0, 
    isPlaying: true 
  }),

  // Play a list of tracks (from an Album, Playlist, etc.)
  setQueue: (tracks, startIndex = 0) => set({
    queue: tracks,
    currentTrack: tracks[startIndex],
    currentIndex: startIndex,
    isPlaying: true
  }),

  playNext: () => {
    const { queue, currentIndex, isShuffled, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === "one") {
      const audio = document.querySelector("audio");
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
      return;
    }

    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === "all") {
        nextIndex = 0; // Loop back to the start
      } else {
        set({ isPlaying: false }); // Stop at the end
        return; 
      }
    }

    set({ currentTrack: queue[nextIndex], currentIndex: nextIndex, isPlaying: true });
  },

  playPrevious: () => {
    const { queue, currentIndex, isShuffled } = get();
    if (queue.length === 0) return;

    const audio = document.querySelector("audio");
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let prevIndex;
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentIndex - 1;
    }

    if (prevIndex < 0) {
      prevIndex = queue.length - 1; // Loop to the end
    }

    set({ currentTrack: queue[prevIndex], currentIndex: prevIndex, isPlaying: true });
  },

  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  
  toggleRepeat: () => set((state) => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
    return { repeatMode: modes[nextIndex] };
  }),

  // --- TIME SYNCHRONIZATION ACTIONS ---
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (time) => set({ duration: time }),
  
  // Action triggered by UI sliders to update the <audio> element
  seekTo: (time) => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.currentTime = time;
    }
    // Update the state so UI sliders don't jump back
    set({ currentTime: time });
  }
}));
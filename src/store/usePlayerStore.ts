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
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];           // The list of songs playing
  currentIndex: number;     // Where we are in the list
  isShuffled: boolean;
  repeatMode: RepeatMode;

  // Actions
  setTrack: (track: Track) => void; // Legacy single play
  setQueue: (tracks: Track[], startIndex?: number) => void; // Play a whole list
  setIsPlaying: (playing: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isShuffled: false,
  repeatMode: "off",

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  // Play a single track (creates a queue of 1)
  setTrack: (track) => set({ 
    currentTrack: track, 
    queue: [track], 
    currentIndex: 0, 
    isPlaying: true 
  }),

  // Play a list of tracks (Album/Playlist)
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
      // Just re-trigger the current track
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

    // Check bounds
    if (nextIndex >= queue.length) {
      if (repeatMode === "all") {
        nextIndex = 0; // Loop back to start
      } else {
        set({ isPlaying: false }); // Stop at end
        return; 
      }
    }

    set({ currentTrack: queue[nextIndex], currentIndex: nextIndex, isPlaying: true });
  },

  playPrevious: () => {
    const { queue, currentIndex, isShuffled } = get();
    if (queue.length === 0) return;

    // If song played for > 3 seconds, just restart it
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

    if (prevIndex < 0) prevIndex = queue.length - 1; // Loop to end

    set({ currentTrack: queue[prevIndex], currentIndex: prevIndex, isPlaying: true });
  },

  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  
  toggleRepeat: () => set((state) => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
    return { repeatMode: modes[nextIndex] };
  }),
}));
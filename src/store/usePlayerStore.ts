import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isPlayableTrack, type Track } from "@/types/music";

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
  seekTarget: number | null;
  seekRequestId: number;

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

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial State
      isPlaying: false,
      currentTrack: null,
      queue:[],
      currentIndex: -1,
      
      // Default to Shuffle ON
      isShuffled: true,
      
      repeatMode: "off",
      isFullScreen: false,
      currentTime: 0,
      duration: 0,
      seekTarget: null,
      seekRequestId: 0,

      // --- ACTIONS ---

      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),

      // Play a single track (creates a new queue of 1)
      setTrack: (track) => {
        if (!isPlayableTrack(track)) return;

        set({ 
        currentTrack: track, 
        queue: [track], 
        currentIndex: 0, 
        isPlaying: true 
        });
      },

      // Play a list of tracks (from an Album, Playlist, etc.)
      setQueue: (tracks, startIndex = 0) => {
        const playableTracks = tracks.filter(isPlayableTrack);
        if (!playableTracks.length) return;
        const requestedTrack = tracks[startIndex];
        const requestedPlayableIndex = requestedTrack
          ? playableTracks.findIndex((track) => track.id === requestedTrack.id)
          : -1;
        const safeIndex =
          requestedPlayableIndex >= 0
            ? requestedPlayableIndex
            : Math.min(Math.max(startIndex, 0), playableTracks.length - 1);

        set({
          queue: playableTracks,
          currentTrack: playableTracks[safeIndex],
          currentIndex: safeIndex,
          isPlaying: true
        });
      },

      playNext: () => {
        const { queue, currentIndex, isShuffled, repeatMode } = get();
        if (queue.length === 0) return;

        if (repeatMode === "one") {
          set((state) => ({
            currentTime: 0,
            seekTarget: 0,
            seekRequestId: state.seekRequestId + 1,
            isPlaying: true,
          }));
          return;
        }

        let nextIndex;
        if (isShuffled && queue.length > 1) {
          // SMART SHUFFLE: Ensure the next random track is not the exact same as the current one
          do {
            nextIndex = Math.floor(Math.random() * queue.length);
          } while (nextIndex === currentIndex);
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

        // If song played for > 3 seconds, just restart it
        if (get().currentTime > 3) {
          set((state) => ({
            currentTime: 0,
            seekTarget: 0,
            seekRequestId: state.seekRequestId + 1,
          }));
          return;
        }

        let prevIndex;
        if (isShuffled && queue.length > 1) {
          // SMART SHUFFLE: Ensure the previous random track is not the exact same
          do {
            prevIndex = Math.floor(Math.random() * queue.length);
          } while (prevIndex === currentIndex);
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
      seekTo: (time) => set((state) => ({
        currentTime: time,
        seekTarget: time,
        seekRequestId: state.seekRequestId + 1,
      }))
    }),
    {
      name: "miraclefm-player-storage", // The key used in localStorage
      storage: createJSONStorage(() => localStorage),
      // Only persist these specific fields to local storage
      partialize: (state) => ({
        queue: state.queue,
        currentTrack: state.currentTrack,
        currentIndex: state.currentIndex,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
      }),
    }
  )
);

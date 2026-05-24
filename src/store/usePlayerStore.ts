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
  playedTrackIds: string[];
  playHistoryIds: string[];
  historyIndex: number;

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
  appendToQueue: (tracks: Track[]) => void;
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

const dedupePlayableTracks = (tracks: Track[]) => {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (!isPlayableTrack(track) || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
};

const appendUniqueId = (ids: string[], id: string) => (ids.includes(id) ? ids : [...ids, id]);

const chooseRandomIndex = (indexes: number[]) => indexes[Math.floor(Math.random() * indexes.length)];

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial State
      isPlaying: false,
      currentTrack: null,
      queue:[],
      currentIndex: -1,
      playedTrackIds: [],
      playHistoryIds: [],
      historyIndex: -1,
      
      // Default to Shuffle ON
      isShuffled: true,
      
      repeatMode: "all",
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
          playedTrackIds: [track.id],
          playHistoryIds: [track.id],
          historyIndex: 0,
          currentTime: 0,
          isPlaying: true
        });
      },

      // Play a list of tracks (from an Album, Playlist, etc.)
      setQueue: (tracks, startIndex = 0) => {
        const playableTracks = dedupePlayableTracks(tracks);
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
          playedTrackIds: [playableTracks[safeIndex].id],
          playHistoryIds: [playableTracks[safeIndex].id],
          historyIndex: 0,
          currentTime: 0,
          isPlaying: true
        });
      },

      appendToQueue: (tracks) => {
        const playableTracks = dedupePlayableTracks(tracks);
        if (!playableTracks.length) return;

        set((state) => {
          const existingIds = new Set(state.queue.map((track) => track.id));
          const newTracks = playableTracks.filter((track) => !existingIds.has(track.id));
          if (!newTracks.length) return {};

          return { queue: [...state.queue, ...newTracks] };
        });
      },

      playNext: () => {
        const { queue, currentIndex, isShuffled, repeatMode, playedTrackIds, playHistoryIds, historyIndex } = get();
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

        const futureTrackId = historyIndex >= 0 ? playHistoryIds[historyIndex + 1] : undefined;
        if (futureTrackId) {
          const futureIndex = queue.findIndex((track) => track.id === futureTrackId);
          if (futureIndex >= 0) {
            set({
              currentTrack: queue[futureIndex],
              currentIndex: futureIndex,
              historyIndex: historyIndex + 1,
              currentTime: 0,
              isPlaying: true,
            });
            return;
          }
        }

        let nextIndex = -1;
        let resetPlayedCycle = false;
        if (isShuffled && queue.length > 1) {
          const unplayedIndexes = queue
            .map((track, index) => ({ track, index }))
            .filter(({ track, index }) => index !== currentIndex && !playedTrackIds.includes(track.id))
            .map(({ index }) => index);

          if (unplayedIndexes.length > 0) {
            nextIndex = chooseRandomIndex(unplayedIndexes);
          } else if (repeatMode === "all") {
            const nextCycleIndexes = queue.map((_, index) => index).filter((index) => index !== currentIndex);
            nextIndex = chooseRandomIndex(nextCycleIndexes);
            resetPlayedCycle = true;
          }
        } else {
          nextIndex = currentIndex + 1;
        }

        if (nextIndex >= queue.length) {
          if (repeatMode === "all") {
            nextIndex = 0; // Loop back to the start
          } else if (queue.length > 1) {
            nextIndex = 0; // Keep worship playing through a queued session
          } else {
            set({ isPlaying: false }); // Stop at the end
            return; 
          }
        }

        if (nextIndex < 0) {
          if (repeatMode !== "all") {
            set({ isPlaying: false });
            return;
          }
          nextIndex = currentIndex;
        }

        if (nextIndex === currentIndex) {
          set((state) => ({
            currentTime: 0,
            seekTarget: 0,
            seekRequestId: state.seekRequestId + 1,
            isPlaying: true,
          }));
          return;
        }

        const nextTrack = queue[nextIndex];
        const nextHistory = [...playHistoryIds.slice(0, Math.max(historyIndex + 1, 0)), nextTrack.id];

        set({
          currentTrack: nextTrack,
          currentIndex: nextIndex,
          playedTrackIds: resetPlayedCycle ? [nextTrack.id] : appendUniqueId(playedTrackIds, nextTrack.id),
          playHistoryIds: nextHistory,
          historyIndex: nextHistory.length - 1,
          currentTime: 0,
          isPlaying: true,
        });
      },

      playPrevious: () => {
        const { queue, currentIndex, playHistoryIds, historyIndex } = get();
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

        const previousTrackId = historyIndex > 0 ? playHistoryIds[historyIndex - 1] : undefined;
        if (previousTrackId) {
          const previousIndex = queue.findIndex((track) => track.id === previousTrackId);
          if (previousIndex >= 0) {
            set({
              currentTrack: queue[previousIndex],
              currentIndex: previousIndex,
              historyIndex: historyIndex - 1,
              currentTime: 0,
              isPlaying: true,
            });
            return;
          }
        }

        const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
        const previousTrack = queue[prevIndex];
        const nextHistory = [previousTrack.id];
        set({
          currentTrack: previousTrack,
          currentIndex: prevIndex,
          playHistoryIds: nextHistory,
          historyIndex: 0,
          currentTime: 0,
          isPlaying: true,
        });
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
        isFullScreen: state.isFullScreen,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
      }),
    }
  )
);

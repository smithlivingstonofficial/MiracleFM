export const ADSENSE_CLIENT = "ca-pub-8115646001024972";
export const HOME_FEED_AD_SLOT = "6397247029";
export const RECTANGLE_AD_SLOT = "7678897893";
export const SONG_LIST_FEED_AD_SLOT = "7746707239";

const MIN_TRACKS_FOR_SONG_LIST_ADS = 8;
const MIN_TRACKS_FOR_SECOND_SONG_LIST_AD = 15;
const REPEATING_SONG_LIST_AD_INTERVAL = 12;

export function shouldRenderSongListAdAfter(index: number, totalTracks: number) {
  if (totalTracks < MIN_TRACKS_FOR_SONG_LIST_ADS) return false;
  const trackPosition = index + 1;

  if (trackPosition === 5) return true;
  if (trackPosition === 12) return totalTracks >= MIN_TRACKS_FOR_SECOND_SONG_LIST_AD;
  if (trackPosition > 12 && trackPosition % REPEATING_SONG_LIST_AD_INTERVAL === 0) {
    return totalTracks - trackPosition >= 3;
  }
  return false;
}

# MiracleFM User-Side Audit

## 1. Current Project Structure Summary

MiracleFM is a Next.js App Router project with user routes under `src/app/(user)`, admin routes under `src/app/(admin)`, Supabase helpers in `src/lib/supabase`, a Zustand player store in `src/store/usePlayerStore.ts`, and reusable player/user components under `src/components`.

## 2. Already Implemented Features

- Persistent user layout with desktop sidebar, mobile nav, mini player, and full-screen player.
- HLS/fallback playback, queue, shuffle, repeat, seek, volume, media session metadata, and audio event logging.
- Public home, search, library, liked songs, playlist, artist, and album pages.
- User likes through `user_likes`.
- User playlists through `playlists` and `playlist_tracks`.
- Sharing on album, artist, playlist, and player surfaces.
- PWA manifest, icons, service worker, and mobile viewport setup.

## 3. Partially Implemented Features

- Listener analytics exist through `play_events`, but public song listen totals were not exposed.
- Search covers songs, artists, and albums, but copy was generic and song detail discovery was limited.
- Personal library covers liked songs and playlists, but recent/continue listening was not surfaced on the user side.
- Lyrics are editable on admin track pages, but no user-facing song detail/lyrics page existed.

## 4. Missing Important User-Side Features

- Faith page for Christian daily engagement.
- Song detail page with lyrics, share, play, related songs, and valid listen totals.
- Guest-friendly sign-in prompts for personal actions.
- Public aggregate song listen counts that do not expose raw playback events.
- Private prayer request submission structure.

## 5. Bugs / Weak Areas Found

- Some source comments contain mojibake characters from earlier encoding issues.
- README still contains default scaffold content.
- Raw playback data is admin-readable only, which is good for privacy, but users had no safe aggregate stats.
- Mobile nav had only Home, Search, and Library, leaving Faith/Profile less discoverable.

## 6. Current Database / Supabase Structure Observed

Observed app usage includes `profiles`, `tracks`, `artists`, `albums`, `banners`, `playlists`, `playlist_tracks`, `user_likes`, `encoding_jobs`, `track_audio_variants`, `play_events`, and `integration_health_checks`.

Existing migrations primarily cover the audio streaming pipeline, playback events, integration health checks, and fallback validation.

## 7. Current Audio Player Flow

`usePlayerStore` stores current track, queue, playback state, shuffle/repeat state, full-screen state, and time/seek synchronization. `AudioPlayer` loads HLS with `hls.js` where needed, falls back to direct audio, logs playback events, updates Media Session metadata, and auto-plays the next queue item.

Qualified listens are already emitted as `listen_qualified` after 30 seconds or 50% of duration.

## 8. Current Authentication Flow

Supabase SSR/client helpers are used. Middleware checks profile roles for admin routes. User library pages redirect guests to `/signin`; public browsing remains available.

## 9. Current UI/UX Issues

- Strong music experience exists, but spiritual product identity needed a clear Faith destination.
- Song-level pages and lyrics were missing.
- Guest behavior needed clearer prompts for account-only actions.
- Listen counts needed to be displayed as real playback metrics instead of simple page views.

## 10. Recommended Development Order

1. Add safe aggregate listen stats and private prayer/recent-play policies.
2. Add song detail page with lyrics and listen counts.
3. Add Faith page and navigation.
4. Add continue/recent listening to home/library where safe.
5. Polish guest prompts and search copy.

## 11. Risks Before Development

- Existing base tables are not fully represented in migrations, so new work should reuse current table names.
- RLS must not expose raw `play_events` publicly.
- Service worker changes should avoid aggressive HLS caching changes.
- Player changes should remain minimal to avoid breaking streaming.

## 12. Notes for Future Improvement

- Add save album and follow artist after the MVP stabilizes.
- Add moderated public prayer wall later.
- Add public playlist privacy controls later.
- Add richer lyrics modes if Tamil/Tanglish/English/chords data becomes structured.

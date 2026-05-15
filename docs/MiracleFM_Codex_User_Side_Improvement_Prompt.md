# MiracleFM User-Side Improvement — Codex Development Prompt

Copy and paste this full prompt into Codex while working inside the existing MiracleFM repository.

---

## Project Context

You are working on my existing project:

**MiracleFM** — a Christian / Tamil Christian music streaming web application.

Live site reference:

```txt
https://miraclefm.vercel.app/
```

The product goal is to improve the **user side** of MiracleFM into a professional Christian music streaming platform with:

- Smooth music playback
- Persistent player experience
- Personal user library
- Better discovery
- Lyrics and worship-focused pages
- Christian spiritual engagement features
- Mobile-first/PWA-ready experience

This is not a fresh project. Some features are already built. Your first job is to understand the current codebase before making changes.

---

## Existing Tech Stack Context

Assume the project may already include some or all of these:

- Next.js
- React
- TypeScript or JavaScript
- Supabase
- Supabase Auth
- Supabase Postgres
- Cloudflare R2 for audio/media storage
- HLS audio streaming using `.m3u8` and `.ts` files
- Tailwind CSS or similar styling
- Existing music player
- Existing song/artist/album data model
- Existing user authentication
- Existing deployment on Vercel
- Future PWA / Android app plans

Do not assume every item is already implemented. Verify by reading the project files.

---

# Very Important Development Rule

Do **not** blindly recreate the project from scratch.

First inspect the existing codebase and understand:

1. What is already built
2. What is partially built
3. What is broken
4. What is missing
5. What can be reused
6. What should be improved
7. What should be postponed

Your goal is to improve the existing system safely, not create duplicate components or break current working features.

---

# Step 1 — Mandatory Codebase Audit

Before making major feature changes, inspect the complete repository.

Check:

- App routing structure
- Current pages/routes
- Layout files
- Existing components
- Existing audio player logic
- Existing global providers/context/state management
- Supabase client setup
- Supabase server/client helpers
- Authentication flow
- Database types if available
- Existing SQL migrations if available
- Existing music entities: songs, artists, albums, categories, playlists
- Existing storage/audio streaming implementation
- Existing loading/error states
- Existing mobile responsiveness
- Existing SEO metadata
- Existing PWA files if any
- Existing lint/build/test commands
- Existing `README.md`, `AGENTS.md`, or project instruction files

Create a file named:

```txt
MIRACLEFM_USER_SIDE_AUDIT.md
```

The audit file must include:

```md
# MiracleFM User-Side Audit

## 1. Current Project Structure Summary

## 2. Already Implemented Features

## 3. Partially Implemented Features

## 4. Missing Important User-Side Features

## 5. Bugs / Weak Areas Found

## 6. Current Database / Supabase Structure Observed

## 7. Current Audio Player Flow

## 8. Current Authentication Flow

## 9. Current UI/UX Issues

## 10. Recommended Development Order

## 11. Risks Before Development

## 12. Notes for Future Improvement
```

Do not skip the audit. Use it to avoid duplicating already-built features.

---

# Step 2 — Implementation Strategy

After the audit, improve the app in priority order.

Rules:

1. Reuse existing components wherever possible.
2. Improve existing components instead of creating duplicates.
3. Do not remove working functionality.
4. Do not break audio playback.
5. Do not break authentication.
6. Do not break existing Supabase queries.
7. Keep all changes modular and maintainable.
8. Make the app mobile-first.
9. Add loading states, empty states, and error states.
10. Use safe Supabase RLS policies for new user-owned data.
11. Use existing naming conventions where possible.
12. Do not hardcode production data unless clearly used as a fallback.
13. If environment variables are missing, document them instead of breaking the app.
14. If a required feature depends on unavailable data, create the UI and data structure safely with clean fallbacks.
15. Run lint/build checks before finishing.

---

# Product Positioning

MiracleFM should not feel like a generic Spotify clone.

It should feel like:

```txt
Spotify-level music usability + YouVersion-level spiritual calm + Tamil Christian worship identity
```

Core product direction:

```txt
MiracleFM is a Tamil Christian worship, music, prayer, devotion, and spiritual audio platform for daily Christian life.
```

The user side should focus on:

- Listening
- Worship discovery
- Personal library
- Lyrics
- Prayer
- Daily faith engagement
- Mobile listening

---

# Main User-Side Navigation Target

Check the existing navigation first. Improve or adapt it toward this structure if suitable:

```txt
Home
Search
Library
Faith
Profile
```

For mobile, use a bottom navigation pattern if the existing design supports it.

Suggested mobile bottom nav:

```txt
Home | Search | Library | Faith | Profile
```

Do not force this structure if the current project has a better working navigation, but the final UX should make these user areas easy to access.

---

# Priority 1 — Music Player Experience

The player is the most important part of MiracleFM.

Audit the existing player first, then improve it.

## Required Player Features

Implement or improve:

- Persistent audio player across route/page navigation
- Fixed mini player at the bottom
- Full-screen player view
- Play / pause
- Next / previous
- Seek bar
- Current time and total duration
- Volume control on desktop where suitable
- Queue system
- Auto-play next song
- Shuffle mode
- Repeat one / repeat all
- Loading/buffering state
- Error state when audio fails
- Retry option for failed audio
- Display song title
- Display artist name
- Display cover image
- Display current queue item
- Player should not reset unnecessarily during navigation
- Mobile-friendly touch controls
- Safe spacing for mobile bottom nav
- Media Session API support if possible

## Media Session API Behavior

If suitable, add browser media metadata support:

- Song title
- Artist name
- Album name if available
- Cover artwork if available
- Play action handler
- Pause action handler
- Previous track handler
- Next track handler
- Seek handlers if stable

Do not add unstable Media Session logic that breaks playback.

## Player Acceptance Criteria

The feature is complete when:

- User can play a song.
- Song continues while navigating pages.
- Mini player stays visible.
- Full player opens smoothly.
- Queue works.
- Next/previous work.
- Auto-next works when a song ends.
- Failed stream shows a helpful error instead of silently breaking.
- Mobile experience feels like a real streaming app.

---

# Priority 2 — Personal Library

Audit existing user-library logic first.

## Required Library Features

Implement or improve:

- Like song
- Unlike song
- Liked songs page
- Save album
- Unsave album
- Follow artist
- Unfollow artist
- Create playlist
- Edit playlist title
- Edit playlist description
- Delete playlist
- Add song to playlist
- Remove song from playlist
- My playlists page
- Recently played songs
- Listening history
- Continue listening section

## Guest User Behavior

For unauthenticated users:

- Listening can work if the current app supports guest listening.
- Personal actions should show a sign-in prompt.
- Do not throw errors when a guest clicks Like, Save, Follow, or Add to Playlist.

Example guest prompt text:

```txt
Sign in to save this song to your worship collection.
```

## Library Acceptance Criteria

The feature is complete when:

- Logged-in users can build a personal collection.
- Personal actions persist in Supabase.
- Guest users receive clean sign-in prompts.
- No duplicated likes/saves/follows occur.
- Recently played updates correctly.
- Playlist management works from song cards and detail pages.

---

# Priority 3 — Home Page Discovery

The home page should guide users even when they do not know what to search.

Audit the existing home page and improve it with useful music discovery sections.

## Recommended Home Sections

Use real data where available:

1. Continue Listening
2. Recently Played
3. Today’s Worship
4. New Tamil Christian Songs
5. Popular Worship Songs
6. Featured Artists
7. Mood-Based Worship
8. Kids / VBS Songs
9. Old Tamil Christian Songs
10. Instrumental Worship
11. Sermons / Messages if available
12. Verse of the Day if available

## Mood / Category Examples

Create category support if suitable and missing:

```txt
Morning Worship
Night Prayer
Healing Songs
Fasting Prayer
Family Prayer
Youth Worship
Kids Songs
VBS Songs
Christmas Songs
Easter Songs
Good Friday Songs
New Year Worship
Instrumental Worship
Old Christian Songs
Tamil Worship
English Worship
```

## Home Acceptance Criteria

The feature is complete when:

- Home page does not feel empty.
- Users can start listening without searching.
- Sections have clean loading states.
- Sections have clean empty states.
- Song cards work with the player.
- Mobile layout is polished.

---

# Priority 4 — Search and Browse

Search should be simple, fast, and useful.

Audit existing search first.

## Required Search Features

Implement or improve:

- Search songs
- Search artists
- Search albums
- Search playlists if available
- Search lyrics if lyrics data exists
- Search by category/mood/language if available
- Result tabs or grouped sections
- Recent searches if easy and safe
- Empty search state
- Loading state
- Debounced input if suitable
- Mobile-friendly search UI

## Search Result Types

Recommended groups:

```txt
Top Results
Songs
Artists
Albums
Playlists
Lyrics
```

## Search Acceptance Criteria

The feature is complete when:

- User can find songs, artists, and albums quickly.
- Empty state is helpful.
- Search does not crash on missing data.
- Search works well on mobile.

---

# Priority 5 — Music Entity Detail Pages

Improve or create clean pages for important music entities.

Use the current routing system. If using Next.js App Router, preferred routes are:

```txt
/song/[slug]
/artist/[slug]
/album/[slug]
/playlist/[slug]
```

If the project already uses different route names, adapt to the current structure.

---

## Song Detail Page

Should include:

- Song title
- Artist
- Album if available
- Cover image
- Play button
- Like button
- Add to playlist button
- Share button
- Lyrics section if available
- Related songs
- More from this artist
- SEO metadata if possible

---

## Artist Detail Page

Should include:

- Artist image
- Artist name
- Follow button
- Bio if available
- Popular songs
- Albums
- Latest releases
- Related artists if available
- SEO metadata if possible

---

## Album Detail Page

Should include:

- Album cover
- Album title
- Artist
- Release year if available
- Save album button
- Song list
- Play all button
- SEO metadata if possible

---

## Playlist Detail Page

Should include:

- Playlist cover
- Playlist title
- Description
- Owner
- Song list
- Play all button
- Share button
- Add/remove song controls for owner
- Public/private status if supported
- SEO metadata for public playlists if possible

---

## Detail Page Acceptance Criteria

The feature is complete when:

- Important entities have polished detail pages.
- Play buttons start audio correctly.
- Save/follow/like actions work.
- Missing images have fallback UI.
- Pages are mobile responsive.
- Public pages are shareable.

---

# Priority 6 — Christian / Spiritual Features

These features make MiracleFM unique.

Create or improve a main section called:

```txt
Faith
```

Do not build unsafe community features without moderation-ready structure.

---

## Faith Page Features

Build or prepare:

- Verse of the Day
- Today’s Worship Song
- Daily Worship Playlist
- Short daily devotion
- Prayer request submission
- Anonymous prayer request option
- Public prayer wall if moderation-ready
- “I prayed” button
- Prayer count
- User notification-ready event when someone prays
- Share verse option

---

## Prayer Request Safety Rules

Prayer request features must be privacy-safe.

Rules:

1. Users can submit prayer requests.
2. Users can choose anonymous or public display.
3. Anonymous requests must not expose name, email, or user id in public UI.
4. Public prayer wall should be moderation-ready.
5. Add a status field such as `pending`, `approved`, `rejected` if building public prayer wall.
6. Users can delete their own requests if supported.
7. Other users can tap “I prayed.”
8. A user should not be able to spam duplicate “I prayed” actions for the same request.

---

## Lyrics / Worship Support

Build or prepare support for:

- Song lyrics
- Tamil lyrics
- Tanglish lyrics
- English translation if data exists
- Chord sheet support if data exists
- Worship leader/church use cases

Recommended lyric display options:

```txt
Tamil
Tanglish
English
Chords
```

Only show tabs for data that exists.

---

## Spiritual Feature Acceptance Criteria

The feature is complete when:

- MiracleFM feels clearly Christian and worship-focused.
- Faith page is clean and meaningful.
- Prayer requests are privacy-safe.
- Lyrics are easy to read on mobile.
- Empty states are graceful when spiritual content is not yet added.

---

# Priority 7 — Sharing and Growth

Add simple sharing features to support organic growth through WhatsApp, Instagram, and social platforms.

## Required Sharing Features

Implement or improve:

- Share song
- Share artist
- Share album
- Share playlist
- Copy link fallback
- Web Share API on supported mobile browsers
- Open Graph metadata for public pages if possible
- SEO title and description for public pages
- Clean public URLs

## Share Button Behavior

When the browser supports Web Share API:

- Use native share sheet.

When not supported:

- Copy URL to clipboard.
- Show success toast.

## Sharing Acceptance Criteria

The feature is complete when:

- Users can share songs easily.
- Links do not break.
- Shared pages have meaningful metadata where possible.
- WhatsApp/social previews are improved if metadata support exists.

---

# Priority 8 — PWA / Mobile Experience

MiracleFM must feel good on mobile.

Audit current mobile UI first.

## Required Mobile Improvements

Implement or improve:

- Fully responsive layout
- Bottom navigation if suitable
- Touch-friendly buttons
- Sticky mini player above bottom nav
- Safe area spacing for mobile devices
- Mobile full-screen player
- Mobile search experience
- Mobile library experience
- App manifest if missing
- Installable PWA support if safe
- Offline fallback page if suitable
- Service worker only if it does not break streaming/audio behavior
- Media Session API metadata support

## PWA Warning

Do not aggressively cache HLS audio segments unless the architecture is designed for it. Avoid breaking streaming with unsafe service worker caching.

## Mobile/PWA Acceptance Criteria

The feature is complete when:

- Mobile layout is polished.
- Player controls are easy to use.
- Bottom navigation and mini player do not overlap.
- PWA install basics work if implemented.
- Audio playback is not broken by PWA changes.

---

# Priority 9 — Notification-Ready Structure

If full push notifications are too much for this phase, create a clean notification-ready structure only.

## Useful Notification Types

Prepare for:

- New song uploaded
- New album released
- New artist followed release
- Daily verse
- Daily worship reminder
- Someone prayed for your request
- Playlist update

## Notification Acceptance Criteria

The feature is complete when:

- Notification table/model exists if needed.
- UI can display notifications if implemented.
- No broken/incomplete push logic is added.
- Future push integration is easy.

---

# Suggested Supabase Database Tables

Only add missing tables when needed. Do not duplicate existing tables.

Before creating migrations, inspect current database structure, types, and existing migrations.

Suggested user-side tables:

```sql
profiles
songs
artists
albums
playlists
playlist_songs
liked_songs
saved_albums
followed_artists
recently_played
listening_history
lyrics
categories
song_categories
mood_tags
song_mood_tags
prayer_requests
prayer_prays
daily_verses
devotions
notifications
song_play_events
```

---

## Suggested Table Responsibilities

### `liked_songs`

Stores songs liked by a user.

Expected fields:

```txt
id
user_id
song_id
created_at
```

Constraint:

```txt
unique(user_id, song_id)
```

---

### `saved_albums`

Stores albums saved by a user.

Expected fields:

```txt
id
user_id
album_id
created_at
```

Constraint:

```txt
unique(user_id, album_id)
```

---

### `followed_artists`

Stores artists followed by a user.

Expected fields:

```txt
id
user_id
artist_id
created_at
```

Constraint:

```txt
unique(user_id, artist_id)
```

---

### `playlists`

Stores user-created playlists.

Expected fields:

```txt
id
user_id
title
description
cover_url
is_public
created_at
updated_at
```

---

### `playlist_songs`

Stores songs inside playlists.

Expected fields:

```txt
id
playlist_id
song_id
position
added_at
```

---

### `recently_played`

Stores recent song plays for quick user access.

Expected fields:

```txt
id
user_id
song_id
played_at
progress_seconds
```

---

### `listening_history`

Stores deeper listening events.

Expected fields:

```txt
id
user_id
song_id
started_at
ended_at
played_seconds
completed
source
```

---

### `lyrics`

Stores lyrics for songs.

Expected fields:

```txt
id
song_id
language
content
is_synced
created_at
updated_at
```

Possible `language` values:

```txt
ta
tanglish
en
chords
```

---

### `prayer_requests`

Stores prayer requests.

Expected fields:

```txt
id
user_id
title
body
is_anonymous
visibility
status
created_at
updated_at
```

Possible `visibility` values:

```txt
private
public
```

Possible `status` values:

```txt
pending
approved
rejected
```

---

### `prayer_prays`

Stores “I prayed” actions.

Expected fields:

```txt
id
prayer_request_id
user_id
created_at
```

Constraint:

```txt
unique(prayer_request_id, user_id)
```

---

### `daily_verses`

Stores verse of the day.

Expected fields:

```txt
id
verse_text
reference
language
date
created_at
```

---

### `devotions`

Stores short devotion content.

Expected fields:

```txt
id
title
content
verse_reference
related_song_id
date
created_at
```

---

### `notifications`

Stores in-app notifications.

Expected fields:

```txt
id
user_id
type
title
message
link
read_at
created_at
```

---

# Supabase RLS Requirements

If adding or updating tables, add safe RLS policies.

General rules:

1. Public songs/artists/albums can be readable by everyone if the app requires public browsing.
2. Users can only insert/update/delete their own library data.
3. Users can only manage their own playlists.
4. Users can only modify playlist songs inside their own playlists.
5. Users can only view private prayer requests they own.
6. Public prayer requests should only show approved requests.
7. Anonymous prayer requests must not expose user identity in public UI.
8. Users can only delete their own prayer requests.
9. Users can only mark their own notifications as read.
10. Do not create unsafe public write policies.

If the project uses server actions or API routes with service role keys, keep service role keys server-only.

Never expose Supabase service role key to the browser.

---

# UI/UX Direction

Improve the user side with a premium, peaceful Christian music feel.

## Design Feel

```txt
Peaceful
Modern
Premium
Spiritual
Trustworthy
Mobile-first
Tamil Christian identity
```

## UI Guidelines

- Use clean spacing.
- Use rounded cards.
- Use strong typography hierarchy.
- Use album art meaningfully.
- Use smooth but not excessive animations.
- Keep player controls clear.
- Avoid clutter.
- Avoid cheap-looking gradients.
- Avoid too many colors.
- Add skeleton loaders.
- Add graceful empty states.
- Add fallback images.
- Make primary actions obvious.

## Suggested Empty State Messages

For liked songs:

```txt
Your liked worship songs will appear here.
```

For playlists:

```txt
Create your first worship playlist.
```

For search:

```txt
Search for songs, artists, albums, or worship moods.
```

For prayer requests:

```txt
Share a prayer request or pray for someone today.
```

---

# Suggested Component Structure

Adapt to the existing project structure. Do not create these exact files if the project already has better equivalents.

## Player Components

```txt
components/player/AudioProvider.tsx
components/player/MiniPlayer.tsx
components/player/FullPlayer.tsx
components/player/PlayerControls.tsx
components/player/QueueDrawer.tsx
components/player/SeekBar.tsx
components/player/VolumeControl.tsx
components/player/MediaSessionUpdater.tsx
```

## Music Components

```txt
components/music/SongCard.tsx
components/music/AlbumCard.tsx
components/music/ArtistCard.tsx
components/music/PlaylistCard.tsx
components/music/SongList.tsx
components/music/PlayButton.tsx
components/music/ShareButton.tsx
```

## Library Components

```txt
components/library/LikeButton.tsx
components/library/SaveAlbumButton.tsx
components/library/FollowArtistButton.tsx
components/library/AddToPlaylistButton.tsx
components/library/CreatePlaylistDialog.tsx
components/library/LibraryEmptyState.tsx
```

## Home Components

```txt
components/home/HomeSection.tsx
components/home/ContinueListening.tsx
components/home/RecentlyPlayed.tsx
components/home/MoodPlaylists.tsx
components/home/FeaturedArtists.tsx
components/home/NewReleases.tsx
```

## Faith Components

```txt
components/faith/VerseOfTheDay.tsx
components/faith/DailyWorship.tsx
components/faith/DailyDevotion.tsx
components/faith/PrayerRequestForm.tsx
components/faith/PrayerRequestCard.tsx
components/faith/PrayerWall.tsx
```

## Layout Components

```txt
components/layout/MobileBottomNav.tsx
components/layout/AppShell.tsx
components/layout/PageHeader.tsx
components/layout/ResponsiveContainer.tsx
```

---

# Suggested Routes

Adapt these to the existing routing system.

```txt
/
/search
/library
/library/liked-songs
/library/playlists
/library/history
/song/[slug]
/artist/[slug]
/album/[slug]
/playlist/[slug]
/faith
/profile
/settings
```

If the current app already has similar routes, improve them instead of creating duplicate pages.

---

# Development Phases

Implement in this order.

---

## Phase 1 — Audit and Stability

Tasks:

- Create `MIRACLEFM_USER_SIDE_AUDIT.md`
- Understand existing player
- Understand existing Supabase schema
- Identify already-built features
- Fix obvious broken states
- Make sure the project builds before major edits if possible

Output:

- Audit file
- Short list of safest next changes

---

## Phase 2 — Player Upgrade

Tasks:

- Persistent player
- Mini player
- Full-screen player
- Queue
- Auto-next
- Shuffle/repeat
- Loading/error states
- Media Session API if safe

Output:

- Stable music playback experience

---

## Phase 3 — User Library

Tasks:

- Like/unlike songs
- Liked songs page
- Save albums
- Follow artists
- Create/manage playlists
- Recently played
- Continue listening

Output:

- Personal worship collection experience

---

## Phase 4 — Discovery and Search

Tasks:

- Improve home page sections
- Improve search
- Add category/mood browsing
- Add featured/new/popular sections where data supports it

Output:

- Users can discover music easily

---

## Phase 5 — Detail Pages and Sharing

Tasks:

- Song detail page
- Artist detail page
- Album detail page
- Playlist detail page
- Lyrics section
- Share buttons
- SEO metadata

Output:

- Public music pages that are useful and shareable

---

## Phase 6 — Faith Features

Tasks:

- Faith page
- Verse of the Day
- Daily worship song/playlist
- Daily devotion
- Prayer requests
- “I prayed” button
- Prayer moderation-ready structure

Output:

- MiracleFM becomes a Christian spiritual companion, not only a music app

---

## Phase 7 — Mobile/PWA Polish

Tasks:

- Bottom navigation
- Mobile player polish
- Safe-area spacing
- Manifest/PWA basics
- Offline fallback if safe
- Final responsive design pass

Output:

- Mobile-first experience ready for real users

---

# Implementation Quality Checklist

Before finishing, verify:

```txt
[ ] Project builds successfully
[ ] Lint passes or known issues are documented
[ ] No TypeScript errors introduced
[ ] No obvious console errors
[ ] Audio playback works
[ ] Player persists across navigation
[ ] Mini player works on mobile
[ ] Full player works on mobile
[ ] Like/save/follow actions work
[ ] Playlist actions work
[ ] Guest users are handled safely
[ ] Supabase RLS is safe
[ ] Loading states exist
[ ] Empty states exist
[ ] Error states exist
[ ] Broken images have fallback UI
[ ] Search works
[ ] Detail pages work
[ ] Sharing works or has fallback
[ ] Mobile layout is polished
[ ] Existing features are not removed
```

---

# Commands to Run

Check the package manager first. Use the correct commands for the project.

Common options:

```bash
npm install
npm run lint
npm run build
```

or:

```bash
pnpm install
pnpm lint
pnpm build
```

or:

```bash
yarn install
yarn lint
yarn build
```

Do not change the package manager unless necessary.

---

# Final Response Required from Codex

After completing the work, respond with this structure:

```md
# MiracleFM User-Side Improvement Summary

## ✅ Already Built / Found in Existing Codebase

## 🟡 Improved Features

## 🆕 New Features Added

## 📁 Files Changed

## 🗄️ Database / Migration Changes

## 🔐 RLS / Security Notes

## ⚠️ Configuration Needed

## 🧪 Checks Run

## 🚀 Recommended Next Step
```

Be specific. Mention exactly what files were changed and what still needs to be done.

---

# Most Important Reminder

The goal is not to add random features.

The goal is to make MiracleFM’s user side feel like a real Christian music streaming product with:

```txt
Stable player
Personal library
Discovery
Search
Lyrics
Faith section
Prayer features
Sharing
Mobile-first experience
```

Always improve what exists before creating something new.

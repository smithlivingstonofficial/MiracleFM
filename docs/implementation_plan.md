# Supabase Egress Bandwidth Reduction & Performance Optimization Plan

## Problem Statement & Root Cause Analysis

From the provided Supabase usage dashboard, **Miracle FM** consumed **1.226 GB of DB Egress bandwidth** out of the 5 GB free monthly limit with only **5 Monthly Active Users (MAU)**. 

### Why Database Egress is High (Despite 0 GB Storage Egress)
Audio files and images are served via external CDNs/R2, so Storage egress is 0 GB. The entire 1.226 GB bandwidth comes from **Database REST API (PostgREST) responses**.
Our audit revealed the key culprits causing this bandwidth waste:
1. **Personalized Suggestions & Per-User RPCs**:
   - `get_recommendation_sections`, `get_recommendation_tracks`, `get_personalized_mix`, and `getCachedPersonalHomeData(user.id)` query `play_events`, `tracks`, `playlists`, and `playlist_tracks` per request / per user.
   - Per-user queries cannot be cached globally across visitors. Every logged-in session forces fresh or frequent DB hits.
2. **Uncached Layout-Level Queries on Every Page Navigation**:
   - `(user)/layout.tsx` calls `getRightRailTracks` (fetching full track schemas for 12 items) and `banners` on **every single client route transition**.
3. **Over-Fetching with `select('*')`**:
   - Multiple queries select all columns (`select('*')`), including heavy fields (such as `lyrics`, full JSON metadata, and timestamps) even for simple card list views.
4. **Client-Side Refetching on Track Changes**:
   - `DesktopRightRail.tsx` triggers 3 separate Supabase queries (`tracks`, `track_engagement_stats`, related artist tracks) whenever `currentTrack` changes in the player.
   - `AudioPlayer.tsx` invokes recommendation RPCs to auto-fill queues when tracks end.
5. **Middleware Auth Network Overhead**:
   - `middleware.ts` invokes `supabase.auth.getUser()` on every request across all routes, making network calls even for unauthenticated guest requests.

---

## User Constraints & Preferences Addressed
- **Remove Personalized Suggestions**: Disable per-user recommendations and dynamic recommendation mixes for the current version to maximize database cost efficiency and speed.
- **Preserve Guest Audio Experience**: Guest users can stream and play any song, browse playlists, albums, artists, search, and faith content **without login**.
- **Maximum Bandwidth Reduction**: Transition home and layout surfaces to 100% globally cached public data (`unstable_cache`), dropping Supabase DB egress by ~90%+.

---

## Proposed Technical Changes

### 1. Remove Personalized Suggestions System

#### `[MODIFY]` [src/lib/recommendations.ts](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/lib/recommendations.ts)
- Replace dynamic recommendation RPC calls (`get_recommendation_tracks`, `get_personalized_mix`) with static public fallback helpers (`getPopularTracks`, `getTrendingTracks`).
- Deprecate per-user recommendation methods so no per-user SQL queries execute.

#### `[MODIFY]` [src/app/(user)/page.tsx](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/app/(user)/page.tsx)
- Remove `getCachedPersonalHomeData(user.id)` and `getCachedRecommendationPlaylists`.
- Remove `RecommendationMixSection` ("Made For You" shelf).
- Make Home page data completely public and uniform for all users (guests and signed-in alike).
- Wrap public home data retrieval in `unstable_cache` (`home-page-public-data`) with revalidation (3600s).

#### `[MODIFY]` [src/components/user/home/HomeHeroMosaic.tsx](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/components/user/home/HomeHeroMosaic.tsx)
- Update hero mosaic to display featured public playlists, popular albums, and trending tracks instead of personal daily mixes.

#### `[MODIFY]` [src/app/(user)/layout.tsx](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/app/(user)/layout.tsx)
- Replace per-user `getRightRailTracks(supabase, user?.id)` with a globally cached public right rail track list (`getCachedPublicRightRailTracks`) using `unstable_cache`.
- Cache `banners` query globally with `unstable_cache`.

#### `[MODIFY]` [src/components/player/AudioPlayer.tsx](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/components/player/AudioPlayer.tsx)
- Update queue auto-fill logic to use already loaded track store items or globally cached popular tracks instead of querying `get_recommendation_tracks` RPC.

#### `[MODIFY]` [src/components/user/DesktopRightRail.tsx](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/components/user/DesktopRightRail.tsx)
- Remove the `useEffect` that fires 3 Supabase client queries (`tracks`, `track_engagement_stats`, related tracks) every time `currentTrack` changes.
- Reuse `currentTrack` data from `usePlayerStore` and initial props.

---

### 2. Standardize Projection Queries (Eliminate `select('*')`)

#### `[MODIFY]` [src/lib/server-cache.ts](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/lib/server-cache.ts) & [src/app/(user)/search/page.tsx](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/app/(user)/search/page.tsx)
- Replace `select('*')` in list and search queries with a lightweight select projection:
  `"id, title, artist_id, album_id, cover_url, hls_url, fallback_audio_url, duration, duration_seconds, artists(id, name), albums(id, title)"`.
- Exclude `lyrics` from general search/list queries (only fetch `lyrics` on the dedicated `/song/[id]` detail page).

---

### 3. Optimize Middleware Network Requests

#### `[MODIFY]` [src/middleware.ts](file:///c:/Users/smith/Desktop/ElLabs/miracle-fm/src/middleware.ts)
- Check for Supabase session auth cookies (`sb-*-auth-token`) before calling `supabase.auth.getUser()` on public routes (`/`, `/search`, `/faith`, `/song/*`, `/album/*`, `/artist/*`).
- Bypass auth API network roundtrips for unauthenticated guest requests.

---

## User Review Required

> [!IMPORTANT]
> **Key Impact of Changes:**
> 1. **"Made For You" / Personalized Mixes shelf removed**: Home page will now display static/curated public sections ("Miracle FM Playlists", "New Releases / Albums", "Popular Artists", "Trending Songs", "New Songs").
> 2. **Guest Listening**: Guest listening (unauthenticated users playing audio) is 100% preserved and will now load faster due to global server caching.
> 3. **Estimated Bandwidth Savings**: Supabase DB egress bandwidth is projected to drop from ~1.2 GB per 5 MAU down to < 50 MB per month, staying well within the 5 GB free tier limit.

---

## Open Questions

> [!NOTE]
> 1. Are there any specific static playlists or genres you would like featured at the top of the Home page in place of the "Made For You" section?
> 2. Would you like us to keep `/mix/[slug]` routes as a simple redirect to `/library` or display curated public collections?

---

## Verification Plan

### Automated & Static Verification
- Run `npm run build` to verify there are no TypeScript errors, missing exports, or broken references.

### Manual Verification (Guest & Authenticated User Flow)
1. **Guest Playback Test**:
   - Open browser in Incognito mode (no session cookies).
   - Navigate to Home page -> verify fast load with zero personal recommendations.
   - Click play on any song, album, or playlist -> verify streaming works seamlessly without login prompts.
   - Test Search page, Faith page, Album page, Artist page.
2. **Bandwidth / Network Inspection**:
   - Inspect Chrome DevTools Network tab -> filter by Supabase URL domain (`.supabase.co`).
   - Navigate across 5 different pages -> verify layout no longer triggers repeated `banners`, `get_personalized_mix`, or `track_engagement_stats` API calls on every route transition.

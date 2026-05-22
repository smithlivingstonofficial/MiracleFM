export const HOME_SESSION_CACHE_PREFIX = "miraclefm:home-session";

export function homeSessionCacheKey(userId: string | null | undefined, key: string) {
  return `${HOME_SESSION_CACHE_PREFIX}:${userId || "guest"}:${key}`;
}

export function clearHomeSessionCache() {
  if (typeof window === "undefined") return;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(HOME_SESSION_CACHE_PREFIX)) {
      window.sessionStorage.removeItem(key);
    }
  }
}

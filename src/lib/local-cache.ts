const memoryCache = new Map<string, unknown>();

export function readLocalCache<T>(key: string): T | null {
  return (memoryCache.get(key) as T | undefined) ?? null;
}

export function writeLocalCache<T>(key: string, value: T) {
  memoryCache.set(key, value);
}

export function deleteLocalCache(key: string) {
  memoryCache.delete(key);
}

export function deleteLocalCacheByPrefix(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export function getMediaBaseUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
      ""
  );
}

export function buildMediaUrl(key: string) {
  const baseUrl = getMediaBaseUrl();
  const cleanKey = trimSlashes(key);
  return baseUrl ? `${baseUrl}/${cleanKey}` : `/${cleanKey}`;
}

export function getMediaKeyFromUrl(url: string | null) {
  if (!url) return null;

  try {
    if (!url.startsWith("http")) return trimSlashes(url);

    const parsed = new URL(url);
    const knownBases = [
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    ]
      .filter(Boolean)
      .map((value) => new URL(value as string).host);

    if (knownBases.includes(parsed.host) || parsed.host.endsWith(".r2.dev")) {
      return decodeURIComponent(trimSlashes(parsed.pathname));
    }

    return null;
  } catch {
    return null;
  }
}

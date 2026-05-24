export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://miraclefm.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "Miracle FM";

export const SITE_DESCRIPTION =
  "Listen to Tamil Christian songs, worship music, albums, and artists on Miracle FM.";

export const DEFAULT_IMAGE = "/miraclefm.jpg";

export const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};

export const compactObject = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")
  ) as T;

export const secondsToIsoDuration = (seconds?: number | null) => {
  if (!seconds) return undefined;
  const rounded = Math.round(seconds > 10_000 ? seconds / 1000 : seconds);
  if (rounded <= 0) return undefined;
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${remainingSeconds ? `${remainingSeconds}S` : ""}`;
};

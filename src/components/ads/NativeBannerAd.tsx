import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { pickWeightedCustomAd } from "@/lib/custom-ads";
import { cn } from "@/lib/utils";
import type { CustomAd, CustomAdImageRatio } from "@/types/custom-ad";

type NativeBannerAdProps = {
  ad?: CustomAd | null;
  ads?: CustomAd[];
  index?: number;
  variant?: "home" | "row";
  className?: string;
};

function pickAd(ad?: CustomAd | null, ads?: CustomAd[], index = 0) {
  if (ad) return ad;
  const available = (ads || []).filter((item) => item.image_url);
  if (available.length === 0) return null;
  return pickWeightedCustomAd(available, index) || available[Math.abs(index) % available.length];
}

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

const rowImageClass: Record<CustomAdImageRatio, string> = {
  "16:9": "h-16 w-28 md:h-20 md:w-36",
  "4:3": "h-16 w-24 md:h-20 md:w-32",
  "1:1": "h-16 w-16 md:h-20 md:w-20",
  "3:4": "h-20 w-16 md:h-24 md:w-20",
};

export default function NativeBannerAd({ ad, ads, index = 0, variant = "home", className }: NativeBannerAdProps) {
  const selected = pickAd(ad, ads, index);
  if (!selected?.image_url) return null;

  const href = selected.target_link?.trim();
  const ctaLabel = selected.cta_label?.trim() || "Learn More";
  const imageRatio = selected.image_ratio || "16:9";
  const isRow = variant === "row";
  const content = (
    <article
      className={cn(
        "group relative overflow-hidden border text-white shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors",
        isRow
          ? "flex min-h-[92px] items-center gap-3 rounded-2xl border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-2.5 hover:border-[#FF0055]/25 md:min-h-[104px] md:gap-4 md:p-3"
          : "mx-auto grid max-w-6xl grid-cols-1 gap-4 rounded-[1.75rem] border-white/10 bg-white/[0.035] p-3 hover:border-white/20 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] md:gap-6 md:p-4",
        className
      )}
      aria-label="Sponsored"
    >
      {isRow && <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-[#FF0055]/[0.06] blur-3xl" />}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-white/10 bg-zinc-900 shadow-lg",
          isRow ? cn("rounded-xl", rowImageClass[imageRatio]) : "aspect-[16/7] w-full rounded-2xl md:aspect-[16/8]"
        )}
      >
        <Image
          src={selected.image_url}
          alt={selected.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes={isRow ? "128px" : "(min-width: 768px) 45vw, 100vw"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      </div>

      <div className={cn("relative z-10 min-w-0", isRow ? "flex-1" : "flex flex-col justify-center px-1 md:px-2")}>
        <div className={cn("flex items-center gap-2", isRow ? "mb-1.5" : "mb-2")}>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 font-black uppercase tracking-[0.2em] text-[#FF0055]", isRow ? "px-2 py-0.5 text-[8px]" : "px-2.5 py-1 text-[9px]")}>
            <Sparkles size={10} />
            Sponsored
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <h3 className={cn("line-clamp-2 font-black leading-tight tracking-tight text-white", isRow ? "text-[15px] md:text-base" : "text-2xl md:text-4xl")}>
          {selected.title}
        </h3>
        {selected.description && (
          <p className={cn("mt-1 line-clamp-2 font-medium text-zinc-400", isRow ? "text-[11px] leading-snug md:text-xs" : "text-sm md:text-base")}>
            {selected.description}
          </p>
        )}
        {href && isRow && (
          <span className="mt-1.5 inline-flex w-fit items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#FF0055] md:text-[10px]">
            {ctaLabel} <ExternalLink size={10} />
          </span>
        )}
        {href && !isRow && (
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#FF0055] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(255,0,85,0.28)]">
            {ctaLabel} <ExternalLink size={13} />
          </span>
        )}
      </div>
    </article>
  );

  if (!href) return content;

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer sponsored" className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

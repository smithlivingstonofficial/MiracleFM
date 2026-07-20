import Image from "next/image";
import Link from "next/link";

export default function HomeFooter() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-[radial-gradient(circle_at_top,#1a0b10_0%,#050505_42%,#030303_100%)] px-4 pb-44 pt-10 text-sm text-zinc-400 md:mt-14 md:px-8 md:pb-36 md:pt-14">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="grid gap-8 p-6 text-center md:grid-cols-[1.2fr_1fr] md:p-8 md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_24px_rgba(255,0,85,0.25)]">
                <Image src="/miraclefm-192.png" alt="Miracle FM" fill className="object-cover" sizes="48px" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">Miracle FM</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FF0055]">Tamil Worship</p>
              </div>
            </div>
            <p className="max-w-md text-sm font-medium leading-6 text-zinc-500">
              Tamil Christian audio streaming for daily worship, prayer, devotion, and peaceful listening.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center md:items-end">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-600">Explore</p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-end">
              {[
                ["Faith", "/faith"],
                ["Search", "/search"],
                ["Library", "/library"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-white/10 px-4 py-2 font-bold text-zinc-300 transition-colors hover:border-[#FF0055]/40 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-6 md:px-8">
          <div className="mb-5 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm md:justify-start">
            {["Privacy Policy", "Terms", "Disclaimer", "Copyright"].map((link) => (
              <Link
                key={link}
                href={`/${link.toLowerCase().replace(" ", "-")}`}
                className="font-medium transition-all duration-300 hover:text-[#FF0055]"
              >
                {link}
              </Link>
            ))}
          </div>
          <p className="text-center text-xs font-medium text-zinc-600 md:text-left">
            &copy; {new Date().getFullYear()} Miracle FM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

export default function HomeFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-gradient-to-b from-black to-[#0a0a0a] py-10 text-sm text-gray-400">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h3 className="text-white text-lg font-semibold tracking-wide mb-2">
          Miracle FM
        </h3>
        <p className="text-gray-500 mb-6">
          Tamil Christian Audio Streaming Platform
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-6">
          {["Privacy Policy", "Terms", "Disclaimer", "Copyright"].map((link) => (
            <Link key={link} href={`/${link.toLowerCase().replace(" ", "-")}`} className="transition-all duration-300 hover:text-[#FF0055] hover:drop-shadow-[0_0_6px_#FF0055]">
              {link}
            </Link>
          ))}
        </div>

        <div className="h-px w-full bg-white/10 mb-6"></div>

        <p className="text-gray-500">
          © {new Date().getFullYear()} Miracle FM. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
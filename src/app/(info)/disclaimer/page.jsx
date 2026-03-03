export const metadata = {
  title: "Disclaimer | Miracle FM",
};

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Disclaimer
          </h1>
          <p className="text-gray-500">
            Last Updated: March 3, 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-lg space-y-6">

          <p className="text-gray-300 leading-relaxed">
            Miracle FM is a Tamil Christian audio streaming platform created
            for devotional, inspirational, and informational purposes only.
            The content provided on this website is intended for personal,
            non-commercial listening.
          </p>

          <p className="text-gray-300 leading-relaxed">
            All songs, audio tracks, artist names, album artwork, and related
            media are the property of their respective copyright owners.
            Miracle FM does not claim ownership of any third-party content
            unless explicitly stated.
          </p>

          <p className="text-gray-300 leading-relaxed">
            We strive to respect intellectual property rights and make
            reasonable efforts to ensure that content is shared responsibly.
            If any material has been used unintentionally or without proper
            authorization, we are committed to addressing the issue promptly.
          </p>

          <h2 className="text-xl font-semibold text-white mt-6">
            External Links & Advertisements
          </h2>

          <p className="text-gray-300 leading-relaxed">
            Miracle FM may display third-party advertisements or contain
            links to external websites. We are not responsible for the
            content, privacy policies, or practices of any third-party
            websites or services.
          </p>

          {/* Contact Box */}
          <div className="bg-black border border-white/10 rounded-xl p-6 text-center mt-6">
            <p className="text-gray-400 mb-2">
              For content concerns or removal requests, please contact:
            </p>
            <a
              href="mailto:miraclefmofficial@gmail.com"
              className="text-[#FF0055] font-medium hover:underline"
            >
              miraclefmofficial@gmail.com
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
export const metadata = {
  title: "Copyright Policy | Miracle FM",
};

export default function Copyright() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Copyright Policy
          </h1>
          <p className="text-gray-500">
            Last Updated: March 3, 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-lg space-y-6">

          <p className="text-gray-300 leading-relaxed">
            Miracle FM is a Tamil Christian audio streaming platform created
            for devotional and non-commercial listening purposes. We respect
            the intellectual property rights of artists, music producers,
            ministries, and content owners.
          </p>

          <p className="text-gray-300 leading-relaxed">
            We do not intentionally host or distribute copyrighted material
            without proper authorization. If any content on our platform has
            been uploaded or made available in error, we are committed to
            resolving the issue promptly.
          </p>

          <h2 className="text-xl font-semibold text-white mt-6">
            Copyright Infringement Notice
          </h2>

          <p className="text-gray-300 leading-relaxed">
            If you believe that your copyrighted work has been used on
            Miracle FM without permission, please send a written request
            including the following details:
          </p>

          <ul className="space-y-3 text-gray-400">
            <li className="flex gap-3">
              <span className="text-[#FF0055]">•</span>
              Your full legal name and contact information
            </li>
            <li className="flex gap-3">
              <span className="text-[#FF0055]">•</span>
              Proof of ownership or authorization
            </li>
            <li className="flex gap-3">
              <span className="text-[#FF0055]">•</span>
              The direct URL(s) of the allegedly infringing content
            </li>
            <li className="flex gap-3">
              <span className="text-[#FF0055]">•</span>
              A statement confirming that the information provided is accurate
              and made in good faith
            </li>
          </ul>

          <p className="text-gray-300 leading-relaxed">
            Upon receiving a valid request, we will review the claim and,
            if necessary, remove or disable access to the content within
            a reasonable timeframe.
          </p>

          {/* Contact Box */}
          <div className="bg-black border border-white/10 rounded-xl p-6 text-center mt-6">
            <p className="text-gray-400 mb-2">
              Send copyright requests to:
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
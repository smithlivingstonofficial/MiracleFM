export const metadata = {
  title: "Terms & Conditions | Miracle FM",
};

export default function Terms() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Terms & Conditions
          </h1>
          <p className="text-gray-500">
            Last Updated: March 3, 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-lg space-y-8">

          <p className="text-gray-300 leading-relaxed">
            By accessing and using Miracle FM, you agree to comply with and
            be bound by the following Terms and Conditions.
          </p>

          {/* Section 1 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Use of Website
            </h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to use this website only for lawful purposes and in a
              manner that does not violate the rights of others or restrict
              their use and enjoyment of the platform.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Music Content
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Miracle FM streams Tamil Christian songs for devotional and
              non-commercial listening purposes. All songs, audio tracks,
              and related media remain the property of their respective
              copyright owners.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Advertisements
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may display third-party advertisements, including Google
              AdSense. Miracle FM is not responsible for the content,
              accuracy, or practices of third-party advertisers.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Limitation of Liability
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Miracle FM shall not be liable for any direct, indirect,
              incidental, or consequential damages arising from the use
              or inability to use this website.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Modifications
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to update or modify these Terms at any
              time without prior notice. Continued use of the website
              constitutes acceptance of any changes.
            </p>
          </div>

          {/* Contact Box */}
          <div className="bg-black border border-white/10 rounded-xl p-6 text-center mt-6">
            <p className="text-gray-400 mb-2">
              For questions regarding these Terms, please contact:
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
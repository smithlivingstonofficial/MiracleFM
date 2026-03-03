export const metadata = {
  title: "Privacy Policy | Miracle FM",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-gray-500">
            Last Updated: March 3, 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-lg space-y-8">

          <p className="text-gray-300 leading-relaxed">
            This Privacy Policy explains how Miracle FM collects, uses,
            and protects your information when you use our Tamil Christian
            music streaming platform.
          </p>

          {/* Section 1 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Information We Collect
            </h2>

            <p className="text-gray-300 leading-relaxed mb-4">
              We do not collect personal information unless you voluntarily
              create an account.
            </p>

            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Name and email address (only if login/account is used)</li>
              <li>User preferences such as liked songs and saved playlists</li>
              <li>Basic usage data (such as pages visited and device type)</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Purpose of Login Information
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Account information is used only to store user preferences such
              as liked songs and playlists. We do not sell, rent, or share your
              personal information with third parties.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Advertising & Cookies
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Miracle FM may display third-party advertisements. These
              advertising providers may use cookies and similar technologies
              to serve ads based on your visits to this and other websites.
              You may manage cookie preferences through your browser settings.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Data Security
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We take reasonable steps to protect your data. However, no
              method of transmission over the Internet is completely secure.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Children's Privacy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Miracle FM does not knowingly collect personal information from
              children under 13 years of age.
            </p>
          </div>

          {/* Contact Box */}
          <div className="bg-black border border-white/10 rounded-xl p-6 text-center mt-6">
            <p className="text-gray-400 mb-2">
              If you have any questions about this Privacy Policy, contact:
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
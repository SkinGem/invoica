import Link from 'next/link';

export default function PactDemo() {
  return (
    <section id="pact" className="py-28 bg-white dark:bg-gray-950 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-invoica-purple/10 text-invoica-purple border border-invoica-purple/30">
            PACT · Mandate verification
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-invoica-blue dark:text-white text-4xl md:text-5xl font-bold tracking-tight text-center mb-6 max-w-3xl mx-auto">
          Trust the spend, not just the agent
        </h2>

        {/* Subtext */}
        <p className="text-invoica-gray-700 dark:text-gray-300 text-lg text-center mb-12 max-w-2xl mx-auto">
          Every Invoica payment can be gated by a PACT mandate &mdash; cryptographic
          authorization with hard spend caps, expiry, and an audit trail back to
          the human principal. Watch the 40-second walkthrough.
        </p>

        {/* Video */}
        <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-invoica-blue/10 dark:ring-white/10 bg-black">
          <video
            controls
            playsInline
            preload="metadata"
            poster="/pact-invoica-demo-poster.jpg"
            className="w-full h-auto block"
          >
            <source src="/pact-invoica-demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Caption row */}
        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-invoica-purple text-sm font-semibold uppercase tracking-wider mb-2">
              Spend caps
            </p>
            <p className="text-invoica-gray-700 text-sm">
              Hard per-mandate USDC ceiling. Agent cannot exceed it, ever.
            </p>
          </div>
          <div className="text-center">
            <p className="text-invoica-purple text-sm font-semibold uppercase tracking-wider mb-2">
              Expiry &amp; nonce
            </p>
            <p className="text-invoica-gray-700 text-sm">
              Mandates expire. Replays rejected. Constant-time HMAC verification.
            </p>
          </div>
          <div className="text-center">
            <p className="text-invoica-purple text-sm font-semibold uppercase tracking-wider mb-2">
              Audit trail
            </p>
            <p className="text-invoica-gray-700 text-sm">
              Mandate hash bound to every settled invoice. Reproducible for 7 years.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-12">
          <Link
            href="https://docs.invoica.ai/concepts/pact"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-invoica-purple text-white font-medium hover:bg-invoica-purple/90 transition"
          >
            Read the PACT spec &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

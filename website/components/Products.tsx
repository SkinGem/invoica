export default function Products() {
  return (
    <section id="products" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-invoica-purple/5 border border-invoica-purple/15 mb-6">
            <span className="text-xs font-medium text-invoica-purple tracking-wide uppercase">Vertical products</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-invoica-blue mb-4 tracking-tight">
            Built on Invoica
          </h2>
          <p className="text-base md:text-lg text-invoica-gray-500 max-w-2xl mx-auto">
            Industry-specific products that wrap Invoica&apos;s mandate, settlement, and tax layers into a turn-key
            offering for a single vertical.
          </p>
        </div>

        {/* ClinPay feature card */}
        <a
          href="/clinpay"
          className="group block relative rounded-3xl border border-invoica-gray-200 hover:border-invoica-purple/40 bg-gradient-to-br from-white via-invoica-purple/[0.02] to-invoica-purple/[0.06] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-invoica-purple/10 hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-invoica-purple/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />

          <div className="relative grid md:grid-cols-5 gap-8 p-8 md:p-12">
            {/* Left: brand + description */}
            <div className="md:col-span-3">
              <div className="text-xs font-semibold text-invoica-purple uppercase tracking-wider mb-4">
                For research panels · Live
              </div>

              <h3 className="text-4xl md:text-5xl font-bold text-invoica-blue mb-4 tracking-tight">
                ClinPay
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-xs font-semibold text-green-700 uppercase tracking-wider align-middle">
                  Live
                </span>
              </h3>

              <p className="text-lg text-invoica-gray-600 mb-6 leading-relaxed">
                Audit-grade payouts for clinical-trial and market-research panels. Replace hundreds of
                fragmented payments with one consolidated, audit-ready record per study per period.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  'Cryptographic audit trail',
                  'Per-jurisdiction tax compliance',
                  'GDPR-clean panellist anonymity',
                  'SEPA Instant / USDC / Faster Payments',
                ].map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-invoica-purple mt-0.5">✓</span>
                    <span className="text-sm text-invoica-gray-500 leading-snug">{line}</span>
                  </div>
                ))}
              </div>

              <span className="inline-flex items-center text-sm font-semibold text-invoica-purple group-hover:underline">
                Learn more about ClinPay
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>

            {/* Right: built-on rail */}
            <div className="md:col-span-2 flex flex-col justify-center">
              <div className="rounded-2xl border border-invoica-gray-200 bg-white/70 backdrop-blur-sm p-6">
                <div className="text-xs font-semibold text-invoica-gray-500 uppercase tracking-wider mb-4">
                  Built on two regulated rails
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-invoica-purple/5 border border-invoica-purple/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-invoica-purple to-invoica-purple-light flex items-center justify-center text-white font-bold text-xs">I</div>
                    <div>
                      <div className="text-sm font-semibold text-invoica-blue">Invoica</div>
                      <div className="text-xs text-invoica-gray-500">Audit + mandate layer</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-invoica-gray-50 border border-invoica-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-invoica-blue flex items-center justify-center text-white font-bold text-xs">A</div>
                    <div>
                      <div className="text-sm font-semibold text-invoica-blue">AsterPay</div>
                      <div className="text-xs text-invoica-gray-500">MiCA-aligned EU rail</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-invoica-gray-200/60 text-xs text-invoica-gray-500">
                  Closed PoC live · Q3 2026 production
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'ClinPay — Audit-grade payouts for research panels | Invoica',
  description:
    'Replace hundreds of fragmented panellist payments with one consolidated, audit-ready record per study per period. Cryptographically signed. Tax-compliant. GDPR-clean. Built on Invoica + AsterPay.',
  keywords:
    'ClinPay, research panel payouts, clinical trial honoraria, HCP payments, panellist incentives, audit-grade payments, SEPA Instant, GDPR-compliant payouts, healthcare market research',
  openGraph: {
    title: 'ClinPay — Audit-grade payouts for research panels',
    description:
      'One consolidated record per study per period. Every payment cryptographically signed, tax-compliant, GDPR-clean.',
    url: 'https://invoica.ai/clinpay',
    siteName: 'Invoica',
    type: 'website',
  },
};

const TALLY_FORM_URL = 'https://tally.so/r/yPdPr8';

function CTAButton({ children = 'Request a demo' }: { children?: React.ReactNode }) {
  return (
    <a
      href={TALLY_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center px-8 py-4 text-sm font-semibold text-white bg-gradient-to-r from-invoica-purple to-invoica-purple-light rounded-full hover:shadow-xl hover:shadow-invoica-purple/30 transition-all duration-300 hover:-translate-y-0.5"
    >
      {children}
      <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </a>
  );
}

export default function ClinPayPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative pt-32 pb-20 bg-white overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-invoica-purple/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-invoica-purple-light/5 rounded-full blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(10,37,64,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(10,37,64,0.1) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
              }}
            />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-invoica-purple/5 border border-invoica-purple/15 mb-8">
              <div className="w-2 h-2 rounded-full bg-invoica-purple mr-3" />
              <span className="text-xs font-medium text-invoica-gray-500 tracking-wide uppercase">An Invoica product · Live with research orgs</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-invoica-blue leading-[1.1] mb-8 tracking-tight">
              Audit-grade payouts
              <br />
              <span className="bg-gradient-to-r from-invoica-purple to-invoica-purple-light bg-clip-text text-transparent">
                for research panels
              </span>
            </h1>

            <p className="text-lg md:text-xl text-invoica-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              One consolidated record per study, per period. Every payment cryptographically signed,
              tax-compliant, GDPR-clean.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <CTAButton />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-invoica-gray-400">
              <span>Built on</span>
              <a href="https://invoica.ai" className="font-semibold text-invoica-gray-600 hover:text-invoica-purple">Invoica</a>
              <span className="text-invoica-gray-200">+</span>
              <a href="https://asterpay.io" target="_blank" rel="noopener noreferrer" className="font-semibold text-invoica-gray-600 hover:text-invoica-purple">AsterPay</a>
              <span className="text-invoica-gray-200">•</span>
              <span>SEPA Instant · Faster Payments · USDC</span>
              <span className="text-invoica-gray-200">•</span>
              <span>EU / UK / US compliant</span>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="py-20 bg-invoica-gray-50/30">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-4 tracking-tight">
              Your CFO doesn&apos;t have a payment problem.
            </h2>
            <p className="text-2xl md:text-3xl font-semibold text-invoica-purple mb-10">
              They have an audit problem dressed as one.
            </p>

            <p className="text-base text-invoica-gray-500 mb-6 leading-relaxed">
              Most research organizations run finance ops like this:
            </p>

            <ul className="space-y-3 text-base text-invoica-gray-600">
              {[
                'Hundreds of small panellist payouts per study × dozens of active studies',
                'N small bank transfers reconciled against M payout obligations',
                'Audit asks "prove HCP-A was paid for visit B on date C" — manual lookup, hours',
                'Tax compliance scattered across jurisdictions (UK HMRC, EU VAT, US state)',
                'Cross-border wire fees + delays eat 5-8% on micro-payouts',
                "Panellist bank details touch your systems — GDPR exposure on every flow",
              ].map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-invoica-purple mt-1">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <p className="mt-10 text-lg text-invoica-blue font-medium leading-relaxed">
              You&apos;re not running a payment problem. You&apos;re running an audit and finance-ops problem
              dressed as a payment problem.
            </p>
          </div>
        </section>

        {/* WHAT CLINPAY DOES */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-4 tracking-tight text-center">
              One audit-ready record per study, per period.
            </h2>
            <p className="text-base md:text-lg text-invoica-gray-500 mb-12 text-center max-w-3xl mx-auto">
              ClinPay replaces hundreds of fragmented payments with a single consolidated record — and lifts
              tax compliance and panellist anonymity into the same flow.
            </p>

            <div className="overflow-hidden rounded-2xl border border-invoica-gray-200 mb-12">
              <table className="w-full text-sm md:text-base">
                <tbody>
                  {[
                    ['Your finance team interacts with', 'One provider, one contract'],
                    ['Each study produces', 'One mandate + one funded escrow'],
                    ['Each period produces', 'One reconciliation export + tax line per jurisdiction'],
                    ['Each payout produces', 'One cryptographic receipt, one audit-trace, one GDPR-clean bank wire'],
                  ].map(([k, v], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-invoica-gray-50/40' : 'bg-white'}>
                      <td className="px-6 py-4 font-medium text-invoica-gray-600 w-1/2 border-b border-invoica-gray-200/60">{k}</td>
                      <td className="px-6 py-4 text-invoica-blue font-semibold border-b border-invoica-gray-200/60">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  t: 'Consolidated reconciliation',
                  d: 'One rollup per period instead of hundreds of line items. CSV + PDF audit pack export.',
                },
                {
                  t: 'Cryptographic audit trail',
                  d: 'Prove who authorized what payment to whom, years later. No third party required.',
                },
                {
                  t: 'Tax compliance, jurisdiction-aware',
                  d: 'UK HMRC VAT, 27 EU countries, US state sales tax — each line with statute citation.',
                },
                {
                  t: 'GDPR-clean anonymity',
                  d: 'Panellist IBAN never touches your systems. Sponsor never sees panellist banking.',
                },
              ].map((it, i) => (
                <div key={i} className="p-6 rounded-2xl border border-invoica-gray-200 hover:border-invoica-purple/30 transition-colors">
                  <h3 className="text-lg font-semibold text-invoica-blue mb-2">{it.t}</h3>
                  <p className="text-sm text-invoica-gray-500 leading-relaxed">{it.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 bg-invoica-gray-50/30">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-12 tracking-tight text-center">
              Four-step lifecycle per study
            </h2>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  n: '1',
                  t: 'Set up',
                  d: 'Sponsor signs one mandate, funds one escrow. Done once per study.',
                },
                {
                  n: '2',
                  t: 'Integrate',
                  d: '10-line webhook from your panel platform. Each completion fires a payout.',
                },
                {
                  n: '3',
                  t: 'Settle',
                  d: 'SEPA Instant (EUR), Faster Payments (GBP), or USD rail. Sub-2 minutes typical.',
                },
                {
                  n: '4',
                  t: 'Audit',
                  d: 'Daily / weekly / monthly rollup with per-jurisdiction tax totals. CSV + PDF.',
                },
              ].map(s => (
                <div key={s.n} className="p-6 rounded-2xl bg-white border border-invoica-gray-200 relative">
                  <div className="text-3xl font-bold text-invoica-purple/30 mb-3">{s.n}</div>
                  <h3 className="text-base font-semibold text-invoica-blue mb-2">{s.t}</h3>
                  <p className="text-sm text-invoica-gray-500 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TWO REGULATED RAILS */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-12 tracking-tight text-center">
              Built on two regulated rails
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl border border-invoica-gray-200 bg-gradient-to-br from-white to-invoica-purple/5">
                <div className="text-xs font-semibold text-invoica-purple uppercase tracking-wider mb-3">Audit layer</div>
                <h3 className="text-2xl font-bold text-invoica-blue mb-3">Invoica</h3>
                <p className="text-sm text-invoica-gray-500 leading-relaxed mb-4">
                  Agent-native invoicing + tax compliance middleware. Every payout produces a cryptographically-signed mandate
                  hash and a Deal Receipt anchored on-chain. Audit-grade, regulator-defensible.
                </p>
                <a href="https://invoica.ai" className="text-sm font-semibold text-invoica-purple hover:underline">
                  invoica.ai →
                </a>
              </div>

              <div className="p-8 rounded-2xl border border-invoica-gray-200 bg-gradient-to-br from-white to-invoica-purple/5">
                <div className="text-xs font-semibold text-invoica-purple uppercase tracking-wider mb-3">Payment rail</div>
                <h3 className="text-2xl font-bold text-invoica-blue mb-3">AsterPay</h3>
                <p className="text-sm text-invoica-gray-500 leading-relaxed mb-4">
                  MiCA-aligned EU payment infrastructure. SEPA Instant, Faster Payments, USDC rails. EU regulated.
                  Panellist anonymity by design.
                </p>
                <a href="https://asterpay.io/clinpay" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-invoica-purple hover:underline">
                  asterpay.io →
                </a>
              </div>
            </div>

            <p className="text-center mt-10 text-lg text-invoica-blue font-semibold">Together: ClinPay.</p>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-20 bg-invoica-gray-50/30">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-4 tracking-tight text-center">
              Transparent pricing
            </h2>
            <p className="text-base md:text-lg text-invoica-gray-500 mb-12 text-center max-w-2xl mx-auto">
              ON-TOP model — sponsor pays the fee, panellist receives 100% of the honorarium. No surprises.
            </p>

            <div className="overflow-hidden rounded-2xl border border-invoica-gray-200 bg-white">
              <table className="w-full text-base">
                <thead className="bg-invoica-gray-50/60">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-invoica-blue">Currency / Rail</th>
                    <th className="px-6 py-4 text-center font-semibold text-invoica-blue">Rate</th>
                    <th className="px-6 py-4 text-center font-semibold text-invoica-blue">Floor</th>
                    <th className="px-6 py-4 text-center font-semibold text-invoica-blue">Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['EUR · SEPA Instant', '2%', '€0.55', '€5.00'],
                    ['USD · USDC + ACH', '2%', '$0.60', '$5.50'],
                    ['GBP · Faster Payments', '2%', '£0.50', '£4.50'],
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-invoica-gray-200/60">
                      {row.map((cell, j) => (
                        <td key={j} className={`px-6 py-4 ${j === 0 ? 'font-medium text-invoica-gray-600' : 'text-center font-mono text-invoica-blue'}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4 text-sm text-invoica-gray-500">
              <div className="p-4 rounded-xl bg-white border border-invoica-gray-200">
                <strong className="text-invoica-blue">Volume tier:</strong> at 50,000 payouts/month, wholesale settlement fee
                drops €0.05/payout — auto-applied, no renegotiation. Second tier at 200,000+.
              </div>
              <div className="p-4 rounded-xl bg-white border border-invoica-gray-200">
                <strong className="text-invoica-blue">Sub-€10 payouts</strong> batched daily per panellist (one wire per
                recipient per day) — industry-standard Cint / Prolific pattern.
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-12 tracking-tight text-center">
              Compliance built in
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                'UK HMRC native VAT engine, per-payout statute citation',
                '27 EU countries VAT — reverse-charge for B2B, standard for B2C',
                'US state sales tax — California, Texas, New York, Florida, Washington',
                'GDPR-clean panellist anonymity (IBAN isolation by design)',
                'MiCA-aligned payment processing via AsterPay',
                'PACT v0.3.2 cryptographic mandate signing',
                'Audit-pack export — CSV + PDF for end-client deliverables',
                'On-chain Deal Receipt anchoring (Base mainnet)',
              ].map((line, i) => (
                <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-invoica-gray-50/40 border border-invoica-gray-200/60">
                  <span className="text-green-600 font-bold mt-0.5">✓</span>
                  <span className="text-sm md:text-base text-invoica-gray-600">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="py-20 bg-invoica-gray-50/30">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-12 tracking-tight text-center">
              Already running real money
            </h2>

            <div className="rounded-2xl border border-invoica-gray-200 bg-white p-8 md:p-10">
              <div className="text-xs font-semibold text-invoica-purple uppercase tracking-wider mb-3">2026-05-15</div>
              <p className="text-lg md:text-xl text-invoica-blue font-medium leading-relaxed mb-4">
                Live €0.50 production cycle settled in real EUR to a real bank account in 90 seconds. Full
                PACT mandate + Deal Receipt + UK VAT line generated automatically.
              </p>
              <p className="text-sm text-invoica-gray-500">
                Closed PoC with one clinical research organization. Production launch targeted for Q3 2026.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue mb-4 tracking-tight">
              Ready to consolidate your panel payouts?
            </h2>
            <p className="text-base md:text-lg text-invoica-gray-500 mb-10 max-w-xl mx-auto">
              20-minute walkthrough. Bring your highest-volume study — we&apos;ll show you the audit pack it would have
              generated.
            </p>
            <CTAButton>Request a demo</CTAButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import React from 'react';

export default function PricingPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-4 dark:text-white">Plans &amp; Pricing</h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Invoica offers different pricing tiers depending on your profile type. Registered companies and Web3 projects each have plans tailored to their needs.
      </p>

      {/* Registered Company Plans */}
      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Registered Company Plans</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        For traditional businesses with tax, VAT, and compliance requirements.
      </p>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-left">
              <th className="py-3 px-2 dark:text-gray-300">Feature</th>
              <th className="py-3 px-2 dark:text-gray-300">Free</th>
              <th className="py-3 px-2 dark:text-gray-300">Pro — $49/mo</th>
              <th className="py-3 px-2 dark:text-gray-300">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Invoices / month', '100', 'Unlimited', 'Unlimited'],
              ['API calls / month', '1,000', '50,000', 'Unlimited'],
              ['x402 payment protocol', '✓', '✓', '✓'],
              ['Tax compliance', 'Basic', 'Advanced (12 countries)', 'Advanced + custom'],
              ['Company registry verification', '—', '✓', '✓'],
              ['Priority support', '—', '✓', '✓'],
              ['Dedicated account manager', '—', '—', '✓'],
              ['Custom SLA', '—', '—', '✓'],
              ['On-premise deployment', '—', '—', '✓'],
            ].map(([feature, free, pro, enterprise]) => (
              <tr key={feature} className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-2.5 px-2 text-gray-700 dark:text-gray-300">{feature}</td>
                <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{free}</td>
                <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{pro}</td>
                <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{enterprise}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Web3 Project Plans */}
      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Web3 Project Plans</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        For decentralized projects operating without country registration. No VAT, no tax — invoicing and on-chain ledger only.
      </p>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-left">
              <th className="py-3 px-2 dark:text-gray-300">Feature</th>
              <th className="py-3 px-2 dark:text-gray-300">Free</th>
              <th className="py-3 px-2 dark:text-gray-300">Growth — $24/mo</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Invoices / month', '100', '5,000'],
              ['API calls / month', '1,000', '25,000'],
              ['x402 payment protocol', '✓', '✓'],
              ['On-chain ledger', '✓', '✓'],
              ['Multi-chain settlement tracking', '—', '✓'],
              ['Webhook notifications', '—', '✓'],
              ['Priority support', '—', '✓'],
            ].map(([feature, free, growth]) => (
              <tr key={feature} className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-2.5 px-2 text-gray-700 dark:text-gray-300">{feature}</td>
                <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{free}</td>
                <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{growth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">FAQ</h2>
      <div className="space-y-4">
        {[
          {
            q: 'How do I upgrade my plan?',
            a: 'During onboarding, select your desired plan. You can also upgrade later from the Settings page via Stripe Checkout.',
          },
          {
            q: 'Can I switch between company and web3 plans?',
            a: 'Your plan type is determined by your profile type (registered company or web3 project) set during onboarding. Contact support to change your profile type.',
          },
          {
            q: 'What happens when I exceed my limits?',
            a: 'API calls beyond your monthly limit will receive a 429 (Too Many Requests) response. The SDK handles this automatically with retry logic. Upgrade your plan for higher limits.',
          },
          {
            q: 'Is there an Enterprise plan for Web3 projects?',
            a: 'Not yet. If you need higher limits for your Web3 project, contact us at sales@invoica.ai.',
          },
        ].map(({ q, a }) => (
          <div key={q}>
            <h3 className="text-base font-semibold mb-1 dark:text-white">{q}</h3>
            <p className="text-gray-600 dark:text-gray-400">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

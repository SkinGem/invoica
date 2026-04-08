'use client';

const chains = [
  {
    id: 'base',
    name: 'Base',
    token: 'USDC',
    speed: '~2s',
    status: 'Live',
    chainId: '8453',
    color: 'from-blue-600 to-blue-500',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" fill="#0052FF" />
        <circle cx="14" cy="14" r="6" fill="white" />
      </svg>
    ),
  },
  {
    id: 'polygon',
    name: 'Polygon',
    token: 'USDC',
    speed: '~2s',
    status: 'Live',
    chainId: '137',
    color: 'from-purple-600 to-purple-500',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" fill="#8247E5" />
        <path d="M18.5 10.5L14 8l-4.5 2.5v5L14 18l4.5-2.5v-5z" fill="white" />
      </svg>
    ),
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    token: 'USDC',
    speed: '~2s',
    status: 'Live',
    chainId: '42161',
    color: 'from-sky-500 to-sky-400',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" fill="#28A0F0" />
        <path d="M14 6L7 18h4l3-5 3 5h4L14 6z" fill="white" />
      </svg>
    ),
  },
  {
    id: 'solana',
    name: 'Solana',
    token: 'USDC (SPL)',
    speed: '~0.4s',
    status: 'Live',
    chainId: 'mainnet',
    color: 'from-violet-600 to-violet-500',
    badge: '✓ Mainnet verified 2026-03-21',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" fill="#9945FF" />
        <path d="M8 17.5h10l-2 2H8v-2zm0-4h12l-2 2H8v-2zm2-4h10l-2 2H10v-2z" fill="white" />
      </svg>
    ),
  },
];

export default function Chains() {
  return (
    <section id="chains" className="py-28 bg-[#fafafa] relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0A2540 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-invoica-purple" />
            <span className="mx-4 text-xs font-semibold text-invoica-purple uppercase tracking-widest">Multi-Chain</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-invoica-purple" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-invoica-blue mb-4 tracking-tight">
            Pay and settle across every major network
          </h2>
          <p className="text-lg text-invoica-gray-500 max-w-xl mx-auto leading-relaxed">
            One API. Four chains. USDC everywhere.
          </p>
        </div>

        {/* Chain cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {chains.map((chain) => (
            <div
              key={chain.id}
              className="group relative bg-white rounded-2xl border border-invoica-gray-100 hover:border-invoica-purple/20 hover:shadow-xl hover:shadow-invoica-purple/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden p-6"
            >
              {/* Chain logo */}
              <div className="mb-4">{chain.icon}</div>

              {/* Name + status */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-invoica-blue">{chain.name}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {chain.status}
                </span>
              </div>

              {/* Details */}
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-invoica-gray-400">Token</dt>
                  <dd className="font-medium text-invoica-blue">{chain.token}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-invoica-gray-400">Settlement</dt>
                  <dd className="font-medium text-invoica-blue">{chain.speed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-invoica-gray-400">Network</dt>
                  <dd className="font-medium text-invoica-blue">Mainnet</dd>
                </div>
              </dl>

              {/* Optional verification badge */}
              {chain.badge && (
                <div className="mt-4 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-semibold">
                  {chain.badge}
                </div>
              )}

              {/* Hover gradient accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${chain.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <p className="text-center text-sm text-invoica-gray-400">
          More chains on request —{' '}
          <a href="mailto:team@invoica.ai" className="text-invoica-purple hover:underline font-medium">
            contact us
          </a>
        </p>
      </div>
    </section>
  );
}

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Supported chains — Invoica',
  description:
    'Invoica settles agent payments on Base, Polygon, Arbitrum, SKALE Base, and Solana. Multi-chain by default — every invoice carries its chain context and settles natively.',
  keywords:
    'multi-chain payments, x402 chains, base, polygon, arbitrum, skale, solana, USDC settlement, agent payments',
  openGraph: {
    title: 'Supported chains — Invoica',
    description: 'Invoica settles agent payments on every major chain. Multi-chain by default.',
    url: 'https://invoica.ai/supported-chains',
    siteName: 'Invoica',
    type: 'website',
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   Featured chain spotlight.
   When a new chain ships, swap these 4 fields + drop the new video file
   to /public/videos/featured-chain-launch{,-square}.mp4. The previous
   featured chain stays in the grid below at status="live".
───────────────────────────────────────────────────────────────────────── */
const FEATURED = {
  chain: 'SKALE',
  network: 'SKALE Base',
  launchedAt: '2026-05-22',
  headline: 'Gasless USDC settlement, instant finality',
  blurb:
    "SKALE Base is Invoica's newest settlement rail. Zero gas fees, sub-second finality, " +
    "and EVM compatibility — agents pay for compute without burning USDC on transaction costs.",
  highlights: [
    { label: '0', sub: 'Gas fees' },
    { label: '< 1s', sub: 'Settlement time' },
    { label: '100%', sub: 'Agent-authorized' },
  ],
};

interface Chain {
  id: string;
  name: string;
  type: 'evm' | 'solana';
  status: 'live' | 'beta';
  chainIdLabel: string;
  usdcAddress: string;
  explorer: string;
  faucet?: string;
  description: string;
}

const CHAINS: Chain[] = [
  {
    id: 'base',
    name: 'Base',
    type: 'evm',
    status: 'live',
    chainIdLabel: '8453',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorer: 'https://basescan.org',
    description: "Coinbase's L2 — Invoica's default chain for production agent payments. Battle-tested USDC liquidity, second-on Base ecosystem.",
  },
  {
    id: 'skale',
    name: 'SKALE Base',
    type: 'evm',
    status: 'live',
    chainIdLabel: '1187947933',
    usdcAddress: '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20',
    explorer: 'https://skale-base-explorer.skalenodes.com',
    description: 'Gasless EVM rail running on SKALE Base — agents transact in USDC with no transaction costs. Sub-second finality, full Base ecosystem compatibility.',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    type: 'evm',
    status: 'live',
    chainIdLabel: '137',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    explorer: 'https://polygonscan.com',
    description: 'High-throughput EVM L2 with deep USDC liquidity. Useful for cross-chain agent flows that originate or terminate in the Polygon ecosystem.',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    type: 'evm',
    status: 'live',
    chainIdLabel: '42161',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    explorer: 'https://arbiscan.io',
    description: "Arbitrum's optimistic rollup. Lowest fees among Ethereum L2s for high-frequency agent micropayments.",
  },
  {
    id: 'solana',
    name: 'Solana',
    type: 'solana',
    status: 'live',
    chainIdLabel: 'mainnet-beta',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    explorer: 'https://solscan.io',
    description: 'Native Solana via PayAI x402 facilitator. SPL Token transfers with memo-based invoice references, settled in 400ms slots.',
  },
];

function StatusBadge({ status }: { status: Chain['status'] }) {
  const color = status === 'live' ? 'bg-green-500/10 text-green-700 dark:text-green-400 ring-green-500/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ring-1 ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'live' ? 'bg-green-500' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

function ChainCard({ chain, featured }: { chain: Chain; featured?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl border bg-white dark:bg-gray-900 transition-all hover:-translate-y-0.5 ${featured ? 'border-invoica-purple/40 dark:border-invoica-purple/30 shadow-lg shadow-invoica-purple/10' : 'border-invoica-gray-200 dark:border-gray-800 hover:border-invoica-purple/30 dark:hover:border-invoica-purple/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-bold text-invoica-blue dark:text-white tracking-tight">{chain.name}</h3>
          <div className="text-xs font-mono text-invoica-gray-500 dark:text-gray-400 mt-1">
            {chain.type === 'evm' ? `Chain ID ${chain.chainIdLabel}` : `Network: ${chain.chainIdLabel}`}
          </div>
        </div>
        <StatusBadge status={chain.status} />
      </div>
      <p className="text-sm text-invoica-gray-500 dark:text-gray-400 leading-relaxed mb-4">{chain.description}</p>
      <div className="space-y-2 text-xs font-mono">
        <div>
          <span className="text-invoica-gray-400 dark:text-gray-500">USDC:</span>{' '}
          <span className="text-invoica-gray-600 dark:text-gray-300 break-all">{chain.usdcAddress}</span>
        </div>
        <div>
          <span className="text-invoica-gray-400 dark:text-gray-500">Explorer:</span>{' '}
          <a href={chain.explorer} target="_blank" rel="noopener noreferrer" className="text-invoica-purple hover:underline break-all">{chain.explorer.replace(/^https?:\/\//, '')}</a>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-invoica-gray-200/60 dark:border-gray-800">
        <div className="text-[10px] font-semibold text-invoica-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Use it</div>
        <pre className="text-[11px] font-mono text-invoica-blue dark:text-gray-200 bg-invoica-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto"><code>{`POST /v1/invoices
{
  "amount": 0.10,
  "currency": "USDC",
  "chain": "${chain.id}",
  ...
}`}</code></pre>
      </div>
    </div>
  );
}

export default function SupportedChainsPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative pt-32 pb-16 bg-white dark:bg-gray-950 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-invoica-purple/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-invoica-purple-light/5 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-invoica-purple/5 border border-invoica-purple/15 mb-6">
              <span className="text-xs font-medium text-invoica-purple tracking-wide uppercase">Multi-chain by default</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-invoica-blue dark:text-white leading-[1.1] mb-6 tracking-tight">
              Supported chains
            </h1>
            <p className="text-lg md:text-xl text-invoica-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Invoica settles agent payments on every major chain. Every invoice carries its chain context;
              settlement happens natively on the rail of your choice.
            </p>
          </div>
        </section>

        {/* FEATURED: LATEST CHAIN VIDEO */}
        <section className="py-16 bg-invoica-gray-50/30 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-invoica-purple text-white text-[10px] font-semibold uppercase tracking-wider">
                Newest support
              </span>
              <span className="text-sm text-invoica-gray-500">
                Launched {FEATURED.launchedAt}
              </span>
            </div>
            <div className="grid md:grid-cols-5 gap-8 items-start">
              {/* Video — left 3/5 */}
              <div className="md:col-span-3">
                <div className="rounded-2xl overflow-hidden border border-invoica-gray-200 dark:border-gray-700 bg-black aspect-video">
                  <video
                    src="/videos/featured-chain-launch.mp4"
                    poster=""
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain bg-black"
                  />
                </div>
              </div>

              {/* Description — right 2/5 */}
              <div className="md:col-span-2 flex flex-col gap-5">
                <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue dark:text-white tracking-tight leading-tight">
                  Invoica on <span className="text-invoica-purple">{FEATURED.chain}</span>
                </h2>
                <p className="text-lg font-medium text-invoica-blue dark:text-gray-200">{FEATURED.headline}</p>
                <p className="text-base text-invoica-gray-500 dark:text-gray-400 leading-relaxed">{FEATURED.blurb}</p>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {FEATURED.highlights.map((h, i) => (
                    <div key={i}>
                      <div className="text-2xl md:text-3xl font-bold text-invoica-blue dark:text-white tracking-tight">{h.label}</div>
                      <div className="text-xs text-invoica-gray-500 dark:text-gray-400 mt-1">{h.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ALL CHAINS GRID */}
        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue dark:text-white tracking-tight mb-3">
              All supported chains
            </h2>
            <p className="text-base text-invoica-gray-500 dark:text-gray-400 mb-12 max-w-2xl">
              Every chain below is live in production. Pick a chain by passing its identifier in the <code className="px-1.5 py-0.5 text-sm bg-invoica-gray-100 dark:bg-gray-800 rounded font-mono text-invoica-blue dark:text-gray-200">chain</code> field on invoice creation.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {CHAINS.map(c => (
                <ChainCard key={c.id} chain={c} featured={c.name === FEATURED.network} />
              ))}
            </div>
          </div>
        </section>

        {/* HOW TO SPECIFY */}
        <section className="py-20 bg-invoica-gray-50/30 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue dark:text-white tracking-tight mb-3">
              How to specify a chain
            </h2>
            <p className="text-base text-invoica-gray-500 dark:text-gray-400 mb-8">
              The <code className="px-1.5 py-0.5 text-sm bg-white dark:bg-gray-800 border border-invoica-gray-200 dark:border-gray-700 rounded font-mono text-invoica-blue dark:text-gray-200">chain</code> field at top level of the invoice body
              determines which rail handles settlement. The response back fills in <code className="px-1.5 py-0.5 text-sm bg-white dark:bg-gray-800 border border-invoica-gray-200 dark:border-gray-700 rounded font-mono text-invoica-blue dark:text-gray-200">paymentAddress</code> and <code className="px-1.5 py-0.5 text-sm bg-white dark:bg-gray-800 border border-invoica-gray-200 dark:border-gray-700 rounded font-mono text-invoica-blue dark:text-gray-200">usdcAddress</code> so the caller knows where to send funds.
            </p>
            <pre className="text-sm font-mono text-white bg-invoica-blue rounded-2xl p-6 overflow-x-auto"><code>{`curl -sX POST https://api.invoica.ai/v1/invoices \\
  -H "x-api-key: $INVOICA_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "amount": 0.10,
    "currency": "USDC",
    "customerEmail": "agent@example.com",
    "customerName": "agent-x402",
    "chain": "skale"
  }'`}</code></pre>
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-invoica-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-invoica-purple uppercase tracking-wider mb-2">Auto-populated</div>
                <p className="text-sm text-invoica-gray-600 dark:text-gray-300 leading-relaxed">
                  Response includes <code className="text-xs font-mono">paymentDetails.paymentAddress</code> (the Invoica seller wallet on that chain) and <code className="text-xs font-mono">paymentDetails.usdcAddress</code> (the canonical USDC contract). No separate lookup needed.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-invoica-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-invoica-purple uppercase tracking-wider mb-2">Auto-settled</div>
                <p className="text-sm text-invoica-gray-600 dark:text-gray-300 leading-relaxed">
                  The settlement watcher polls each chain for incoming USDC transfers and flips invoice status to <code className="text-xs font-mono">SETTLED</code> automatically — typical detection in 15-30 seconds. No manual PATCH needed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-invoica-blue dark:text-white mb-4 tracking-tight">
              Want a chain we don&apos;t support yet?
            </h2>
            <p className="text-base md:text-lg text-invoica-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
              We add chains based on real customer pull. Tell us your use case and we&apos;ll prioritize.
            </p>
            <a
              href="mailto:support@invoica.ai?subject=Chain%20support%20request"
              className="group inline-flex items-center px-8 py-4 text-sm font-semibold text-white bg-gradient-to-r from-invoica-purple to-invoica-purple-light rounded-full hover:shadow-xl hover:shadow-invoica-purple/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Request a chain
              <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

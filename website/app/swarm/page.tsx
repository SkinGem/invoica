import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SwarmFeed from '@/components/SwarmFeed';

export const metadata = {
  title: 'Invoica swarm — live activity',
  description: 'Watch the Invoica autonomous swarm at work. Live feed of supervisor-reviewed task runs.',
};

export const dynamic = 'force-dynamic';

export default function SwarmPage() {
  return (
    <div className="min-h-screen bg-invoica-blue text-white">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-invoica-purple-light mb-4">
            Live · Swarm Activity
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4">
            Watch the swarm at work.
          </h1>
          <p className="text-invoica-gray-400 text-lg leading-relaxed max-w-2xl mb-12">
            Invoica is built by an autonomous swarm of agents that ship code, fix bugs, and review each other.
            Below is a live feed of what the swarm just did — coarse-grained for privacy, real-time enough to watch.
          </p>

          <SwarmFeed />

          {/* The "tease" — Invoica composes on open agent protocols */}
          <section className="mt-24 pt-12 border-t border-white/10">
            <p className="text-xs uppercase tracking-[0.2em] text-invoica-gray-500 mb-4">
              Open Specs The Swarm Builds On
            </p>
            <p className="text-invoica-gray-300 leading-relaxed max-w-2xl mb-6">
              The Invoica swarm composes on a family of open agent protocols.
              The shipping ones are public; the rest are in active development.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { name: 'PACT',   note: 'signed mandates · live' },
                { name: 'BOND',   note: 'recurring delegation · live' },
                { name: 'SCORE',  note: 'agent reputation · live' },
                { name: 'LAX',    note: 'agent discovery · live' },
                { name: 'AMF',    note: 'memory format · live' },
                { name: 'SIGNAL', note: 'event bus · live' },
                { name: 'DRS',    note: 'on-chain receipts · live' },
                { name: 'SOUL',   note: 'constitutional id · live' },
              ].map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono ring-1 ring-invoica-purple/30 bg-invoica-purple/5 text-invoica-purple-light"
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-invoica-gray-500">·</span>
                  <span className="text-invoica-gray-400">{p.note}</span>
                </span>
              ))}
            </div>
            <p className="text-sm text-invoica-gray-400">
              All under{' '}
              <a
                href="https://www.npmjs.com/org/godman-protocols"
                className="text-invoica-purple-light hover:text-white transition-colors underline decoration-invoica-purple/50 underline-offset-4"
              >
                @godman-protocols
              </a>{' '}
              on npm · Apache-2.0 · spec sources at{' '}
              <a
                href="https://github.com/Godman-s"
                className="text-invoica-purple-light hover:text-white transition-colors underline decoration-invoica-purple/50 underline-offset-4"
              >
                github.com/Godman-s
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

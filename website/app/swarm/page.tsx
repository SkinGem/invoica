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
        </div>
      </main>
      <Footer />
    </div>
  );
}

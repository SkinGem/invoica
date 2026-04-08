'use client';

import { useState, useEffect } from 'react';

const CHAINS = [
  { id: 'base',     name: 'Base',     latest: '0x7f4a...1bc9 · 0.01 USDC' },
  { id: 'polygon',  name: 'Polygon',  latest: '0x3e2d...7fa1 · 0.05 USDC' },
  { id: 'arbitrum', name: 'Arbitrum', latest: '0x9c1b...4e3a · 0.02 USDC' },
  { id: 'solana',   name: 'SOL',      latest: '5wNfi...q2WY · 0.01 USDC' },
];

const FLOW = [
  { dir: 'right', label: 'GET /api/inference' },
  { dir: 'left',  label: '402 · 0.01 USDC required' },
  { dir: 'right', label: '[pays on-chain]' },
  { dir: 'left',  label: '200 OK ✅' },
];

export default function Hero() {
  const [chainIdx, setChainIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => {
        const next = (s + 1) % 4;
        if (next === 0) {
          setCount(c => c + 1);
          setChainIdx(i => (i + 1) % CHAINS.length);
        }
        return next;
      });
    }, 900);
    return () => clearInterval(timer);
  }, []);

  const chain = CHAINS[chainIdx];

  return (
    <section className="relative pt-32 pb-24 overflow-hidden bg-white min-h-[90vh] flex items-center">
      {/* Subtle background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-invoica-purple/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-invoica-purple-light/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(10,37,64,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(10,37,64,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left content */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-invoica-purple/5 border border-invoica-purple/15 mb-8">
              <div className="w-2 h-2 rounded-full bg-invoica-purple animate-glow mr-3" />
              <span className="text-xs font-medium text-invoica-gray-500 tracking-wide uppercase">Now in Public Beta</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-invoica-blue leading-[1.1] mb-8 tracking-tight">
              The Financial OS
              <br />
              <span className="bg-gradient-to-r from-invoica-purple to-invoica-purple-light bg-clip-text text-transparent">
                for AI Agents
              </span>
            </h1>

            <p className="text-lg md:text-xl text-invoica-gray-500 mb-10 max-w-lg leading-relaxed">
              Your agents can now pay, invoice, and settle autonomously. Built on x402 — the open protocol for agent payments.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://app.invoica.ai/api-keys?utm_source=hn&utm_medium=post&utm_campaign=beta2026"
                className="group inline-flex items-center px-8 py-4 text-sm font-semibold text-white bg-gradient-to-r from-invoica-purple to-invoica-purple-light rounded-full hover:shadow-xl hover:shadow-invoica-purple/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                Claim Free Beta Access →
              </a>

              <a
                href="https://invoica.mintlify.app/quickstart"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center px-8 py-4 text-sm font-semibold text-invoica-gray-600 bg-white border border-invoica-gray-200 rounded-full hover:border-invoica-purple/30 hover:text-invoica-purple transition-all duration-300 hover:-translate-y-0.5"
              >
                View Quickstart
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-invoica-gray-400">
              <span>Built on x402</span>
              <span className="text-invoica-gray-200">•</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Settlements live on
              </span>
              <span className="font-semibold text-invoica-gray-600">Base · Polygon · Arbitrum · Solana</span>
            </div>
          </div>

          {/* Right content — x402 Live Payment Flow Widget */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Glow behind widget */}
              <div className="absolute -inset-4 bg-gradient-to-r from-invoica-purple/20 to-invoica-purple-light/20 rounded-3xl blur-2xl opacity-30" />

              {/* Widget shell */}
              <div className="relative bg-[#0f0f1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#635BFF]/25 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">⚡</span>
                    <span className="text-white text-xs font-semibold tracking-wide font-mono">x402 Live</span>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  </div>
                  <span className="text-green-400 text-xs font-mono">{count} settlements/min</span>
                </div>

                {/* Flow diagram */}
                <div className="px-5 py-6 font-mono">
                  <div className="flex items-start justify-between gap-3 mb-5">

                    {/* AgentA */}
                    <div className="flex flex-col items-center gap-1 min-w-[72px]">
                      <span className="text-2xl">🤖</span>
                      <span className="text-white/80 text-[11px] font-semibold">AgentA</span>
                      <span className="text-white/40 text-[10px]">(payer)</span>
                    </div>

                    {/* Animated steps */}
                    <div className="flex-1 flex flex-col gap-1.5 pt-1">
                      {FLOW.map((f, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all duration-400 ${
                            step === i
                              ? 'bg-white/12 opacity-100'
                              : step > i
                              ? 'opacity-35'
                              : 'opacity-15'
                          }`}
                        >
                          {f.dir === 'right' ? (
                            <>
                              <span className="text-[10px] text-white/70 flex-1 truncate">{f.label}</span>
                              <span className={`text-sm transition-colors ${step === i ? 'text-[#635BFF]' : 'text-white/30'}`}>→</span>
                            </>
                          ) : (
                            <>
                              <span className={`text-sm transition-colors ${step === i ? (i === 3 ? 'text-green-400' : 'text-amber-400') : 'text-white/30'}`}>←</span>
                              <span className="text-[10px] text-white/70 flex-1 truncate">{f.label}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* AgentB */}
                    <div className="flex flex-col items-center gap-1 min-w-[72px]">
                      <span className="text-2xl">🤖</span>
                      <span className="text-white/80 text-[11px] font-semibold">AgentB</span>
                      <span className="text-white/40 text-[10px]">(seller)</span>
                    </div>
                  </div>

                  {/* Invoice settled row */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                    step === 3
                      ? 'bg-green-500/15 border-green-500/30 opacity-100'
                      : 'bg-white/5 border-white/10 opacity-30'
                  }`}>
                    <span className="text-base">📄</span>
                    <span className="text-green-400 text-[11px]">Invoice created · Settled on-chain</span>
                  </div>
                </div>

                {/* Chain selector + latest tx */}
                <div className="px-5 py-3.5 border-t border-white/10 bg-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                    {CHAINS.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setChainIdx(i)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-300 ${
                          chainIdx === i
                            ? 'bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/30'
                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-white/30">Latest:</span>
                    <span className="text-white/65">{chain.latest}</span>
                    <span className="ml-auto text-green-400">✅ confirmed</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

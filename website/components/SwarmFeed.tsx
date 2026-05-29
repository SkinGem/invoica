'use client';

import { useEffect, useState, useCallback } from 'react';

interface SwarmEvent {
  id: string;
  sprint_week: number;
  task_id: string;
  agent_role: string;
  task_type: string;
  task_category: string | null;
  verdict: string;
  score: number | null;
  tokens: number | null;
  duration_s: number | null;
  model: string | null;
  provider: string | null;
  started_at: string;
  ended_at: string;
  created_at: string;
}

const SUPABASE_URL = 'https://igspopoejhsxvwvxyhbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc3BvcG9lamhzeHZ3dnh5aGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODQzNTksImV4cCI6MjA4NzA2MDM1OX0.a0P9MHW7fXD2LfjHq-fSs_pLsefUpNAivDn7qbM91v8';
const REFRESH_MS = 8000;

function VerdictPill({ verdict }: { verdict: string }) {
  const v = verdict.toUpperCase();
  const map: Record<string, string> = {
    APPROVED:  'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    DONE:      'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    REJECTED:  'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    PENDING:   'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    SKIPPED:   'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  };
  const cls = map[v] || 'bg-slate-500/15 text-slate-300 ring-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${cls}`}>
      {v.toLowerCase()}
    </span>
  );
}

function AgentBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-invoica-purple-light bg-invoica-purple/10 ring-1 ring-invoica-purple/30">
      {role}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(11, 19) + 'Z';
  } catch {
    return iso.slice(11, 19);
  }
}

function formatAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function SwarmFeed() {
  const [events, setEvents] = useState<SwarmEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/swarm_events?select=*&order=created_at.desc&limit=20`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          cache: 'no-store',
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SwarmEvent[];
      setEvents(json);
      setError(null);
      setLastFetched(Date.now());
    } catch (e: any) {
      setError(e?.message || 'unknown');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (events === null && !error) {
    return (
      <div className="text-invoica-gray-500 text-sm">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-300 text-sm">Feed temporarily unavailable. Retrying…</div>
    );
  }

  if (events && events.length === 0) {
    return (
      <div className="text-invoica-gray-500 text-sm">
        Waiting for first sprint event… The swarm publishes activity after each task review.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-xs text-invoica-gray-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span>
          Live · refreshing every {Math.round(REFRESH_MS / 1000)}s
          {lastFetched > 0 ? ` · last update ${formatAgo(new Date(lastFetched).toISOString())}` : ''}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[110px_160px_120px_110px_70px_70px] gap-0 px-4 py-3 text-[11px] uppercase tracking-wider text-invoica-gray-500 bg-white/[0.02] border-b border-white/10">
          <div>Time (UTC)</div>
          <div>Agent</div>
          <div>Category</div>
          <div>Verdict</div>
          <div className="text-right">Score</div>
          <div className="text-right">Duration</div>
        </div>
        <ul className="divide-y divide-white/5">
          {events!.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[110px_160px_120px_110px_70px_70px] gap-0 items-center px-4 py-3 text-sm hover:bg-white/[0.02] transition-colors"
            >
              <div className="font-mono text-xs text-invoica-gray-400 tabular-nums">{formatTime(e.created_at)}</div>
              <div><AgentBadge role={e.agent_role} /></div>
              <div className="text-invoica-gray-400 text-xs">{e.task_category || '—'}</div>
              <div><VerdictPill verdict={e.verdict} /></div>
              <div className="font-mono text-xs text-invoica-gray-300 text-right tabular-nums">
                {e.score !== null ? Number(e.score).toFixed(0) : '—'}
              </div>
              <div className="font-mono text-xs text-invoica-gray-300 text-right tabular-nums">
                {e.duration_s !== null ? `${Math.round(Number(e.duration_s))}s` : '—'}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-xs text-invoica-gray-500 leading-relaxed max-w-2xl">
        Each row is one task reviewed by the Invoica autonomous swarm — agent group, category, supervisor verdict, score, and duration.
        No task content, file paths, or customer identifiers are ever published here. The full task lifecycle stays inside Invoica's private logs.
      </p>
    </div>
  );
}

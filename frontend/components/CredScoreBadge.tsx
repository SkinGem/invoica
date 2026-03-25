'use client';

import { Badge } from '@/components/Badge';

interface CredScoreBadgeProps {
  score: number | null;
  tier: string | null;
}

const tierColors: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export function CredScoreBadge({ score, tier }: CredScoreBadgeProps) {
  if (score === null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400">—</span>
        <span className="text-sm text-gray-500">Score unavailable</span>
      </div>
    );
  }

  const tierColor = tier ? tierColors[tier.toLowerCase()] ?? '#6B7280' : '#6B7280';
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : 'Unknown';

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      <Badge
        style={{ backgroundColor: tierColor }}
        className="text-white font-medium px-3 py-1"
      >
        {tierLabel}
      </Badge>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">Helixa CredScore</span>
      </div>
    </div>
  );
}
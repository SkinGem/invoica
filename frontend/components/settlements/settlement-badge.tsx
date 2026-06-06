import React from 'react';

interface SettlementBadgeProps {
  status: string;
  txHash?: string | null;
  chain?: string;
  confirmedAt?: string | null;
}

export function SettlementBadge({ status, txHash, chain, confirmedAt }: SettlementBadgeProps) {
  const statusLower = status.toLowerCase();
  const isConfirmed = statusLower === 'confirmed';
  const isPending = statusLower === 'pending';
  const bgColor = isConfirmed
    ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
    : isPending
    ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {status}
      </span>
      {txHash && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {txHash.slice(0, 6)}...{txHash.slice(-4)}
        </span>
      )}
      {confirmedAt && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(confirmedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

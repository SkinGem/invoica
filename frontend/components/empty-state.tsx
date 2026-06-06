'use client';

import React from 'react';

export function EmptyState({ title, description, message, actionLabel, onAction }: { title?: string; description?: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="text-center px-6 py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title || message || "No data"}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

'use client';

import React from 'react';

export interface KeyValueItem {
  label: string;
  value: string | React.ReactNode;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  className?: string;
}

export function KeyValueList({ items, className = '' }: KeyValueListProps) {
  return (
    <dl className={`divide-y divide-slate-100 dark:divide-gray-800 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between py-3">
          <dt className="text-sm font-medium text-slate-500 dark:text-gray-400">{item.label}</dt>
          <dd className="text-sm text-slate-900 dark:text-gray-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
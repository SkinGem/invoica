'use client';

import React from 'react';
import { Invoice } from '@/types';

export interface InvoiceDetailProps {
  invoice: Invoice | null;
  isLoading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400',
  processing: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400',
  completed: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
  settled: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
  paid: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
  failed: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400',
  overdue: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400',
  cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not yet';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function InvoiceDetail({ invoice, isLoading }: InvoiceDetailProps): JSX.Element {
  if (isLoading) {
    return <div className="p-4 dark:text-gray-300">Loading invoice details...</div>;
  }

  if (!invoice) {
    return <div className="p-4 dark:text-gray-400">Invoice not found</div>;
  }

  const statusColor = STATUS_COLORS[invoice.status.toLowerCase()] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  const displayNumber = invoice.number || invoice.invoiceNumber;
  const metadata = invoice.metadata || {};

  return (
    <div className="rounded-lg border border-slate-200 dark:border-gray-700 dark:bg-gray-900 p-6 space-y-4">
      <h2 className="font-bold text-xl dark:text-white">{displayNumber}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-slate-500 dark:text-gray-400 text-sm">Amount</span>
          <p className="font-medium dark:text-white">{formatCurrency(invoice.amount, invoice.currency)}</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-gray-400 text-sm">Status</span>
          <p>
            <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${statusColor}`}>
              {invoice.status}
            </span>
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-gray-400 text-sm">Created</span>
          <p className="font-medium dark:text-white">{formatDate(invoice.createdAt)}</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-gray-400 text-sm">Paid</span>
          <p className="font-medium dark:text-white">{formatDate(invoice.paidAt)}</p>
        </div>
      </div>
      {Object.keys(metadata).length > 0 && (
        <div>
          <span className="text-slate-500 dark:text-gray-400 text-sm">Metadata</span>
          <pre className="mt-1 bg-slate-50 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto dark:text-gray-200">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

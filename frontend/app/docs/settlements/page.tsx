import React from 'react';

export default function SettlementsApiPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-4 dark:text-white">Settlements API</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Settlements track the on-chain payment status of invoices.
      </p>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Get Settlement</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-2">Method: <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">GET /v1/settlements/:id</code></p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-8 text-sm dark:text-gray-200">
{`{
  "id": "stl_abc",
  "invoiceId": "inv_123",
  "status": "completed",
  "txHash": "0xabc...",
  "chain": "base",
  "amount": 1000,
  "currency": "USD",
  "confirmedAt": "2026-02-15T10:05:00Z"
}`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">List Settlements</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-2">Method: <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">GET /v1/settlements?limit=10&offset=0</code></p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-8 text-sm dark:text-gray-200">
{`{
  "settlements": [...],
  "total": 15,
  "limit": 10,
  "offset": 0
}`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Settlement Statuses</h2>
      <ul className="space-y-2 text-gray-600 dark:text-gray-400">
        <li><code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">pending</code> — Waiting for transaction to be submitted.</li>
        <li><code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">processing</code> — Transaction submitted, awaiting confirmation.</li>
        <li><code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">completed</code> — Confirmed on-chain successfully.</li>
        <li><code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">failed</code> — Transaction reverted or failed.</li>
      </ul>
    </div>
  );
}

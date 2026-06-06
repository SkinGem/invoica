import React from 'react';

const events = [
  { name: 'invoice.created', description: 'New invoice generated' },
  { name: 'invoice.paid', description: 'Payment received' },
  { name: 'invoice.settled', description: 'Settlement completed' },
  { name: 'invoice.failed', description: 'Invoice payment failed' },
  { name: 'settlement.confirmed', description: 'On-chain confirmation' },
  { name: 'settlement.failed', description: 'Settlement failed' },
];

export default function WebhooksPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Webhooks</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Receive real-time event notifications when important actions occur in your Countable account.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Supported Events</h2>
        <div>
          {events.map((event) => (
            <div key={event.name} className="flex items-center gap-3 py-2 border-b dark:border-gray-800">
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                {event.name}
              </span>
              <span className="text-gray-600 dark:text-gray-400">{event.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Signature Verification</h2>
        <p className="text-gray-600 dark:text-gray-400">
          All webhook payloads include an HMAC-SHA256 signature in the X-Countable-Signature header.
          Verify this signature to ensure the request originated from Countable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Retry Policy</h2>
        <p className="text-gray-600 dark:text-gray-400">
          If a webhook delivery fails, we retry with exponential backoff up to a maximum of 3 retries.
        </p>
      </section>
    </div>
  );
}

export default function WebhookEventsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Webhook Events</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Receive real-time notifications when events occur in your account via webhooks.
        Webhooks allow your application to stay synchronized with events as they happen.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Available Events</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-8">
        <li>invoice.created</li>
        <li>invoice.paid</li>
        <li>invoice.expired</li>
        <li>settlement.completed</li>
        <li>settlement.failed</li>
        <li>api_key.created</li>
        <li>api_key.revoked</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Event Payload</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-8">
{`{
  "id": "evt_abc123",
  "type": "invoice.paid",
  "createdAt": "2026-01-15T10:30:00Z",
  "data": {
    "invoiceId": "inv_xyz",
    "amount": 1000,
    "currency": "USD"
  }
}`}
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Verifying Signatures</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-8">
{`import { verifyWebhookSignature } from '@invoica/sdk';
const isValid = verifyWebhookSignature(payload, signature, secret);`}
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Retry Policy</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Failed deliveries are retried 3 times with exponential backoff (1min, 5min, 30min).
        After 3 failures the webhook is disabled.
      </p>
    </div>
  );
}

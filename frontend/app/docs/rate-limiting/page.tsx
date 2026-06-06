import React from 'react';

export default function RateLimitingPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-4 dark:text-white">Rate Limiting</h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Our API enforces rate limits to ensure fair usage and maintain service stability. The SDK automatically handles rate limiting, so you can focus on building your application.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">How It Works</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The SDK reads the <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">x-ratelimit-limit</code>, <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">x-ratelimit-remaining</code>, and <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">x-ratelimit-reset</code> headers from every response to track your rate limit status.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Automatic Retry</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        When you receive a 429 status (rate limited), the SDK automatically waits and retries the request.
      </p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>const invoices = await client.listInvoices(); // SDK waits if rate limited</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Manual Rate Limit Checking</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`import { RateLimitTracker } from '@invoica/sdk';
const tracker = new RateLimitTracker();
tracker.update(responseHeaders);
if (tracker.shouldWait()) { await tracker.waitIfNeeded(); }`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Default Limits</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
        <li>100 requests per minute per API key</li>
        <li>1000 requests per hour per API key</li>
        <li>Rate limit headers included in every response</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Monthly Limits by Plan</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        In addition to per-minute rate limits, each plan has monthly API call and invoice quotas.
      </p>

      <h3 className="text-lg font-semibold mb-3 dark:text-white">Registered Company Plans</h3>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
        <li><strong className="dark:text-gray-300">Free:</strong> 100 invoices/month, 1,000 API calls/month</li>
        <li><strong className="dark:text-gray-300">Pro ($49/mo):</strong> Unlimited invoices, 50,000 API calls/month</li>
        <li><strong className="dark:text-gray-300">Enterprise:</strong> Unlimited invoices, unlimited API calls</li>
      </ul>

      <h3 className="text-lg font-semibold mb-3 dark:text-white">Web3 Project Plans</h3>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
        <li><strong className="dark:text-gray-300">Free:</strong> 100 invoices/month, 1,000 API calls/month</li>
        <li><strong className="dark:text-gray-300">Growth ($24/mo):</strong> 5,000 invoices/month, 25,000 API calls/month</li>
      </ul>

      <p className="text-gray-600 dark:text-gray-400">
        See <a href="/docs/pricing" className="text-[#635BFF] hover:underline">Plans &amp; Pricing</a> for full details.
      </p>
    </div>
  );
}

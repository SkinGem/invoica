export default function RetryPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Retry Configuration</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">The Countable SDK automatically retries failed requests with exponential backoff for transient errors.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Retryable Status Codes</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-8">
        <li>408 Request Timeout</li>
        <li>429 Too Many Requests</li>
        <li>500 Internal Server Error</li>
        <li>502 Bad Gateway</li>
        <li>503 Service Unavailable</li>
        <li>504 Gateway Timeout</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Configuration</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-8">
        <code>{`const client = new CountableClient({ apiKey: 'inv_live_...', maxRetries: 5, timeout: 30000 });`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Backoff Strategy</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">The SDK uses exponential backoff with jitter to prevent thundering herd. Formula: delay = min(baseDelay * 2^attempt + random_jitter, maxDelay)</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Disabling Retries</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200">
        <code>{`const client = new CountableClient({ apiKey: 'inv_live_...', maxRetries: 0 });`}</code>
      </pre>
    </div>
  );
}

export default function ErrorHandlingPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Error Handling</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The SDK provides structured error responses to help you handle failures gracefully
        and take appropriate action based on the error type.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Error Types</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-8">
        <li><strong className="dark:text-gray-300">InvoicaError</strong> — Base error class</li>
        <li><strong className="dark:text-gray-300">ValidationError</strong> — Invalid input (400)</li>
        <li><strong className="dark:text-gray-300">AuthenticationError</strong> — Invalid credentials (401)</li>
        <li><strong className="dark:text-gray-300">NotFoundError</strong> — Resource not found (404)</li>
        <li><strong className="dark:text-gray-300">RateLimitError</strong> — Too many requests (429)</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Catching Errors</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-8">
{`try {
  const invoice = await client.createInvoice({...});
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.code, err.message);
  } else if (err instanceof RateLimitError) {
    console.log('Retry after', err.retryAfter, 'seconds');
  }
}`}
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Error Response Format</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-8">
{`{
  success: false,
  error: {
    message: 'Invoice not found',
    code: 'NOT_FOUND',
    details: null
  }
}`}
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Best Practices</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
        <li>Always catch InvoicaError as the base class</li>
        <li>Check specific error types for targeted handling</li>
        <li>Use retryAfter from RateLimitError for backoff</li>
      </ul>
    </div>
  );
}

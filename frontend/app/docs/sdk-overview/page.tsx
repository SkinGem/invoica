export default function SdkOverviewPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">SDK Overview</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        The Invoica TypeScript SDK provides a powerful and type-safe way to integrate
        with our platform. Built for modern development workflows, it offers comprehensive
        support for invoice management, agent tracking, and more.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Supported Languages</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border dark:border-gray-800 rounded-lg p-4 dark:bg-gray-900">
            <h3 className="font-medium dark:text-white">TypeScript</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
          </div>
          <div className="border dark:border-gray-800 rounded-lg p-4 dark:bg-gray-900">
            <h3 className="font-medium dark:text-white">Python</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Coming Soon</p>
          </div>
          <div className="border dark:border-gray-800 rounded-lg p-4 dark:bg-gray-900">
            <h3 className="font-medium dark:text-white">Go</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Planned</p>
          </div>
          <div className="border dark:border-gray-800 rounded-lg p-4 dark:bg-gray-900">
            <h3 className="font-medium dark:text-white">Rust</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Planned</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Key Features</h2>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400">
          <li>Type-safe API client</li>
          <li>Automatic retry with exponential backoff</li>
          <li>Rate limiting built-in</li>
          <li>Webhook signature verification</li>
          <li>Comprehensive error handling</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Requirements</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Node.js 18+ and TypeScript 5+ required for using the Invoica SDK.
        </p>
      </section>
    </div>
  );
}

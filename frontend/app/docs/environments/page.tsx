export default function EnvironmentsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-4 dark:text-white">Environments</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The SDK automatically detects your runtime environment and configures defaults accordingly.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Supported Environments</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
        <li>Node.js (server-side)</li>
        <li>Browser (client-side)</li>
        <li>Edge Runtime (Vercel/Cloudflare Workers)</li>
        <li>Deno</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Auto-Detection</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`import { detectEnvironment, getDefaultBaseUrl } from '@invoica/sdk';
const env = detectEnvironment();
console.log(env); // 'node' | 'browser' | 'edge' | 'deno'`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Custom Configuration</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`const client = new CountableClient({
  apiKey: 'inv_...',
  baseUrl: 'https://api.staging.invoica.ai/v1',
  timeout: 30000
});`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Environment Variables</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
        <li><strong className="dark:text-gray-300">INVOICA_API_KEY</strong> — API key (auto-detected in Node.js)</li>
        <li><strong className="dark:text-gray-300">INVOICA_BASE_URL</strong> — Override base URL</li>
        <li><strong className="dark:text-gray-300">INVOICA_DEBUG</strong> — Enable debug logging</li>
      </ul>
    </div>
  );
}

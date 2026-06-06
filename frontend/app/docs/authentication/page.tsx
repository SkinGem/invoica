import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Invoica API Docs',
  description: 'Learn how to authenticate with the Invoica API',
};

export default function AuthenticationPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Authentication</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        All API requests require a valid API key passed in the Authorization header.
      </p>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">API Key Format</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Keys start with &apos;inv_&apos; followed by 32 hex characters.
      </p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-8">
        <code className="text-sm font-mono dark:text-gray-200">inv_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6</code>
      </pre>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Using Your API Key</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Include your API key in the Authorization header:
      </p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-8">
        <code className="text-sm font-mono dark:text-gray-200">curl -H &apos;Authorization: Bearer inv_your_key_here&apos; https://api.invoica.dev/v1/invoices</code>
      </pre>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">SDK Authentication</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-8">
        <code className="text-sm font-mono dark:text-gray-200">{`import { InvoicaClient } from '@invoica/sdk';

const client = new InvoicaClient({
  apiKey: 'inv_your_key_here',
  baseUrl: 'https://api.invoica.dev',
});`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Request Signing</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Requests can be signed with HMAC-SHA256 for additional security.
      </p>
    </div>
  );
}

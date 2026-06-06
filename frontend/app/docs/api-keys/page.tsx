export default function ApiKeysPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">API Key Management</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Manage your API keys programmatically using the client SDK.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Create an API Key</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>const response = await client.apiKeys.createApiKey(&apos;my-key&apos;);</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">List API Keys</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>const keys = await client.apiKeys.listApiKeys();</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Revoke an API Key</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>await client.apiKeys.revokeApiKey(keyId);</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Key Prefixes</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Production keys start with <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">inv_live_</code> while sandbox keys use <code className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 rounded">inv_test_</code>.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Security Best Practices</h2>
      <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
        <li>Rotate keys regularly</li>
        <li>Use test keys for development</li>
        <li>Never expose keys in client-side code</li>
        <li>Store keys in environment variables</li>
      </ul>
    </div>
  );
}

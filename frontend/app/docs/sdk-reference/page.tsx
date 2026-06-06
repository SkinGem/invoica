export default function SdkReferencePage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-4 dark:text-white">SDK Reference</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        The Invoica TypeScript SDK provides typed methods for all API endpoints.
      </p>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Installation</h2>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-8 overflow-x-auto">
        <code>npm install @invoica/sdk</code>
      </pre>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Client Methods</h2>
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-800">
            <th className="border dark:border-gray-700 p-3 text-left dark:text-gray-300">Method</th>
            <th className="border dark:border-gray-700 p-3 text-left dark:text-gray-300">Parameters</th>
            <th className="border dark:border-gray-700 p-3 text-left dark:text-gray-300">Returns</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['createInvoice(params)', 'CreateInvoiceParams', 'Promise<Invoice>'],
            ['getInvoice(id)', 'string', 'Promise<Invoice>'],
            ['listInvoices(params?)', '{limit?, offset?, status?}', 'Promise<InvoiceListResponse>'],
            ['getSettlement(id)', 'string', 'Promise<Settlement>'],
            ['listSettlements(params?)', '{limit?, offset?}', 'Promise<SettlementListResponse>'],
            ['createApiKey(name)', 'string', 'Promise<ApiKeyCreateResponse>'],
            ['revokeApiKey(id)', 'string', 'Promise<void>'],
            ['listApiKeys()', '—', 'Promise<ApiKey[]>'],
            ['registerWebhook(config)', 'WebhookRegistrationConfig', 'Promise<WebhookRegistration>'],
            ['listWebhooks()', '—', 'Promise<WebhookListResponse>'],
            ['deleteWebhook(id)', 'string', 'Promise<void>'],
          ].map(([method, params, returns]) => (
            <tr key={method}>
              <td className="border dark:border-gray-700 p-3 dark:text-gray-300">{method}</td>
              <td className="border dark:border-gray-700 p-3 dark:text-gray-300">{params}</td>
              <td className="border dark:border-gray-700 p-3 dark:text-gray-300">{returns}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-2xl font-semibold mb-4 dark:text-white">Error Handling</h2>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code>{`try {
  const invoice = await client.createInvoice(params);
} catch (error) {
  if (error instanceof InvoicaError) {
    console.error(error.code, error.message);
  }
}`}</code>
      </pre>
    </div>
  );
}

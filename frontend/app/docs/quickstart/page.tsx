export default function QuickstartPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-4 dark:text-white">Quickstart</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Get up and running with the Invoica SDK in under 5 minutes.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Installation</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>npm install @invoica/sdk</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Initialize the Client</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`import { CountableClient } from '@invoica/sdk';

const client = new CountableClient({ apiKey: 'inv_test_...' });`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Create Your First Invoice</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`const invoice = await client.createInvoice({
  amount: 1000,
  currency: 'USD',
  recipientAddress: '0x1234...',
  description: 'Payment'
});
console.log(invoice.id);`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">List Invoices</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`const { invoices } = await client.listInvoices({ limit: 10 });`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Next Steps</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
        <li>Set up webhooks for real-time notifications</li>
        <li>Configure rate limiting for production</li>
        <li>Explore the full API reference</li>
      </ul>
    </div>
  );
}

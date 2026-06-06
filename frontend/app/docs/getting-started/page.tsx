import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started - Invoica',
  description: 'Get started with Invoica SDK',
};

export default function GettingStartedPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Getting Started</h1>

      <section>
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Installation</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Install the Invoica SDK using npm: npm install @invoica/sdk
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Quick Setup</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Import InvoicaClient and create an instance with your API key to authenticate requests.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Create Your First Invoice</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Use client.invoices.create() with amount, currency, and description parameters to generate an invoice.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Next Steps</h2>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4">
          <li>Read the API Reference</li>
          <li>Set up Webhooks</li>
          <li>Configure Authentication</li>
        </ul>
      </section>
    </div>
  );
}

import React from "react";

export default function PaginationPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Pagination</h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        When working with large result sets, use pagination to efficiently retrieve data in manageable chunks.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Basic Pagination</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{"const page1 = await client.listInvoices({ limit: 10, offset: 0 });"}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Response Format</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`{
  invoices: Invoice[],
  total: number,
  limit: number,
  offset: number
}`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Iterating All Pages</h2>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm dark:text-gray-200 mb-6">
        <code>{`let offset = 0;
while (offset < total) {
  const page = await client.listInvoices({ limit: 10, offset });
  offset += page.invoices.length;
}`}</code>
      </pre>

      <h2 className="text-2xl font-semibold mt-8 mb-4 dark:text-white">Default Limits</h2>
      <p className="text-gray-600 dark:text-gray-400">
        By default, the API returns 20 items per page. The maximum limit is 100 items per request.
      </p>
    </div>
  );
}

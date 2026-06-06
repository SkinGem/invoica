import React from 'react';

export default function ActivityPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Activity Log</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Monitor API usage and system events across your infrastructure.
      </p>
      <div className="border dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Event</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            <tr className="border-t dark:border-gray-800 dark:text-gray-300">
              <td className="px-6 py-4">System initialized</td>
              <td className="px-6 py-4"><span className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs">Success</span></td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">Platform ready</td>
            </tr>
            <tr className="border-t dark:border-gray-800 dark:text-gray-300">
              <td className="px-6 py-4">API key created</td>
              <td className="px-6 py-4"><span className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs">Info</span></td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">Default key generated</td>
            </tr>
            <tr className="border-t dark:border-gray-800 dark:text-gray-300">
              <td className="px-6 py-4">Webhook endpoint registered</td>
              <td className="px-6 py-4"><span className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs">Info</span></td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">Default endpoint</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Showing 3 of 3 events</p>
      </div>
    </div>
  );
}

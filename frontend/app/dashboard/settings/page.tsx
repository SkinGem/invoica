'use client';

export default function DashboardSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Settings</h1>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">General</h2>
        <div className="form-like">
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Company Name</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">Acme Corp</span>
              <button className="text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Time Zone</span>
            <span className="text-gray-600 dark:text-gray-400">UTC</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Default Currency</span>
            <span className="text-gray-600 dark:text-gray-400">USD</span>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Notifications</h2>
        <div className="form-like">
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Email Alerts</span>
            <span className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs">Enabled</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Webhook Failures</span>
            <span className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs">Enabled</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Monthly Reports</span>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">Disabled</span>
          </div>
        </div>
      </section>
    </div>
  );
}

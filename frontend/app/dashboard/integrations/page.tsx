export default function IntegrationsPage() {
  const integrations = [
    { id: '1', name: 'Stripe', description: 'Accept fiat payments alongside crypto', status: 'connected' as const, icon: '💳' },
    { id: '2', name: 'QuickBooks', description: 'Sync invoices with accounting software', status: 'available' as const, icon: '📊' },
    { id: '3', name: 'Slack', description: 'Get real-time notifications in your workspace', status: 'connected' as const, icon: '💬' },
    { id: '4', name: 'Zapier', description: 'Automate workflows with 5000+ apps', status: 'available' as const, icon: '⚡' },
    { id: '5', name: 'Xero', description: 'Alternative accounting integration', status: 'coming_soon' as const, icon: '📒' },
  ];

  const getBadge = (status: string) => {
    const styles = {
      connected: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
      available: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400',
      coming_soon: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
    };
    const labels = { connected: 'Connected', available: 'Connect', coming_soon: 'Coming Soon' };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>{labels[status as keyof typeof labels]}</span>;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">Integrations</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Connect external services and platforms</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <div key={i.id} className="border dark:border-gray-800 rounded-lg p-4 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{i.icon}</span>
              <span className="font-semibold dark:text-white">{i.name}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{i.description}</p>
            {getBadge(i.status)}
          </div>
        ))}
      </div>
    </div>
  );
}

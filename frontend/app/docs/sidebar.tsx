interface NavItem {
  label: string;
  href: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Quick Start', href: '/docs/quickstart' },
      { label: 'Configuration', href: '/docs/configuration' },
      { label: 'Authentication', href: '/docs/authentication' },
      { label: 'Plans & Pricing', href: '/docs/pricing' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'Invoices', href: '/docs/invoices' },
      { label: 'Settlements', href: '/docs/settlements' },
      { label: 'API Keys', href: '/docs/api-keys' },
      { label: 'Webhooks', href: '/docs/webhooks' },
      { label: 'Endpoints', href: '/docs/api-reference' },
    ],
  },
  {
    title: 'SDK',
    items: [
      { label: 'Overview', href: '/docs/sdk-overview' },
      { label: 'Reference', href: '/docs/sdk-reference' },
      { label: 'Error Handling', href: '/docs/error-handling' },
      { label: 'Rate Limiting', href: '/docs/rate-limiting' },
      { label: 'Retry', href: '/docs/retry' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Testing', href: '/docs/testing' },
      { label: 'Sandbox', href: '/docs/sandbox' },
      { label: 'Changelog', href: '/docs/changelog' },
    ],
  },
];

export default function DocsSidebar() {
  return (
    <nav className="w-64 min-w-[16rem] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-6 px-4">
      {navigation.map((group) => (
        <div key={group.title} className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="block px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-md transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function TeamPage() {
  const members = [
    { id: '1', name: 'Alex Chen', email: 'alex@invoica.dev', role: 'Owner' as const, status: 'active' as const, joinedAt: 'Jan 2026' },
    { id: '2', name: 'Sarah Kim', email: 'sarah@invoica.dev', role: 'Admin' as const, status: 'active' as const, joinedAt: 'Jan 2026' },
    { id: '3', name: 'Marcus Lee', email: 'marcus@invoica.dev', role: 'Developer' as const, status: 'active' as const, joinedAt: 'Feb 2026' },
    { id: '4', name: 'Jordan Taylor', email: 'jordan@example.com', role: 'Viewer' as const, status: 'invited' as const, joinedAt: 'Pending' },
  ];

  const roleColors = {
    Owner: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400',
    Admin: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    Developer: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400',
    Viewer: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">Team Members</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Manage your organization members and roles</p>
      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-sm">
            <div>
              <p className="font-semibold dark:text-white">{m.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{m.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[m.role]}`}>{m.role}</span>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className={`w-2 h-2 rounded-full ${m.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                {m.joinedAt}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

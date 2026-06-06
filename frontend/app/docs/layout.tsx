import React from 'react';
import DocsSidebar from './sidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DocsSidebar />
      <main className="flex-1 max-w-3xl px-8 py-8">{children}</main>
    </div>
  );
}

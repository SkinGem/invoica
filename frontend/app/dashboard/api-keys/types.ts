export interface ApiKeyRecord {
  id: string;
  customerId: string;
  customerEmail: string;
  keyPrefix: string;
  name: string;
  tier: string;
  plan: string;
  permissions: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

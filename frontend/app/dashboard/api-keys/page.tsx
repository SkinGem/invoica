'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ApiKeyRecord, formatDate } from './types';
import { KeyRevealModal } from './key-reveal-modal';
import { CreateKeyModal } from './create-key-modal';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ value: string; name: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/v1/api-keys`, {
        headers: { 'x-customer-id': user.id },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Failed to load keys');
      setKeys(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchKeys();
    }
  }, [authLoading, user?.id, fetchKeys]);

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    setRevokingId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/v1/api-keys/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Failed to revoke key');
      await fetchKeys();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to revoke key');
    } finally {
      setRevokingId(null);
    }
  };

  const handleKeyCreated = (keyValue: string, keyName: string) => {
    setShowCreateModal(false);
    setCreatedKey({ value: keyValue, name: keyName });
  };

  const handleRevealClose = () => {
    setCreatedKey(null);
    fetchKeys();
  };

  const activeKeys = keys.filter((k) => k.isActive);
  const revokedKeys = keys.filter((k) => !k.isActive);

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* BETA Banner */}
      <div className="flex items-center gap-3 bg-[#635BFF]/10 border border-[#635BFF]/20 rounded-xl px-4 py-3 mb-6">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#635BFF] text-white shrink-0">
          BETA
        </span>
        <p className="text-sm text-[#635BFF] font-medium">
          You&apos;re using Invoica during our private beta — all features are free.
        </p>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage keys for your integrations and agents.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#635BFF] hover:bg-[#5147e6] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Key
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchKeys} className="ml-auto text-xs text-red-500 underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm animate-pulse">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-40 font-mono" />
              <div className="h-4 bg-gray-200 rounded w-24 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && keys.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-[#635BFF]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#635BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">No API keys yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first key to start using the Invoica API.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-[#635BFF] hover:bg-[#5147e6] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create your first key
          </button>
        </div>
      )}

      {/* Active Keys */}
      {!loading && !error && activeKeys.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Keys ({activeKeys.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {activeKeys.map((key) => (
              <div key={key.id} className="px-6 py-4 flex items-center gap-4 group hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#635BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{key.name}</p>
                  <code className="text-xs text-gray-500 font-mono">
                    sk_<span className="text-gray-400">{key.keyPrefix}</span>••••••••••••••••
                  </code>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500 shrink-0">
                  <div className="text-right">
                    <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium">Created</p>
                    <p className="text-gray-600 font-medium">{formatDate(key.createdAt)}</p>
                  </div>
                  {key.lastUsedAt && (
                    <div className="text-right">
                      <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium">Last used</p>
                      <p className="text-gray-600 font-medium">{formatDate(key.lastUsedAt)}</p>
                    </div>
                  )}
                  {key.expiresAt && (
                    <div className="text-right">
                      <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium">Expires</p>
                      <p className="text-amber-600 font-medium">{formatDate(key.expiresAt)}</p>
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                  Active
                </span>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokingId === key.id}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs text-red-500 hover:text-red-700 font-medium transition-all disabled:opacity-50 shrink-0"
                  title="Revoke this key"
                >
                  {revokingId === key.id ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    'Revoke'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revoked Keys */}
      {!loading && !error && revokedKeys.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm opacity-70">
          <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Revoked Keys ({revokedKeys.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {revokedKeys.map((key) => (
              <div key={key.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 truncate line-through">{key.name}</p>
                  <code className="text-xs text-gray-400 font-mono">
                    sk_<span>{key.keyPrefix}</span>••••••••••••••••
                  </code>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-xs text-gray-400 shrink-0">
                  <div className="text-right">
                    <p className="text-gray-300 uppercase tracking-wide text-[10px] font-medium">Revoked</p>
                    <p className="font-medium">{formatDate(key.updatedAt)}</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-500 shrink-0">
                  Revoked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security note */}
      {!loading && !error && keys.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          API keys grant full access to the Invoica API on behalf of your account. Keep them secret and never commit them to version control.
        </p>
      )}

      {/* Modals */}
      {showCreateModal && user?.id && (
        <CreateKeyModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleKeyCreated}
        />
      )}
      {createdKey && (
        <KeyRevealModal
          keyValue={createdKey.value}
          keyName={createdKey.name}
          onClose={handleRevealClose}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

export function CreateKeyModal({
  onClose,
  onCreated,
  userId,
}: {
  onClose: () => void;
  onCreated: (keyValue: string, keyName: string) => void;
  userId: string;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Key name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/v1/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: userId,
          name: name.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create key');
      }
      const keyData = json.data;
      if (!keyData.key) {
        throw new Error('Server did not return key value');
      }
      onCreated(keyData.key, name.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Key Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production, Staging, My Agent..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent transition-shadow"
              autoFocus
              maxLength={100}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              A descriptive name to identify where this key is used.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-[#635BFF] hover:bg-[#5147e6] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                'Create Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

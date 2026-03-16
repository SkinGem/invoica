'use client';

import { useState } from 'react';

export function KeyRevealModal({
  keyValue,
  keyName,
  onClose,
}: {
  keyValue: string;
  keyName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = keyValue;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">API Key Created</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Key <span className="font-medium text-gray-700">&ldquo;{keyName}&rdquo;</span> was created successfully
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Copy this key now.</span> For security reasons, it will never be shown again after you close this dialog.
          </p>
        </div>

        {/* Key display */}
        <div className="bg-gray-950 rounded-xl px-4 py-3.5 mb-4 flex items-center gap-3">
          <code className="text-xs text-green-400 font-mono break-all flex-1 leading-relaxed">
            {keyValue}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        {/* Store hint */}
        <p className="text-xs text-gray-500 mb-5 text-center">
          Store this key in your environment variables or secrets manager.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-[#635BFF] hover:bg-[#5147e6] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          Done — I&apos;ve saved my key
        </button>
      </div>
    </div>
  );
}

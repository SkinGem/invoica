"use client";

import React, { useState } from "react";

interface ApiKeyDisplayProps {
  apiKey: string;
  label?: string;
  onRevoke?: () => void;
}

export default function ApiKeyDisplay({ apiKey, label = "API Key", onRevoke }: ApiKeyDisplayProps) {
  const [show, setShow] = useState(false);
  const masked = `sk-****...${apiKey.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(apiKey);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex gap-2">
        <span className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono text-sm dark:text-gray-200">
          {show ? apiKey : masked}
        </span>
        <button onClick={() => setShow(!show)} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
          {show ? "Hide" : "Show"}
        </button>
        <button onClick={copy} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
          Copy
        </button>
        {onRevoke && (
          <button onClick={onRevoke} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}

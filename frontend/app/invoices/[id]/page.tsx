'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchInvoiceById } from '@/lib/api-client';
import { InvoiceDetail } from '@/components/invoices/invoice-detail';
import { Invoice } from '@/types';
import { CredScoreBadge } from '@/components/CredScoreBadge';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [credScore, setCredScore] = useState<{score:number|null,tier:string|null}>({score:null,tier:null});

  useEffect(() => {
    fetchInvoiceById(params.id)
      .then((data) => {
        setInvoice(data);
        setLoading(false);
        
        // Fetch Helixa reputation score for the payer agent
        fetch(`/v1/reputation/${data.payerAgentId}`)
          .then((res) => res.ok ? res.json() : Promise.reject())
          .then((repData) => {
            setCredScore({ score: repData.score, tier: repData.tier });
          })
          .catch(() => {
            // Ignore errors, credScore stays null
          });
      })
      .catch(() => {
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-gray-600">Invoice not found</p>
        <Link href="/invoices" className="text-blue-600 hover:underline">
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/invoices" className="text-blue-600 hover:underline mb-6 block">
        ← Back to Invoices
      </Link>
      <InvoiceDetail invoice={invoice} />
      {invoice.payerAgentId && <div className="mt-4"><CredScoreBadge score={credScore.score} tier={credScore.tier} /></div>}
    </div>
  );
}
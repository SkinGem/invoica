// invoice-download.ts — GET /v1/invoices/:id/download
// Returns HTML invoice with AMD-22 tax line when present.
// No auth required — invoice ID is effectively the credential for download links.
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { renderInvoiceHtml, InvoiceRenderData } from '../lib/invoice-renderer';

const router = Router();

function getSb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const DOWNLOAD_FIELDS = 'id,invoiceNumber,status,amount,currency,customerEmail,customerName,paymentDetails,createdAt';

router.get('/v1/invoices/:id/download', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sb = getSb();

  const { data: inv, error } = await sb
    .from('Invoice')
    .select(DOWNLOAD_FIELDS)
    .eq('id', id)
    .single();

  if (error || !inv) {
    res.status(404).json({ success: false, error: { message: 'Invoice not found', code: 'NOT_FOUND' } });
    return;
  }

  const pd = inv.paymentDetails
    ? (typeof inv.paymentDetails === 'string' ? JSON.parse(inv.paymentDetails) : inv.paymentDetails)
    : null;

  const renderData: InvoiceRenderData = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    amount: inv.amount,
    currency: inv.currency,
    customerEmail: inv.customerEmail,
    customerName: inv.customerName,
    createdAt: inv.createdAt,
    paymentDetails: pd,
  };

  const html = renderInvoiceHtml(renderData);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${inv.invoiceNumber}.html"`);
  res.send(html);
});

export default router;
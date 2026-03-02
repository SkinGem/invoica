import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { createInvoiceEvent } from '../events/invoiceEvents';

const router = Router();

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const SUPPORTED_CHAINS = ['base', 'polygon', 'arbitrum'] as const;

const createInvoiceSchema = z.object({
  amount: z.number().positive().min(1),
  currency: z.string().length(3).default('USD'),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  chain: z.enum(SUPPORTED_CHAINS).optional().default('base'),
});

function formatInvoice(inv: any) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: Number(inv.amount),
    currency: inv.currency,
    customerId: inv.customerId || null,
    customerName: inv.customerName || null,
    customerEmail: inv.customerEmail || null,
    description: inv.description || null,
    status: inv.status,
    chain: inv.chain || 'base',
    dueDate: inv.dueDate || null,
    paymentDetails: inv.paymentDetails || null,
    settledAt: inv.settledAt || null,
    completedAt: inv.completedAt || null,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

/**
 * GET /v1/invoices/number/:number
 * Look up an invoice by its integer invoice number.
 * MUST be registered before /:id to prevent Express from matching "number" as an id.
 */
router.get(
  '/v1/invoices/number/:number',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoiceNumber = parseInt(req.params.number, 10);
      if (isNaN(invoiceNumber)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid invoice number', code: 'INVALID_NUMBER' },
        });
        return;
      }

      const sb = getSupabase();
      const { data, error } = await sb
        .from('Invoice')
        .select('*')
        .eq('invoiceNumber', invoiceNumber)
        .single();

      if (error || !data) {
        res.status(404).json({
          success: false,
          error: { message: 'Invoice not found', code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({ success: true, data: formatInvoice(data) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /v1/invoices
 * List invoices with optional filtering.
 */
router.get(
  '/v1/invoices',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string || '50', 10) || 50, 100);
      const offset = parseInt(req.query.offset as string || '0', 10) || 0;
      const { chain, status, customerId } = req.query;

      const sb = getSupabase();
      let query = sb
        .from('Invoice')
        .select('*', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      if (chain) query = query.eq('chain', chain as string);
      if (status) query = query.eq('status', status as string);
      if (customerId) query = query.eq('customerId', customerId as string);

      const { data, error, count } = await query;
      if (error) throw error;

      const total = count || 0;
      res.json({
        success: true,
        data: (data || []).map(formatInvoice),
        meta: { total, limit, offset, hasMore: offset + limit < total },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /v1/invoices/:id
 * Get a single invoice by UUID.
 * Registered AFTER /number/:number to prevent route shadowing.
 */
router.get(
  '/v1/invoices/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const sb = getSupabase();
      const { data, error } = await sb
        .from('Invoice')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        res.status(404).json({
          success: false,
          error: { message: 'Invoice not found', code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({ success: true, data: formatInvoice(data) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /v1/invoices
 * Create a new invoice.
 */
router.post(
  '/v1/invoices',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: parsed.error.errors,
          },
        });
        return;
      }

      const inputData = parsed.data;
      const sb = getSupabase();

      // Get the next invoice number (max + 1)
      const { data: last } = await sb
        .from('Invoice')
        .select('invoiceNumber')
        .order('invoiceNumber', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = last ? (Number(last.invoiceNumber) + 1) : 1;

      const { data: invoice, error } = await sb
        .from('Invoice')
        .insert({
          id: uuidv4(),
          invoiceNumber: nextNumber,
          amount: inputData.amount,
          currency: inputData.currency,
          customerId: inputData.customerId || null,
          customerName: inputData.customerName || null,
          customerEmail: inputData.customerEmail || null,
          description: inputData.description || null,
          status: 'PENDING',
          chain: inputData.chain || 'base',
          dueDate: inputData.dueDate || null,
        })
        .select()
        .single();

      if (error || !invoice) {
        throw error || new Error('Failed to create invoice');
      }

      // Emit event (gracefully degrades if Redis unavailable)
      await createInvoiceEvent('invoice.created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        customerId: invoice.customerId,
        chain: invoice.chain,
      }).catch(() => {/* no-op */});

      res.status(201).json({ success: true, data: formatInvoice(invoice) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

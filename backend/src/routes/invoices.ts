import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { calculateTax } from '../services/tax/calculator';
import { calculateAgentTax, resolveTransactionType } from '../services/tax/agenttax-client';
import { checkTrustGate } from '../middleware/trust-gate';
import { verifyPactMandate } from '../lib/pact-verify';
import { fetchHelixaCred, getHelixaTrustCeiling } from '../lib/helixa';
import { recordPaymentEvent, DuplicatePaymentError } from '../services/settlement/payment-events';
import { getChainConfig } from '../config/chains';

const router = Router();

/** EVM-compatible address format (0x + 40 hex chars) */
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
/** Solana base58 public key format (32–44 chars, no 0/O/I/l) */
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOLANA_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SUPPORTED_CHAINS = ['base', 'polygon', 'arbitrum', 'skale', 'solana'] as const;
type SupportedChain = typeof SUPPORTED_CHAINS[number];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

const SELECT_FIELDS = 'id, invoiceNumber, status, amount, currency, customerEmail, customerName, companyId, paymentDetails, settledAt, completedAt, createdAt, updatedAt';

function mapInvoice(inv: any) {
  const pd = inv.paymentDetails
    ? (typeof inv.paymentDetails === 'string' ? JSON.parse(inv.paymentDetails) : inv.paymentDetails)
    : {};
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    amount: inv.amount,
    currency: inv.currency,
    customerEmail: inv.customerEmail,
    customerName: inv.customerName,
    companyId: inv.companyId || null,
    paymentDetails: {
      txHash: pd.txHash || null,
      network: pd.network || null,
      paidBy: pd.paidBy || null,
      ...pd,
    },
    tax: pd.tax || null,
    settledAt: inv.settledAt,
    completedAt: inv.completedAt,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

// =============================================================================
// VALIDATION MIDDLEWARE: Prevent destructive overwrites without -force flag
// =============================================================================

/**
 * Destructive status transitions that require explicit --force flag
 * These transitions can cause data loss or reconciliation failures (BE-163 pattern)
 */
const DESTRUCTIVE_STATUS_TRANSITIONS: Record<string, string[]> = {
  'paid': ['cancelled'],
  'completed': ['cancelled', 'pending'],
  'processing': ['cancelled', 'pending'],
  'settled': ['cancelled', 'pending'],
};

/**
 * Critical fields that should not be overwritten without explicit force
 * Overwriting these after settlement causes reconciliation failures
 */
const PROTECTED_FIELDS = ['amount', 'currency', 'settledAt', 'completedAt', 'invoiceNumber'];

/**
 * ValidationError - Thrown when destructive operations are attempted without force flag
 */
export class ForceFlagRequiredError extends Error {
  constructor(message: string, public readonly field?: string, public readonly requiresForce = true) {
    super(message);
    this.name = 'ForceFlagRequiredError';
  }
}

/**
 * Extracts the force flag from query or body, normalizing variations
 */
function extractForceFlag(source: Record<string, unknown>): boolean {
  const forceValue = source.force ?? source.forceFlag ?? source._force;
  if (typeof forceValue === 'boolean') return forceValue;
  if (typeof forceValue === 'string') {
    return ['true', '1', 'yes'].includes(forceValue.toLowerCase());
  }
  return false;
}

/**
 * Validates that destructive field modifications have explicit force flag
 * Protects against BE-163 style accidental overwrites
 */
function validateNoDestructiveOverwrite(
  currentInvoice: Record<string, unknown>,
  updates: Record<string, unknown>,
  forceFlag: boolean
): void {
  // Check protected fields being modified without force
  for (const field of PROTECTED_FIELDS) {
    if (field in updates && updates[field] !== currentInvoice[field]) {
      if (!forceFlag) {
        throw new ForceFlagRequiredError(
          `Cannot overwrite protected field '${field}' without explicit --force flag. ` +
          `Current value: ${currentInvoice[field]}. Proposed: ${updates[field]}. ` +
          `Use ?force=true or pass force:true in body to acknowledge this destructive change.`,
          field
        );
      }
    }
  }

  // Check amount modification specifically (most critical for reconciliation)
  if ('amount' in updates && Number(updates.amount) !== Number(currentInvoice.amount)) {
    if (!forceFlag) {
      throw new ForceFlagRequiredError(
        `Changing invoice amount from ${currentInvoice.amount} to ${updates.amount} ` +
        `without --force may break payment reconciliation. Use --force to acknowledge.`,
        'amount'
      );
    }
  }
}

/**
 * Validates status transitions, blocking destructive ones without force flag
 */
function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  forceFlag: boolean
): void {
  // Allow any transition if target status is the same (no-op)
  if (currentStatus === newStatus) return;

  // Check if this is a destructive transition
  const destructiveTargets = DESTRUCTIVE_STATUS_TRANSITIONS[currentStatus];
  if (destructiveTargets?.includes(newStatus)) {
    if (!forceFlag) {
      throw new ForceFlagRequiredError(
        `Destructive status transition from '${currentStatus}' to '${newStatus}' requires --force flag. ` +
        `This transition may invalidate settled payments or cause reconciliation failures. ` +
        `Use ?force=true or pass force:true in body to proceed anyway.`,
        'status'
      );
    }
  }

  // Additional safety: prevent cancellation of fully paid/completed invoices
  if ((currentStatus === 'paid' || currentStatus === 'completed') && newStatus === 'cancelled') {
    if (!forceFlag) {
      throw new ForceFlagRequiredError(
        `Cannot cancel invoice in '${currentStatus}' status without --force. ` +
        `This will invalidate ${currentStatus === 'paid' ? 'payment' : 'completion'} records. ` +
        `Contact finance team or use --force to acknowledge financial impact.`,
        'status'
      );
    }
  }
}

/**
 * Middleware: Validates destructive operation prevention
 * Parses the incoming request and validates force flags for risky operations
 */
export function destructiveUpdateGuard(req: Request, res: Response, next: NextFunction) {
  // Only apply to PUT/PATCH/PUT methods that modify invoices
  if (!['PUT', 'PATCH', 'POST'].includes(req.method)) {
    return next();
  }

  // Skip if this is a create operation (POST to collection)
  const isUpdate = req.path.includes('/v1/invoices/') && !req.path.endsWith('/v1/invoices');
  if (!isUpdate && req.method === 'POST') {
    return next();
  }

  // Extract force flag from query params or body
  const forceFlag = extractForceFlag({ ...(req.query as Record<string, unknown>), ...(req.body as Record<string, unknown>) });

  // Store for later use in route handlers
  (req as any).__forceFlag = forceFlag;

  return next();
}

/**
 * Apply destructiveUpdateGuard to specific routes
 * Must be used before the route handlers below
 */

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /v1/invoices/search/advanced
 * Multi-field search with filters. Must be before /search to avoid shadowing.
 */
router.get('/v1/invoices/search/advanced', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q, status, currency,
      minAmount, maxAmount,
      fromDate, toDate,
    } = req.query as Record<string, string | undefined>;

    const limit  = Math.min(parseInt((req.query.limit  as string) || '20', 10), 100);
    const offset = Math.max(parseInt((req.query.offset as string) || '0',  10), 0);

    const sb = getSupabase();
    let query = sb.from('Invoice').select(SELECT_FIELDS);

    if (status)    query = (query as any).eq('status', status);
    if (currency) query = (query as any).eq('currency', currency);

    if (minAmount) query = (query as any).gte('amount', minAmount);
    if (maxAmount) query = (query as any).lte('amount', maxAmount);

    if (fromDate) query = (query as any).gte('createdAt', fromDate);
    if (toDate)   query = (query as any).lte('createdAt', toDate);

    if (q) {
      query = (query as any).or(`customerName.ilike.%${q}%,customerEmail.ilike.%${q}%,invoiceNumber.ilike.%${q}%`);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    const mapped = (data || []).map(mapInvoice);
    const count = data?.length || 0;

    res.json({
      invoices: mapped,
      pagination: { limit, offset, count, hasMore: count > offset + limit },
    });
  } catch (e) { next(e); }
});

/**
 * GET /v1/invoices/search
 * Legacy single-field search wrapper.
 */
router.get('/v1/invoices/search', async (req: Request, res: Response, next: NextFunction) => {
  const { q, limit = '20', offset = '0' } = req.query as Record<string, string>;
  const sb = getSupabase();

  const query = q
    ? (sb.from('Invoice').select(SELECT_FIELDS) as any)
        .or(`invoiceNumber.ilike.%${q}%,customerName.ilike.%${q}%`)
    : sb.from('Invoice').select(SELECT_FIELDS);

  const { data, error } = await query.range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);
  if (error) throw error;

  res.json({ invoices: (data || []).map(mapInvoice) });
});

/**
 * POST /v1/invoices
 * Create a new invoice.
 */
router.post('/v1/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = 'USD', customerEmail, customerName, companyId } = req.body as Record<string, string | number>;

    if (!amount || !customerEmail || !customerName) {
      throw new Error('Missing required fields: amount, customerEmail, customerName');
    }

    const sb = getSupabase();

    // Get next invoice number atomically
    const { data: configData } = await sb.from('Config').select('value').eq('key', 'invoiceSequence').single();
    let seq = configData?.value ? parseInt(configData.value, 10) + 1 : 1;
    const invoiceNumber = `INV-${String(seq).padStart(6, '0')}`;

    const { data, error } = await sb.from('Invoice').insert({
      invoiceNumber,
      amount,
      currency,
      customerEmail,
      customerName,
      companyId: companyId || null,
      status: 'pending',
    }).select().single();

    if (error) {
      // Rollback sequence on failure would require transaction - not trivial, ignoring.
      throw error;
    }

    // Update sequence
    await sb.from('Config').upsert({ key: 'invoiceSequence', value: String(seq) }, { onConflict: 'key' });

    res.status(201).json(mapInvoice(data));
  } catch (e) { next(e); }
});

/**
 * GET /v1/invoices
 * List all invoices with optional filters.
 */
router.get('/v1/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, currency, companyId, limit = '20', offset = '0' } = req.query as Record<string, string>;

    const sb = getSupabase();
    let query = sb.from('Invoice').select(SELECT_FIELDS);

    if (status)    query = (query as any).eq('status', status);
    if (currency) query = (query as any).eq('currency', currency);
    if (companyId) query = (query as any).eq('companyId', companyId);

    const { data, error } = await query.range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);
    if (error) throw error;

    res.json({ invoices: (data || []).map(mapInvoice) });
  } catch (e) { next(e); }
});

/**
 * GET /v1/invoices/:id
 * Fetch a single invoice by ID.
 */
router.get('/v1/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();

    const { data, error } = await sb.from('Invoice').select(SELECT_FIELDS).eq('id', id).single();
    if (error) throw error;
    if (!data) { res.status(404).json({ error: 'not found' }); return; }

    res.json(mapInvoice(data));
  } catch (e) { next(e); }
});

/**
 * PATCH /v1/invoices/:id
 * Update an invoice with destructive change protection.
 */
router.patch('/v1/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body as Record<string, unknown>;

    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const sb = getSupabase();

    // Fetch current state for validation
    const { data: current, error: fetchError } = await sb
      .from('Invoice')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const currentInvoice = mapInvoice(current);

    // Extract force flag from stored middleware result or explicit parameter
    const forceFlag = extractForceFlag({
      ...(req.query as Record<string, unknown>),
      ...(req.body as Record<string, unknown>),
    });

    // Validate protected fields cannot be overwritten without force
    validateNoDestructiveOverwrite(currentInvoice, updates, forceFlag);

    // Validate status transitions
    if (updates.status) {
      validateStatusTransition(currentInvoice.status, String(updates.status), forceFlag);
    }

    // Apply updates
    const { data, error } = await sb
      .from('Invoice')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(mapInvoice(data));
  } catch (e) {
    if (e instanceof ForceFlagRequiredError) {
      res.status(403).json({
        error: e.name,
        message: e.message,
        requiresForce: e.requiresForce,
        field: e.field,
      });
      return;
    }
    next(e);
  }
});

/**
 * DELETE /v1/invoices/:id
 * Soft-delete an invoice - requires force flag for established invoices.
 */
router.delete('/v1/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const forceFlag = extractForceFlag({
      ...(req.query as Record<string, unknown>),
      ...(req.body as Record<string, unknown>),
    });

    const sb = getSupabase();

    // Fetch current state
    const { data: current, error: fetchError } = await sb
      .from('Invoice')
      .select('id, status, settledAt')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Soft-delete protection: require force for invoices with settlement history
    if (current.settledAt && !forceFlag) {
      res.status(403).json({
        error: 'ForceFlagRequiredError',
        message: `Invoice ${id} has settlement records (settledAt: ${current.settledAt}). ` +
                 `Cannot soft-delete without --force flag. Use ?force=true to acknowledge deletion.`,
        requiresForce: true,
        field: 'softDelete',
      });
      return;
    }

    // Also protect already-paid or completed invoices
    if ((current.status === 'paid' || current.status === 'completed') && !forceFlag) {
      res.status(403).json({
        error: 'ForceFlagRequiredError',
        message: `Invoice ${id} is in '${current.status}' status. ` +
                 `Soft-delete requires --force to acknowledge this destructive action.`,
        requiresForce: true,
        field: 'status',
      });
      return;
    }

    // Perform soft-delete by setting status to cancelled
    const { error } = await sb
      .from('Invoice')
      .update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Invoice soft-deleted', id });
  } catch (e) { next(e); }
});

/**
 * POST v1/invoices/:id/settle
 * Mark invoice as settled (called from settlement detection worker).
 */
router.post('/v1/invoices/:id/settle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { txHash, network, paidBy } = req.body as Record<string, string>;

    if (!txHash || !network || !paidBy) {
      throw new Error('Missing required fields: txHash, network, paidBy');
    }

    const sb = getSupabase();
    const { data: inv, error: fetchError } = await sb
      .from('Invoice')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inv) {
      res.status(404).json({ error: 'invoice not found' });
      return;
    }

    // Check current status - only settle pending or processing
    if (inv.status !== 'pending' && inv.status !== 'processing') {
      res.status(400).json({ error: `cannot settle invoice in ${inv.status} status` });
      return;
    }

    // Parse existing payment details and merge
    const pd = inv.paymentDetails
      ? (typeof inv.paymentDetails === 'string' ? JSON.parse(inv.paymentDetails) : inv.paymentDetails)
      : {};

    const newPd = { ...pd, txHash, network, paidBy };

    const { error } = await sb
      .from('Invoice')
      .update({
        status: 'paid',
        settledAt: new Date().toISOString(),
        paymentDetails: JSON.stringify(newPd),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Emit settlement event
    await recordPaymentEvent({
      invoiceId: id,
      txHash,
      network,
      amount: inv.amount,
    });

    res.json({ status: 'paid', settledAt: new Date().toISOString() });
  } catch (e) { next(e); }
});

/**
 * POST /v1/invoices/:id/complete
 * Mark invoice as completed after processing.
 */
router.post('/v1/invoices/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();

    const { data: inv, error: fetchError } = await sb
      .from('Invoice')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inv) {
      res.status(404).json({ error: 'invoice not found' });
      return;
    }

    if (inv.status !== 'paid') {
      res.status(400).json({ error: `expected status 'paid', got '${inv.status}'` });
      return;
    }

    // Complete the invoice
    const { error } = await sb
      .from('Invoice')
      .update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ status: 'completed' });
  } catch (e) { next(e); }
});

/**
 * GET /v1/invoices/:id/download
 * Generate downloadable PDF (placeholder - actual impl in workers).
 */
router.get('/v1/invoices/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();

    const { data, error } = await sb.from('Invoice').select(SELECT_FIELDS).eq('id', id).single();
    if (error || !data) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    // Placeholder - real PDF generation happens asynchronously via Bull
    res.json({ downloadUrl: `/api/v1/pdf/${id}`, expiresIn: 3600 });
  } catch (e) { next(e); }
});

/**
 * POST /v1/invoices/:id/events
 * Webhook endpoint for payment events.
 */
router.post('/v1/invoices/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { type, payload } = req.body as Record<string, unknown>;

    if (!type || !payload) {
      res.status(400).json({ error: 'missing type or payload' });
      return;
    }

    // Handle specific event types
    switch (type) {
      case 'payment.settled':
        // Settlement already handled via separate endpoint, just acknowledging here
        res.status(200).json({ received: true });
        break;
      default:
        res.status(400).json({ error: `unsupported event type: ${type}` });
    }
  } catch (e) { next(e); }
});

export default router;
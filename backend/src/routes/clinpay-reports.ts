// clinpay-reports.ts — DRS rollup export for accounting / audit views.
//
// Petteri-aligned design (2026-05-12): real-time per-event DRS storage,
// rollup VIEW for downstream consumption. Storage stays per-event; this
// endpoint serves the aggregated presentation.
//
// Dual-auth: Supabase JWT (dashboard) OR x-api-key (programmatic).
// Customer scoping: only receipts joined to invoices issued by the
// authenticated customer — AG accounting cannot see DemoBio data.
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { findApiKeyByKey } from '../services/api-keys';

const router = Router();

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

interface AuthedCustomer { id: string; email: string }

async function resolveCustomer(req: Request): Promise<AuthedCustomer | null> {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) return null;
    const sb = createClient(process.env.SUPABASE_URL!, anonKey);
    const { data } = await sb.auth.getUser(token);
    if (data.user?.id) return { id: data.user.id, email: data.user.email || `${data.user.id}@dashboard.invoica.ai` };
  }
  const apiKey = (req.headers['x-api-key'] as string | undefined)?.trim();
  if (apiKey) {
    const rec = await findApiKeyByKey(apiKey);
    if (rec?.isActive) return { id: rec.customerId, email: rec.customerEmail };
  }
  return null;
}

function parseDateParam(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  if (/^\d+$/.test(raw)) return new Date(parseInt(raw, 10) * 1000);
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
}

interface BucketRow {
  bucket_start: string;
  settlement_count: number;
  total_amount_eur: string;
  total_tax_eur: string;
  jurisdictions: string[];
  receipt_ids: string[];
}

router.get('/v1/clinpay/reports/rollup', async (req: Request, res: Response): Promise<void> => {
  const customer = await resolveCustomer(req);
  if (!customer) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const studyId = (req.query.study_id as string | undefined)?.trim() || null;
  const periodRaw = (req.query.period as string | undefined) || 'day';
  const format = (req.query.format as string | undefined) || 'json';

  if (periodRaw !== 'day' && periodRaw !== 'week') {
    res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD', message: "period must be 'day' or 'week'" } });
    return;
  }
  if (format !== 'json' && format !== 'csv') {
    res.status(400).json({ success: false, error: { code: 'INVALID_FORMAT', message: "format must be 'json' or 'csv'" } });
    return;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = parseDateParam(req.query.from as string | undefined, thirtyDaysAgo);
  const to = parseDateParam(req.query.to as string | undefined, now);

  // Supabase JS doesn't compose this aggregation cleanly, so we use the
  // SQL function .rpc would expose. Falling back to a raw SQL call via
  // execute_sql isn't allowed for non-admins, so the cleanest path is
  // a server-side bucket in JS over a customer-scoped projection.
  const sb = getSb();

  // Pull the projection: DrsReceipt joined to Invoice on issuer_customer_id.
  // The Invoice FK guarantees each DrsReceipt has one parent invoice with a
  // (possibly null) issuer_customer_id.
  const { data: rows, error } = await sb
    .from('DrsReceipt')
    .select(`
      receipt_id,
      settled_at,
      amount_eur,
      sponsor_jurisdiction,
      tax_line,
      study_id,
      invoice_id,
      Invoice:invoice_id ( issuer_customer_id )
    `)
    .gte('settled_at', from.toISOString())
    .lte('settled_at', to.toISOString())
    .order('settled_at', { ascending: true });

  if (error) {
    console.error(`[clinpay-reports] query failed for ${customer.id}: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'QUERY_FAILED', message: error.message } });
    return;
  }

  // Filter to this customer's invoices + (optional) study_id.
  const scoped = (rows || []).filter(r => {
    const inv = r.Invoice as { issuer_customer_id?: string | null } | null | undefined;
    if (!inv || inv.issuer_customer_id !== customer.id) return false;
    if (studyId && r.study_id !== studyId) return false;
    return true;
  });

  // Bucket by day or week. Day-key: YYYY-MM-DD. Week-key: Monday-of-week YYYY-MM-DD.
  const buckets: Map<string, BucketRow> = new Map();
  for (const r of scoped) {
    const settledAt = new Date(r.settled_at as string);
    const bucketKey = periodRaw === 'day' ? dayKey(settledAt) : weekKey(settledAt);

    let b = buckets.get(bucketKey);
    if (!b) {
      b = {
        bucket_start: `${bucketKey}T00:00:00Z`,
        settlement_count: 0,
        total_amount_eur: '0',
        total_tax_eur: '0',
        jurisdictions: [],
        receipt_ids: [],
      };
      buckets.set(bucketKey, b);
    }
    b.settlement_count += 1;
    b.total_amount_eur = addDecimal(b.total_amount_eur, String(r.amount_eur));
    const taxLine = r.tax_line as { total_tax?: number | string } | null;
    if (taxLine?.total_tax != null) b.total_tax_eur = addDecimal(b.total_tax_eur, String(taxLine.total_tax));
    if (r.sponsor_jurisdiction && !b.jurisdictions.includes(r.sponsor_jurisdiction)) {
      b.jurisdictions.push(r.sponsor_jurisdiction);
    }
    b.receipt_ids.push(r.receipt_id as string);
  }

  const sortedBuckets = [...buckets.values()].sort((a, b) => a.bucket_start.localeCompare(b.bucket_start));

  const totals = sortedBuckets.reduce(
    (acc, b) => ({
      settlement_count: acc.settlement_count + b.settlement_count,
      total_amount_eur: addDecimal(acc.total_amount_eur, b.total_amount_eur),
      total_tax_eur: addDecimal(acc.total_tax_eur, b.total_tax_eur),
    }),
    { settlement_count: 0, total_amount_eur: '0', total_tax_eur: '0' },
  );

  if (format === 'csv') {
    const lines = ['bucket_start,settlement_count,total_amount_eur,total_tax_eur,jurisdictions,receipt_ids'];
    for (const b of sortedBuckets) {
      lines.push([
        b.bucket_start,
        b.settlement_count,
        b.total_amount_eur,
        b.total_tax_eur,
        `"${b.jurisdictions.join('|')}"`,
        `"${b.receipt_ids.join('|')}"`,
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rollup-${studyId || 'all'}-${periodRaw}.csv"`);
    res.send(lines.join('\n') + '\n');
    return;
  }

  res.json({
    success: true,
    data: {
      study_id: studyId,
      period: periodRaw,
      from: from.toISOString(),
      to: to.toISOString(),
      buckets: sortedBuckets,
      totals,
    },
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekKey(d: Date): string {
  // Monday-of-week, UTC. ISO week convention.
  const copy = new Date(d);
  const dayOfWeek = (copy.getUTCDay() + 6) % 7; // 0 = Monday
  copy.setUTCDate(copy.getUTCDate() - dayOfWeek);
  return copy.toISOString().slice(0, 10);
}

/**
 * Decimal-string addition, max 4 fractional digits (matches DrsReceipt.amount_eur
 * NUMERIC(19, 4)). Avoids float drift for accounting totals.
 */
function addDecimal(a: string, b: string): string {
  const [ai = '0', af = ''] = a.split('.');
  const [bi = '0', bf = ''] = b.split('.');
  const afPad = (af + '0000').slice(0, 4);
  const bfPad = (bf + '0000').slice(0, 4);
  const sum = BigInt(ai) * 10000n + BigInt(afPad) + BigInt(bi) * 10000n + BigInt(bfPad);
  const sumStr = sum.toString().padStart(5, '0');
  const intPart = sumStr.slice(0, -4);
  const fracPart = sumStr.slice(-4).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

export default router;

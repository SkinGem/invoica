import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { calculateTax } from '../services/tax/calculator';
import { calculateAgentTax, resolveTransactionType } from '../services/tax/agenttax-client';
import { checkTrustGate } from '../middleware/trust-gate';
import { verifyPactMandate } from '../lib/pact-verify';
import { fetchHelixaCred, getHelixaTrustCeiling } from '../lib/helixa';
import { recordPaymentEvent, DuplicatePaymentError } from '../services/settlement/payment-events';
import { getChainConfig } from '../config/chains';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

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
 * Overwriting these can break payment reconciliation or audit trails
 */
const CRITICAL_FIELDS = ['amount', 'currency', 'paymentDetails', 'settledAt', 'completedAt'];

function validateDestructiveUpdate(req: Request, res: Response, next: NextFunction) {
  const { status } = req.body;
  const forceFlag = req.query.force === 'true' || req.headers['x-force-update'] === 'true';
  
  if (!forceFlag && status) {
    // Check if this is a destructive status transition
    const currentStatus = req.params.currentStatus; // Set by previous middleware
    if (currentStatus && DESTRUCTIVE_STATUS_TRANSITIONS[currentStatus]?.includes(status)) {
      return res.status(400).json({
        error: 'Destructive status transition requires --force flag',
        transition: `${currentStatus} → ${status}`,
        hint: 'Add ?force=true or X-Force-Update: true header'
      });
    }
  }

  // Check for critical field overwrites
  if (!forceFlag) {
    const criticalFieldsInBody = CRITICAL_FIELDS.filter(field => req.body[field] !== undefined);
    if (criticalFieldsInBody.length > 0) {
      return res.status(400).json({
        error: 'Critical field update requires --force flag',
        fields: criticalFieldsInBody,
        hint: 'Add ?force=true or X-Force-Update: true header'
      });
    }
  }

  next();
}

// =============================================================================
// VAT EVIDENCE UPLOAD HANDLER
// =============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document formats for VAT evidence
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for VAT evidence'));
    }
  }
});

async function uploadVatEvidence(req: Request, res: Response) {
  try {
    const { invoiceId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID required' });
    }

    const supabase = getSupabase();

    // Verify invoice exists
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop() || 'bin';
    const fileName = `vat-evidence/${invoiceId}/${uuidv4()}.${fileExtension}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Insert into vat_evidence table
    const { data: evidenceData, error: evidenceError } = await supabase
      .from('vat_evidence')
      .insert({
        invoice_id: invoiceId,
        file_url: fileUrl,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (evidenceError) {
      console.error('VAT evidence insert error:', evidenceError);
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([fileName]);
      return res.status(500).json({ error: 'Failed to record VAT evidence' });
    }

    res.status(201).json({
      success: true,
      evidence: evidenceData,
      message: 'VAT evidence uploaded successfully'
    });

  } catch (error) {
    console.error('VAT evidence upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================================================
// ROUTES
// =============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json({ invoices: data?.map(mapInvoice) || [] });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw error;
    }

    res.json({ invoice: mapInvoice(data) });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const {
      invoiceNumber,
      amount,
      currency = 'USD',
      customerEmail,
      customerName,
      companyId,
      paymentDetails = {}
    } = req.body;

    if (!invoiceNumber || !amount || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: invoiceNumber, amount, customerEmail'
      });
    }

    const invoiceData = {
      invoiceNumber,
      amount: parseFloat(amount),
      currency,
      customerEmail,
      customerName,
      companyId: companyId || null,
      paymentDetails: JSON.stringify(paymentDetails),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    res.status(201).json({ invoice: mapInvoice(data) });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/:id', validateDestructiveUpdate, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    // First get current invoice to check status
    const { data: currentInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw fetchError;
    }

    // Set current status for validation middleware
    req.params.currentStatus = currentInvoice.status;

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // Convert paymentDetails to JSON string if it's an object
    if (updateData.paymentDetails && typeof updateData.paymentDetails === 'object') {
      updateData.paymentDetails = JSON.stringify(updateData.paymentDetails);
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    res.json({ invoice: mapInvoice(data) });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// VAT Evidence upload route
router.post('/:invoiceId/vat-evidence', upload.single('vatEvidence'), uploadVatEvidence);

// =============================================================================
// PAYMENT PROCESSING ROUTES
// =============================================================================

router.post('/:id/verify-payment', checkTrustGate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash, network, paidBy } = req.body;

    if (!txHash || !network) {
      return res.status(400).json({
        error: 'Missing required fields: txHash, network'
      });
    }

    if (!SUPPORTED_CHAINS.includes(network as SupportedChain)) {
      return res.status(400).json({
        error: `Unsupported network: ${network}`,
        supported: SUPPORTED_CHAINS
      });
    }

    const supabase = getSupabase();

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw invoiceError;
    }

    if (invoice.status === 'paid' || invoice.status === 'completed') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    // Validate addresses based on network
    if (paidBy) {
      const isValidAddress = network === 'solana' 
        ? SOLANA_ADDRESS_RE.test(paidBy)
        : EVM_ADDRESS_RE.test(paidBy);

      if (!isValidAddress) {
        return res.status(400).json({
          error: `Invalid ${network} address format: ${paidBy}`
        });
      }
    }

    // Get chain config for verification
    const chainConfig = getChainConfig(network);
    if (!chainConfig) {
      return res.status(400).json({ error: `Chain config not found for ${network}` });
    }

    // Record payment event (this will verify the transaction)
    try {
      await recordPaymentEvent({
        invoiceId: id,
        txHash,
        network: network as SupportedChain,
        amount: invoice.amount,
        currency: invoice.currency,
        paidBy: paidBy || null,
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof DuplicatePaymentError) {
        return res.status(409).json({ error: 'Payment already recorded' });
      }
      throw error;
    }

    // Update invoice status and payment details
    const paymentDetails = {
      txHash,
      network,
      paidBy: paidBy || null,
      verifiedAt: new Date().toISOString()
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paymentDetails: JSON.stringify(paymentDetails),
        settledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      invoice: mapInvoice(updatedInvoice),
      paymentVerified: true
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

router.post('/:id/calculate-tax', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerCountry, customerType = 'individual', isEuBusiness = false } = req.body;

    if (!customerCountry) {
      return res.status(400).json({ error: 'customerCountry is required' });
    }

    const supabase = getSupabase();

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw invoiceError;
    }

    // Calculate tax
    const taxResult = await calculateTax({
      amount: invoice.amount,
      currency: invoice.currency,
      customerCountry,
      customerType,
      isEuBusiness,
      serviceType: 'digital_services'
    });

    // Update invoice with tax information
    const currentPaymentDetails = invoice.paymentDetails 
      ? (typeof invoice.paymentDetails === 'string' 
          ? JSON.parse(invoice.paymentDetails) 
          : invoice.paymentDetails)
      : {};

    const updatedPaymentDetails = {
      ...currentPaymentDetails,
      tax: taxResult
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        paymentDetails: JSON.stringify(updatedPaymentDetails),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      invoice: mapInvoice(updatedInvoice),
      tax: taxResult
    });

  } catch (error) {
    console.error('Error calculating tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

router.post('/:id/calculate-agent-tax', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId, transactionType } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const supabase = getSupabase();

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw invoiceError;
    }

    // Resolve transaction type if not provided
    const resolvedTransactionType = transactionType || await resolveTransactionType({
      amount: invoice.amount,
      currency: invoice.currency,
      agentId,
      invoiceId: id
    });

    // Calculate agent tax
    const agentTaxResult = await calculateAgentTax({
      agentId,
      amount: invoice.amount,
      currency: invoice.currency,
      transactionType: resolvedTransactionType
    });

    // Update invoice with agent tax information
    const currentPaymentDetails = invoice.paymentDetails 
      ? (typeof invoice.paymentDetails === 'string' 
          ? JSON.parse(invoice.paymentDetails) 
          : invoice.paymentDetails)
      : {};

    const updatedPaymentDetails = {
      ...currentPaymentDetails,
      agentTax: agentTaxResult,
      agentId,
      transactionType: resolvedTransactionType
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        paymentDetails: JSON.stringify(updatedPaymentDetails),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      invoice: mapInvoice(updatedInvoice),
      agentTax: agentTaxResult,
      transactionType: resolvedTransactionType
    });

  } catch (error) {
    console.error('Error calculating agent tax:', error);
    res.status(500).json({ error: 'Failed to calculate agent tax' });
  }
});

router.post('/:id/verify-pact', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pactId, mandateHash } = req.body;

    if (!pactId || !mandateHash) {
      return res.status(400).json({
        error: 'Missing required fields: pactId, mandateHash'
      });
    }

    const supabase = getSupabase();

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw invoiceError;
    }

    // Verify pact mandate
    const pactVerification = await verifyPactMandate({
      pactId,
      mandateHash,
      amount: invoice.amount,
      currency: invoice.currency
    });

    if (!pactVerification.valid) {
      return res.status(400).json({
        error: 'Pact verification failed',
        reason: pactVerification.reason
      });
    }

    // Update invoice with pact information
    const currentPaymentDetails = invoice.paymentDetails 
      ? (typeof invoice.paymentDetails === 'string' 
          ? JSON.parse(invoice.paymentDetails) 
          : invoice.paymentDetails)
      : {};

    const updatedPaymentDetails = {
      ...currentPaymentDetails,
      pact: {
        pactId,
        mandateHash,
        verifiedAt: new Date().toISOString(),
        ...pactVerification
      }
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        paymentDetails: JSON.stringify(updatedPaymentDetails),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      invoice: mapInvoice(updatedInvoice),
      pactVerification
    });

  } catch (error) {
    console.error('Error verifying pact:', error);
    res.status(500).json({ error: 'Failed to verify pact' });
  }
});

router.post('/:id/check-helixa-trust', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { helixaAddress } = req.body;

    if (!helixaAddress) {
      return res.status(400).json({ error: 'helixaAddress is required' });
    }

    const supabase = getSupabase();

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      throw invoiceError;
    }

    // Fetch Helixa credentials and trust ceiling
    const [helixaCred, trustCeiling] = await Promise.all([
      fetchHelixaCred(helixaAddress),
      getHelixaTrustCeiling(helixaAddress)
    ]);

    const trustCheck = {
      address: helixaAddress,
      credentials: helixaCred,
      trustCeiling,
      invoiceAmount: invoice.amount,
      currency: invoice.currency,
      trustSufficient: trustCeiling >= invoice.amount,
      checkedAt: new Date().toISOString()
    };

    // Update invoice with Helixa trust information
    const currentPaymentDetails = invoice.paymentDetails 
      ? (typeof invoice.paymentDetails === 'string' 
          ? JSON.parse(invoice.paymentDetails) 
          : invoice.paymentDetails)
      : {};

    const updatedPaymentDetails = {
      ...currentPaymentDetails,
      helixaTrust: trustCheck
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        paymentDetails: JSON.stringify(updatedPaymentDetails),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      invoice: mapInvoice(updatedInvoice),
      helixaTrust: trustCheck
    });

  } catch (error) {
    console.error('Error checking Helixa trust:', error);
    res.status(500).json({ error: 'Failed to check Helixa trust' });
  }
});

export default router;
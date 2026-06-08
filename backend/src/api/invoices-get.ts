import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { ApiError } from '../types/errors';
import { logger } from '../lib/logger';

/**
 * Schema for validating invoice ID parameter
 */
const idSchema = z.string().min(1);

/**
 * VAT evidence record structure
 */
interface VatEvidence {
  id: string;
  invoice_id: string;
  vat_number?: string;
  validation_result?: any;
  ip_address?: string;
  country_code?: string;
  evidence_type: string;
  created_at: string;
}

/**
 * Invoice record structure
 */
interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  metadata: any;
  vatEvidence?: VatEvidence[];
}

/**
 * Retrieves an invoice by ID with associated VAT evidence
 * @param req Express request object containing invoice ID in params
 * @param res Express response object
 */
export async function getInvoiceById(req: Request, res: Response): Promise<void> {
  try {
    const validation = idSchema.safeParse(req.params.id);

    if (!validation.success) {
      logger.warn('Invalid invoice ID provided', { 
        id: req.params.id, 
        errors: validation.error.errors 
      });
      res.status(400).json({ 
        error: 'Invalid invoice ID',
        details: validation.error.errors
      });
      return;
    }

    const invoiceId = validation.data;

    // Fetch invoice from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        logger.info('Invoice not found', { invoiceId });
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      
      logger.error('Database error fetching invoice', { 
        invoiceId, 
        error: invoiceError 
      });
      throw new ApiError('Failed to fetch invoice', 500, invoiceError);
    }

    // Fetch VAT evidence for this invoice
    const { data: vatEvidence, error: vatError } = await supabase
      .from('vat_evidence')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (vatError) {
      logger.error('Database error fetching VAT evidence', { 
        invoiceId, 
        error: vatError 
      });
      throw new ApiError('Failed to fetch VAT evidence', 500, vatError);
    }

    // Append VAT evidence to invoice response
    const response: Invoice = {
      ...invoice,
      vatEvidence: vatEvidence || []
    };

    logger.info('Invoice retrieved successfully', { 
      invoiceId, 
      vatEvidenceCount: vatEvidence?.length || 0 
    });

    res.status(200).json(response);

  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('API error in getInvoiceById', { 
        invoiceId: req.params.id, 
        error: error.message,
        statusCode: error.statusCode
      });
      res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code
      });
      return;
    }

    logger.error('Unexpected error in getInvoiceById', { 
      invoiceId: req.params.id, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}
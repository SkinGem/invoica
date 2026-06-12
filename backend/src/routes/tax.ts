import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { calculateTax, EU_VAT_RATES, US_NEXUS_RATES } from '../services/tax/calculator';
import { storeVatEvidence } from '../services/tax/evidence';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// VAT evidence document validation schema
const VatEvidenceDocumentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'text/plain']),
  size: z.number().min(1).max(10 * 1024 * 1024), // 10MB max
  buffer: z.instanceof(Buffer).optional(),
  data: z.string().optional(), // base64 encoded data as fallback
});

const VatEvidenceSchema = z.object({
  vatNumber: z.string().min(1),
  validationTimestamp: z.string(),
  viesResponse: z.object({
    valid: z.boolean(),
    countryCode: z.string(),
    vatNumber: z.string(),
    requestDate: z.string(),
    name: z.string().optional(),
    address: z.string().optional(),
  }),
  documents: z.array(VatEvidenceDocumentSchema).optional(),
});

/**
 * Validate file type based on buffer content and extension
 */
function validateFileType(filename: string, mimetype: string, buffer?: Buffer): boolean {
  const ext = path.extname(filename).toLowerCase();
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
  
  if (!allowedExtensions.includes(ext)) {
    return false;
  }

  // Basic MIME type validation
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
  if (!allowedMimeTypes.includes(mimetype)) {
    return false;
  }

  // Additional buffer validation if available
  if (buffer && buffer.length > 0) {
    // PDF signature
    if (mimetype === 'application/pdf' && !buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return false;
    }
    // JPEG signature
    if (mimetype === 'image/jpeg' && !(buffer[0] === 0xFF && buffer[1] === 0xD8)) {
      return false;
    }
    // PNG signature
    if (mimetype === 'image/png' && !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      return false;
    }
  }

  return true;
}

/**
 * Verify storage path exists and is writable
 */
async function verifyStoragePath(storagePath: string): Promise<boolean> {
  try {
    await fs.access(storagePath, fs.constants.W_OK);
    return true;
  } catch {
    try {
      await fs.mkdir(storagePath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * POST /v1/tax/calculate
 * Calculate applicable tax for a given amount and buyer location.
 * Body: { amount: number, buyerLocation: { countryCode, stateCode?, vatNumber? } }
 */
router.post('/v1/tax/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, buyerLocation } = req.body;

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({
        success: false,
        error: { message: 'amount must be a positive number', code: 'INVALID_AMOUNT' },
      });
      return;
    }
    if (!buyerLocation || typeof buyerLocation !== 'object') {
      res.status(400).json({
        success: false,
        error: { message: 'buyerLocation is required', code: 'MISSING_FIELD' },
      });
      return;
    }
    if (!buyerLocation.countryCode || typeof buyerLocation.countryCode !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'buyerLocation.countryCode is required', code: 'MISSING_FIELD' },
      });
      return;
    }

    const result = calculateTax({
      amount: Number(amount),
      buyerLocation: {
        countryCode: buyerLocation.countryCode,
        stateCode: buyerLocation.stateCode,
        vatNumber: buyerLocation.vatNumber,
      },
    });

    // Validate VAT evidence fields before database writes
    if (result.vatEvidence) {
      try {
        const validatedEvidence = VatEvidenceSchema.parse(result.vatEvidence);
        
        // Validate documents if present
        if (validatedEvidence.documents && validatedEvidence.documents.length > 0) {
          for (const doc of validatedEvidence.documents) {
            // Validate file type
            if (!validateFileType(doc.filename, doc.mimetype, doc.buffer)) {
              res.status(400).json({
                success: false,
                error: { message: `Invalid file type for document: ${doc.filename}`, code: 'INVALID_FILE_TYPE' },
              });
              return;
            }

            // Verify storage path
            const storagePath = path.join(process.cwd(), 'storage', 'vat-evidence');
            if (!(await verifyStoragePath(storagePath))) {
              res.status(500).json({
                success: false,
                error: { message: 'Storage path verification failed', code: 'STORAGE_ERROR' },
              });
              return;
            }
          }
        }

        // Store VAT evidence
        await storeVatEvidence(validatedEvidence);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            error: { 
              message: 'VAT evidence validation failed', 
              code: 'INVALID_VAT_EVIDENCE',
              details: validationError.errors 
            },
          });
          return;
        }
        throw validationError;
      }
    }

    res.json({
      success: true,
      data: {
        amount: Number(amount),
        taxRate: result.taxRate,
        taxAmount: result.taxAmount,
        totalAmount: Number(amount) + result.taxAmount,
        jurisdiction: result.jurisdiction,
        invoiceNote: result.invoiceNote || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /v1/tax/jurisdictions
 * Return supported tax jurisdictions with their rates.
 */
router.get('/v1/tax/jurisdictions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const jurisdictions = {
      eu: {
        type: 'VAT',
        rates: EU_VAT_RATES,
        rules: {
          b2b: 'Reverse charge if both parties in EU and buyer has valid VAT number',
          b2c: 'Charge buyer country VAT rate',
        },
      },
      us: {
        type: 'Sales Tax',
        rates: US_NEXUS_RATES,
        rules: {
          nexus: 'Apply tax only in states where economic nexus exists',
          digital: 'Tax digital services based on state regulations',
        },
      },
    };

    res.json({
      success: true,
      data: jurisdictions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /v1/tax/vat/validate
 * Validate a VAT number via VIES API
 * Body: { vatNumber: string, countryCode: string }
 */
router.post('/v1/tax/vat/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vatNumber, countryCode } = req.body;

    if (!vatNumber || typeof vatNumber !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'vatNumber is required', code: 'MISSING_FIELD' },
      });
      return;
    }

    if (!countryCode || typeof countryCode !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'countryCode is required', code: 'MISSING_FIELD' },
      });
      return;
    }

    // Import validation service dynamically to avoid circular dependencies
    const { validateVatNumber } = await import('../services/tax/vat-validator');
    
    const validation = await validateVatNumber(vatNumber, countryCode);

    res.json({
      success: true,
      data: validation,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /v1/tax/evidence/store
 * Store VAT evidence documents
 * Body: VatEvidenceSchema
 */
router.post('/v1/tax/evidence/store', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evidence = req.body;

    // Validate evidence schema
    const validatedEvidence = VatEvidenceSchema.parse(evidence);

    // Validate documents if present
    if (validatedEvidence.documents && validatedEvidence.documents.length > 0) {
      for (const doc of validatedEvidence.documents) {
        // Convert base64 data to buffer if needed
        let buffer = doc.buffer;
        if (!buffer && doc.data) {
          try {
            buffer = Buffer.from(doc.data, 'base64');
          } catch {
            res.status(400).json({
              success: false,
              error: { message: `Invalid base64 data for document: ${doc.filename}`, code: 'INVALID_DATA' },
            });
            return;
          }
        }

        // Validate file type
        if (!validateFileType(doc.filename, doc.mimetype, buffer)) {
          res.status(400).json({
            success: false,
            error: { message: `Invalid file type for document: ${doc.filename}`, code: 'INVALID_FILE_TYPE' },
          });
          return;
        }

        // Verify storage path
        const storagePath = path.join(process.cwd(), 'storage', 'vat-evidence');
        if (!(await verifyStoragePath(storagePath))) {
          res.status(500).json({
            success: false,
            error: { message: 'Storage path verification failed', code: 'STORAGE_ERROR' },
          });
          return;
        }
      }
    }

    // Store evidence
    const result = await storeVatEvidence(validatedEvidence);

    res.json({
      success: true,
      data: { evidenceId: result.id, stored: true },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { 
          message: 'VAT evidence validation failed', 
          code: 'INVALID_VAT_EVIDENCE',
          details: err.errors 
        },
      });
      return;
    }
    next(err);
  }
});

export default router;
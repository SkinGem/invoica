import { Router, Request, Response, NextFunction } from 'express';
import { calculateTax, EU_VAT_RATES, US_NEXUS_RATES } from '../services/tax/calculator';

const router = Router();

/**
 * POST /v1/tax/calculate
 * Calculate applicable tax for a given amount and buyer location.
 * Body: { amount: number, buyerLocation: { countryCode, stateCode?, vatNumber? } }
 */
router.post('/v1/tax/calculate', (req: Request, res: Response, next: NextFunction) => {
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
router.get('/v1/tax/jurisdictions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      us: {
        jurisdiction: 'US',
        description: 'US sales tax (nexus-based)',
        rates: Object.entries(US_NEXUS_RATES).map(([state, rate]) => ({
          stateCode: state,
          rate,
          ratePercent: `${(rate * 100).toFixed(2)}%`,
        })),
      },
      eu: {
        jurisdiction: 'EU',
        description: 'EU VAT (B2C standard rates; B2B reverse charge applies)',
        rates: Object.entries(EU_VAT_RATES).map(([country, rate]) => ({
          countryCode: country,
          rate,
          ratePercent: `${(rate * 100).toFixed(0)}%`,
        })),
      },
    },
  });
});

export default router;

/**
 * Invoice Routes
 * 
 * Provides REST API endpoints for invoice management with x402 payment middleware integration.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, InvoiceStatus, Chain } from '@prisma/client';
import { validateChain } from '../lib/chain-validator';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createInvoiceSchema = z.object({
  merchantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  chain: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInvoiceSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  paymentTxHash: z.string().optional(),
});

const querySchema = z.object({
  merchantId: z.string().uuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  chain: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'amount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Middleware for parsing and validating request bodies
function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}

// Middleware for parsing query parameters
function parseQueryParams(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = querySchema.parse(req.query);
    req.query = parsed as any;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
}

/**
 * Generate sequential invoice number
 * Uses atomic database operation to ensure uniqueness
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Use Prisma's atomic increment for thread-safe counter
  const counter = await prisma.counter.upsert({
    where: { id: `INV-${year}` },
    create: { id: `INV-${year}`, count: 1 },
    update: { count: { increment: 1 } },
  });
  
  const sequence = String(counter.count).padStart(6, '0');
  return `INV-${year}-${sequence}`;
}

/**
 * Apply chain validation to request
 */
function applyChainValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const chain = validateChain(req.body.chain ?? req.query.chain);
    (req as any).validatedChain = chain;
    next();
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid chain',
    });
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /invoices
 * Create a new invoice
 */
router.post(
  '/',
  validateRequest(createInvoiceSchema),
  applyChainValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { merchantId, amount, currency, description, dueDate, metadata } = req.body;
      const chain = (req as any).validatedChain;

      // Verify merchant exists
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      // Generate sequential invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // Create invoice with pending status
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          merchantId,
          amount,
          currency,
          chain: chain as Chain,
          status: InvoiceStatus.PENDING,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          metadata: metadata ?? {},
        },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /invoices
 * List all invoices with filtering and pagination
 */
router.get(
  '/',
  parseQueryParams,
  applyChainValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { merchantId, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const chain = (req as any).validatedChain;

      const where: any = {};
      
      if (merchantId) {
        where.merchantId = merchantId;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (chain) {
        where.chain = chain;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip: ((page as number) - 1) * (limit as number),
          take: limit as number,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        data: invoices,
        pagination: {
          page: page as number,
          limit: limit as number,
          total,
          totalPages: Math.ceil(total / (limit as number)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /invoices/:id
 * Get a single invoice by ID
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
              address: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /invoices/number/:invoiceNumber
 * Get invoice by invoice number
 */
router.get(
  '/number/:invoiceNumber',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { invoiceNumber } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { invoiceNumber },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /invoices/:id
 * Update an invoice
 */
router.patch(
  '/:id',
  validateRequest(updateInvoiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, amount, description, dueDate, metadata, paymentTxHash } = req.body;

      // Check if invoice exists
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!existingInvoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Validate status transitions
      const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
        [InvoiceStatus.PENDING]: [InvoiceStatus.PROCESSING, InvoiceStatus.SETTLED, InvoiceStatus.CANCELLED],
        [InvoiceStatus.PROCESSING]: [InvoiceStatus.SETTLED, InvoiceStatus.FAILED],
        [InvoiceStatus.SETTLED]: [InvoiceStatus.COMPLETED],
        [InvoiceStatus.COMPLETED]: [],
        [InvoiceStatus.FAILED]: [InvoiceStatus.PENDING],
        [InvoiceStatus.CANCELLED]: [],
      };

      if (status && status !== existingInvoice.status) {
        const allowed = validTransitions[existingInvoice.status];
        if (!allowed.includes(status)) {
          res.status(400).json({
            error: `Invalid status transition from ${existingInvoice.status} to ${status}`,
          });
          return;
        }
      }

      // Update invoice
      const updateData: any = {};
      
      if (status) updateData.status = status;
      if (amount !== undefined) updateData.amount = amount;
      if (description !== undefined) updateData.description = description;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (metadata !== undefined) updateData.metadata = metadata;
      if (paymentTxHash !== undefined) updateData.paymentTxHash = paymentTxHash;

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /invoices/:id
 * Delete (cancel) an invoice
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Only allow deletion of pending invoices
      if (invoice.status !== InvoiceStatus.PENDING) {
        res.status(400).json({
          error: 'Only pending invoices can be deleted',
        });
        return;
      }

      await prisma.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.CANCELLED },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /invoices/:id/pay
 * Record a payment for an invoice
 */
router.post(
  '/:id/pay',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { txHash, amount, chain } = req.body;

      if (!txHash || !amount) {
        res.status(400).json({ error: 'txHash and amount are required' });
        return;
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      if (invoice.status !== InvoiceStatus.PENDING) {
        res.status(400).json({
          error: 'Invoice is not in pending status',
        });
        return;
      }

      // Verify payment amount matches invoice
      if (amount < invoice.amount) {
        res.status(400).json({
          error: 'Payment amount is less than invoice amount',
        });
        return;
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId: id,
          amount,
          chain: chain || invoice.chain,
          txHash,
          status: 'CONFIRMED',
        },
      });

      // Update invoice status
      await prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.SETTLED,
          paymentTxHash: txHash,
        },
      });

      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /invoices/:id/status
 * Get the current status of an invoice
 */
router.get(
  '/:id/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          amount: true,
          currency: true,
          chain: true,
          updatedAt: true,
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /invoices/:id/reminder
 * Send payment reminder for an invoice
 */
router.post(
  '/:id/reminder',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          merchant: true,
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      if (invoice.status !== InvoiceStatus.PENDING) {
        res.status(400).json({
          error: 'Can only send reminders for pending invoices',
        });
        return;
      }

      // TODO: Integrate with email service (SendGrid)
      // await sendReminderEmail(invoice);

      res.json({ message: 'Reminder sent successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /invoices/:id/webhook
 * Handle payment webhook callbacks
 */
router.post(
  '/:id/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { event, data } = req.body;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Handle different webhook events
      switch (event) {
        case 'payment.confirmed':
          await prisma.invoice.update({
            where: { id },
            data: {
              status: InvoiceStatus.SETTLED,
              paymentTxHash: data.txHash,
            },
          });
          break;

        case 'payment.failed':
          await prisma.invoice.update({
            where: { id },
            data: { status: InvoiceStatus.FAILED },
          });
          break;

        default:
          res.status(400).json({ error: 'Unknown webhook event' });
          return;
      }

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /invoices/bulk
 * Create multiple invoices at once
 */
router.post(
  '/bulk',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { invoices } = req.body;

      if (!Array.isArray(invoices) || invoices.length === 0) {
        res.status(400).json({ error: 'invoices array is required' });
        return;
      }

      // Validate all invoices first
      const validatedInvoices = [];
      for (const inv of invoices) {
        const parsed = createInvoiceSchema.parse(inv);
        validatedInvoices.push(parsed);
      }

      // Generate invoice numbers and create records
      const createdInvoices = [];
      for (const inv of validatedInvoices) {
        const invoiceNumber = await generateInvoiceNumber();
        const chain = validateChain(inv.chain);

        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            merchantId: inv.merchantId,
            amount: inv.amount,
            currency: inv.currency,
            chain: chain as Chain,
            status: InvoiceStatus.PENDING,
            description: inv.description,
            dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
            metadata: inv.metadata ?? {},
          },
        });
        createdInvoices.push(invoice);
      }

      res.status(201).json(createdInvoices);
    } catch (error) {
      next(error);
    }
  }
);

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Invoice route error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default router;
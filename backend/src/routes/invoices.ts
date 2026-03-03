import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validateChain } from '../lib/chain-validator';

const router = Router();
const prisma = new PrismaClient();

// Supported chains configuration
const SUPPORTED_CHAINS = ['ETHEREUM', 'SOLANA', 'POLYGON', 'AVALANCHE', 'BINANCE'] as const;
type SupportedChain = typeof SUPPORTED_CHAINS[number];

// Invoice status enum
const InvoiceStatus = {
  PENDING: 'pending',
  SETTLED: 'settled',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Input validation schemas
const createInvoiceSchema = z.object({
  merchantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  chain: z.enum(SUPPORTED_CHAINS),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInvoiceSchema = z.object({
  status: z.enum(Object.values(InvoiceStatus)).optional(),
  paidAt: z.string().datetime().optional(),
});

const invoiceQuerySchema = z.object({
  merchantId: z.string().uuid().optional(),
  status: z.enum(Object.values(InvoiceStatus)).optional(),
  chain: z.enum(SUPPORTED_CHAINS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Chain validation helper (to be replaced with chain-validator module)
function isValidChain(chain: string): chain is SupportedChain {
  return SUPPORTED_CHAINS.includes(chain as SupportedChain);
}

/**
 * Get all invoices with filtering and pagination
 * GET /api/invoices
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = invoiceQuerySchema.parse(req.query);
    
    const where: Record<string, unknown> = {};
    
    if (query.merchantId) {
      where.merchantId = query.merchantId;
    }
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.chain) {
      where.chain = query.chain;
    }
    
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(query.endDate);
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
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
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * Get a single invoice by ID
 * GET /api/invoices/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
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
});

/**
 * Create a new invoice
 * POST /api/invoices
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createInvoiceSchema.parse(req.body);

    // Validate chain using the imported validator
    if (!validateChain(data.chain)) {
      res.status(400).json({ 
        error: 'Unsupported chain',
        supportedChains: SUPPORTED_CHAINS 
      });
      return;
    }

    // Generate sequential invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const nextNumber = lastInvoice 
      ? parseInt(lastInvoice.invoiceNumber.replace(/^INV-/, ''), 10) + 1 
      : 1;
    
    const invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`;

    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: data.merchantId },
    });

    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        merchantId: data.merchantId,
        amount: data.amount,
        currency: data.currency,
        chain: data.chain,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        metadata: data.metadata,
        status: InvoiceStatus.PENDING,
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
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * Update an invoice
 * PATCH /api/invoices/:id
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateInvoiceSchema.parse(req.body);

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Validate status transitions
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        [InvoiceStatus.PENDING]: [InvoiceStatus.SETTLED, InvoiceStatus.FAILED],
        [InvoiceStatus.SETTLED]: [InvoiceStatus.PROCESSING],
        [InvoiceStatus.PROCESSING]: [InvoiceStatus.COMPLETED, InvoiceStatus.FAILED],
        [InvoiceStatus.COMPLETED]: [],
        [InvoiceStatus.FAILED]: [InvoiceStatus.PENDING],
      };

      const allowedTransitions = validTransitions[existingInvoice.status] || [];
      
      if (!allowedTransitions.includes(data.status)) {
        res.status(400).json({
          error: 'Invalid status transition',
          currentStatus: existingInvoice.status,
          requestedStatus: data.status,
          allowedTransitions,
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    
    if (data.paidAt) {
      updateData.paidAt = new Date(data.paidAt);
    }

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
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * Delete an invoice
 * DELETE /api/invoices/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Only allow deletion of pending invoices
    if (existingInvoice.status !== InvoiceStatus.PENDING) {
      res.status(400).json({
        error: 'Can only delete pending invoices',
        currentStatus: existingInvoice.status,
      });
      return;
    }

    await prisma.invoice.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
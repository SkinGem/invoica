import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validateChain } from '../lib/chain-validator';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { sendInvoiceEmail } from '../lib/email';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createInvoiceSchema = z.object({
  merchantId: z.string().uuid(),
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  chain: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInvoiceSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
  paidAt: z.string().datetime().optional(),
  paymentTxHash: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const invoiceQuerySchema = z.object({
  merchantId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
  chain: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(['createdAt', 'amount', 'dueDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Middleware to handle validation errors
const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Validation failed', 400, error.errors));
      } else {
        next(error);
      }
    }
  };
};

// Query validation middleware
const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid query parameters', 400, error.errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * GET /api/invoices
 * List all invoices with filtering and pagination
 */
router.get('/', validateQuery(invoiceQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      merchantId, 
      customerId, 
      status, 
      chain,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    
    if (merchantId) where.merchantId = merchantId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (chain) {
      const validChain = validateChain(chain);
      where.chain = validChain;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          merchant: {
            select: { id: true, name: true, email: true }
          },
          customer: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error listing invoices', { error, query: req.query });
    next(error);
  }
});

/**
 * GET /api/invoices/:id
 * Get a single invoice by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    res.json(invoice);
  } catch (error) {
    logger.error('Error fetching invoice', { error, params: req.params });
    next(error);
  }
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
router.post('/', validate(createInvoiceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId, customerId, amount, currency, chain, description, dueDate, metadata } = req.body;
    
    const validatedChain = chain ? validateChain(chain) : undefined;

    // Get next invoice number atomically
    const invoiceCount = await prisma.invoiceNumber.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(8, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        merchantId,
        customerId,
        amount: Math.round(amount * 100), // Store in cents
        currency: currency.toUpperCase(),
        chain: validatedChain,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        metadata: metadata || {},
        status: 'pending'
      },
      include: {
        merchant: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    logger.info('Invoice created', { invoiceId: invoice.id, invoiceNumber });

    res.status(201).json(invoice);
  } catch (error) {
    logger.error('Error creating invoice', { error, body: req.body });
    next(error);
  }
});

/**
 * PATCH /api/invoices/:id
 * Update an invoice
 */
router.patch('/:id', validate(updateInvoiceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, paidAt, paymentTxHash, metadata } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!existingInvoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['processing', 'cancelled'],
      processing: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (status && !validTransitions[existingInvoice.status].includes(status)) {
      throw new AppError(
        `Invalid status transition from ${existingInvoice.status} to ${status}`,
        400
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (status) updateData.status = status;
    if (paidAt) updateData.paidAt = new Date(paidAt);
    if (paymentTxHash) updateData.paymentTxHash = paymentTxHash;
    if (metadata) updateData.metadata = metadata;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        merchant: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    logger.info('Invoice updated', { invoiceId: id, status, paymentTxHash });

    // Send confirmation email if payment completed
    if (status === 'completed') {
      try {
        await sendInvoiceEmail(invoice.customer.email, invoice);
      } catch (emailError) {
        logger.error('Failed to send invoice email', { error: emailError, invoiceId: id });
      }
    }

    res.json(invoice);
  } catch (error) {
    logger.error('Error updating invoice', { error, params: req.params, body: req.body });
    next(error);
  }
});

/**
 * DELETE /api/invoices/:id
 * Cancel an invoice (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!existingInvoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (existingInvoice.status === 'completed') {
      throw new AppError('Cannot delete a completed invoice', 400);
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    logger.info('Invoice cancelled', { invoiceId: id });

    res.status(204).send();
  } catch (error) {
    logger.error('Error cancelling invoice', { error, params: req.params });
    next(error);
  }
});

/**
 * POST /api/invoices/:id/resend
 * Resend invoice email to customer
 */
router.post('/:id/resend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    await sendInvoiceEmail(invoice.customer.email, invoice);

    logger.info('Invoice resent', { invoiceId: id });

    res.json({ message: 'Invoice resent successfully' });
  } catch (error) {
    logger.error('Error resending invoice', { error, params: req.params });
    next(error);
  }
});

/**
 * GET /api/invoices/merchant/:merchantId
 * Get all invoices for a specific merchant
 */
router.get('/merchant/:merchantId', validateQuery(invoiceQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;
    const { status, chain, page = 1, limit = 20 } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { merchantId };
    
    if (status) where.status = status;
    if (chain) {
      const validChain = validateChain(chain);
      where.chain = validChain;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching merchant invoices', { error, params: req.params });
    next(error);
  }
});

/**
 * GET /api/invoices/customer/:customerId
 * Get all invoices for a specific customer
 */
router.get('/customer/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { customerId };
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(invoices);
  } catch (error) {
    logger.error('Error fetching customer invoices', { error, params: req.params });
    next(error);
  }
});

/**
 * POST /api/invoices/:id/mark-paid
 * Manually mark an invoice as paid (admin endpoint)
 */
router.post('/:id/mark-paid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paymentTxHash } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'completed') {
      throw new AppError('Invoice is already paid', 400);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'completed',
        paidAt: new Date(),
        paymentTxHash: paymentTxHash || null
      },
      include: {
        merchant: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    logger.info('Invoice marked as paid', { invoiceId: id, paymentTxHash });

    res.json(updatedInvoice);
  } catch (error) {
    logger.error('Error marking invoice as paid', { error, params: req.params });
    next(error);
  }
});

/**
 * GET /api/invoices/stats/summary
 * Get invoice statistics summary
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId, customerId } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (merchantId) where.merchantId = merchantId;
    if (customerId) where.customerId = customerId;

    const [totalInvoices, pendingInvoices, completedInvoices, totalAmount, pendingAmount] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { ...where, status: 'pending' } }),
      prisma.invoice.count({ where: { ...where, status: 'completed' } }),
      prisma.invoice.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { amount: true }
      }),
      prisma.invoice.aggregate({
        where: { ...where, status: 'pending' },
        _sum: { amount: true }
      })
    ]);

    res.json({
      totalInvoices,
      pendingInvoices,
      completedInvoices,
      totalAmount: totalAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      completionRate: totalInvoices > 0 
        ? Math.round((completedInvoices / totalInvoices) * 100) 
        : 0
    });
  } catch (error) {
    logger.error('Error fetching invoice stats', { error, query: req.query });
    next(error);
  }
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

export default router;
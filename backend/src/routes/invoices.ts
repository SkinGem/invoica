import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validateChain } from '../lib/chain-validator';
import { AppError } from '../lib/errors';
import { emitInvoiceEvent } from '../lib/redis';
import { generateInvoicePDF } from '../lib/pdf-generator';
import { sendInvoiceEmail } from '../lib/email';

const router = Router();

// Validation schemas
const createInvoiceSchema = z.object({
  body: z.object({
    merchantId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().length(3),
    chain: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
    })).optional(),
  }),
});

const updateInvoiceSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'settled', 'processing', 'completed', 'cancelled']).optional(),
    paidAt: z.string().datetime().optional(),
    paymentReference: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const invoiceQuerySchema = z.object({
  query: z.object({
    merchantId: z.string().uuid().optional(),
    status: z.enum(['pending', 'settled', 'processing', 'completed', 'cancelled']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    chain: z.string().optional(),
  }),
});

// Generate sequential invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${year}
  `;
  const count = Number(countResult[0].count) + 1;
  return `INV-${year}-${count.toString().padStart(6, '0')}`;
}

// POST /invoices - Create a new invoice
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createInvoiceSchema.safeParse(req);
    if (!validation.success) {
      throw new AppError('Validation failed', 400, validation.error.errors);
    }

    const { merchantId, amount, currency, description, dueDate, lineItems } = req.body;
    const chain = validateChain(req.body.chain ?? req.query.chain);

    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }

    // Check for duplicate pending invoice for same merchant and amount
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        merchantId,
        amount,
        status: 'pending',
      },
    });

    if (existingInvoice) {
      throw new AppError('A pending invoice already exists for this merchant and amount', 409);
    }

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        merchantId,
        amount,
        currency,
        chain,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        lineItems: lineItems ? JSON.stringify(lineItems) : null,
        status: 'pending',
      },
    });

    // Emit event to Redis queue
    await emitInvoiceEvent('invoice.created', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      merchantId,
      amount,
      currency,
      chain,
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// GET /invoices - List all invoices with filtering and pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = invoiceQuerySchema.safeParse(req);
    if (!validation.success) {
      throw new AppError('Validation failed', 400, validation.error.errors);
    }

    const { merchantId, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (merchantId) where.merchantId = merchantId;
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
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
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /invoices/:id - Get a single invoice by ID
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
            address: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /invoices/:id - Update an invoice
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, paidAt, paymentReference } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['settled', 'cancelled'],
      settled: ['processing'],
      processing: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (status && status !== existingInvoice.status) {
      if (!validTransitions[existingInvoice.status]?.includes(status)) {
        throw new AppError(`Invalid status transition from ${existingInvoice.status} to ${status}`, 400);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (paidAt) updateData.paidAt = new Date(paidAt);
    if (paymentReference) updateData.paymentReference = paymentReference;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    // Emit status change event
    await emitInvoiceEvent(`invoice.${status || 'updated'}`, {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      previousStatus: existingInvoice.status,
      newStatus: invoice.status,
    });

    // Trigger PDF regeneration and email for completed invoices
    if (status === 'completed' && existingInvoice.status !== 'completed') {
      const pdfBuffer = await generateInvoicePDF(invoice.id);
      await sendInvoiceEmail(invoice.id, pdfBuffer);
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /invoices/:id - Cancel an invoice (soft delete)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'completed') {
      throw new AppError('Cannot cancel a completed invoice', 400);
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await emitInvoiceEvent('invoice.cancelled', {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/regenerate-pdf - Regenerate invoice PDF
router.post('/:id/regenerate-pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const pdfBuffer = await generateInvoicePDF(id);
    
    // Upload to S3 would happen here
    // const s3Url = await uploadToS3(pdfBuffer, `invoices/${invoice.invoiceNumber}.pdf`);

    await sendInvoiceEmail(id, pdfBuffer);

    res.json({
      success: true,
      message: 'PDF regenerated and email sent',
    });
  } catch (error) {
    next(error);
  }
});

// POST /invoices/:id/send - Send invoice via email
router.post('/:id/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const recipientEmail = email || invoice.merchant.email;
    const pdfBuffer = await generateInvoicePDF(id);

    await sendInvoiceEmail(id, pdfBuffer, recipientEmail);

    res.json({
      success: true,
      message: `Invoice sent to ${recipientEmail}`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /invoices/:id/history - Get invoice status history
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // In a real implementation, you'd have an InvoiceStatusHistory table
    // For now, we'll return the current invoice state with timestamps
    const history = [
      {
        status: invoice.status,
        timestamp: invoice.updatedAt.toISOString(),
        note: 'Current status',
      },
    ];

    if (invoice.paidAt) {
      history.push({
        status: 'paid',
        timestamp: invoice.paidAt.toISOString(),
        note: 'Payment recorded',
      });
    }

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
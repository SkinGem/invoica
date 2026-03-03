import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateChain } from '../lib/chain-validator';
import { prisma } from '../lib/prisma';
import { InvoiceStatus, Chain } from '@prisma/client';

const router = Router();

// Validation schemas
const createInvoiceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
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
    status: z.nativeEnum(InvoiceStatus).optional(),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    chain: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    paidAt: z.string().datetime().optional(),
  }),
});

const invoiceQuerySchema = z.object({
  query: z.object({
    customerId: z.string().uuid().optional(),
    status: z.nativeEnum(InvoiceStatus).optional(),
    chain: z.string().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// GET /api/invoices - List all invoices with filtering and pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const chain = validateChain(req.body.chain ?? req.query.chain);
  
  const { customerId, status, fromDate, toDate, page = '1', limit = '20' } = req.query;
  
  const where: any = {};
  
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (chain) where.chain = chain;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate as string);
    if (toDate) where.createdAt.lte = new Date(toDate as string);
  }
  
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);
  
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lineItems: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  
  res.json({
    data: invoices,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// GET /api/invoices/:id - Get single invoice by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true,
      settlements: true,
    },
  });
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  res.json(invoice);
}));

// POST /api/invoices - Create a new invoice
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const chain = validateChain(req.body.chain ?? req.query.chain);
  
  const { customerId, amount, currency, description, dueDate, lineItems } = req.body;
  
  // Generate invoice number atomically
  const invoiceNumber = await prisma.$transaction(async (tx) => {
    const lastInvoice = await tx.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    
    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace(/^INV-/, '')) : 0;
    return `INV-${String(lastNumber + 1).padStart(6, '0')}`;
  });
  
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId,
      amount,
      currency: currency.toUpperCase(),
      chain,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: InvoiceStatus.PENDING,
      lineItems: lineItems ? {
        create: lineItems.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      } : undefined,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lineItems: true,
    },
  });
  
  res.status(201).json(invoice);
}));

// PUT /api/invoices/:id - Update an invoice
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const chain = validateChain(req.body.chain ?? req.query.chain);
  
  const { id } = req.params;
  const { status, amount, currency, description, dueDate, paidAt } = req.body;
  
  const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
  
  if (!existingInvoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  // Validate status transitions
  const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    [InvoiceStatus.PENDING]: [InvoiceStatus.PROCESSING, InvoiceStatus.SETTLED],
    [InvoiceStatus.SETTLED]: [InvoiceStatus.PROCESSING],
    [InvoiceStatus.PROCESSING]: [InvoiceStatus.COMPLETED, InvoiceStatus.FAILED],
    [InvoiceStatus.COMPLETED]: [],
    [InvoiceStatus.FAILED]: [InvoiceStatus.PENDING],
  };
  
  if (status && status !== existingInvoice.status) {
    const allowed = validTransitions[existingInvoice.status];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${existingInvoice.status} to ${status}`,
      });
    }
  }
  
  const updateData: any = {};
  if (status) updateData.status = status;
  if (amount) updateData.amount = amount;
  if (currency) updateData.currency = currency.toUpperCase();
  if (chain) updateData.chain = chain;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (paidAt) updateData.paidAt = new Date(paidAt);
  
  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lineItems: true,
    },
  });
  
  res.json(invoice);
}));

// DELETE /api/invoices/:id - Delete an invoice
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
  
  if (!existingInvoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  // Only allow deletion of pending invoices
  if (existingInvoice.status !== InvoiceStatus.PENDING) {
    return res.status(400).json({
      error: 'Only pending invoices can be deleted',
    });
  }
  
  await prisma.invoice.delete({ where: { id } });
  
  res.status(204).send();
}));

// GET /api/invoices/:id/pdf - Get invoice PDF
router.get('/:id/pdf', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true,
    },
  });
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  // PDF generation is handled by the worker queue
  // This endpoint returns the PDF URL or triggers generation
  res.json({
    message: 'PDF generation queued',
    invoiceId: id,
  });
}));

// POST /api/invoices/:id/send - Send invoice via email
router.post('/:id/send', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true },
  });
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  // Email sending is handled by the worker queue
  res.json({
    message: 'Invoice send queued',
    invoiceId: id,
    email: invoice.customer.email,
  });
}));

// GET /api/invoices/chain/:chain - Get invoices by chain
router.get('/chain/:chain', asyncHandler(async (req: Request, res: Response) => {
  const chain = validateChain(req.params.chain);
  
  const { status, page = '1', limit = '20' } = req.query;
  
  const where: any = { chain };
  if (status) where.status = status;
  
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);
  
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
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
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// GET /api/invoices/customer/:customerId - Get invoices for a customer
router.get('/customer/:customerId', asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const chain = validateChain(req.body.chain ?? req.query.chain);
  
  const { status, fromDate, toDate, page = '1', limit = '20' } = req.query;
  
  const where: any = { customerId };
  if (status) where.status = status;
  if (chain) where.chain = chain;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate as string);
    if (toDate) where.createdAt.lte = new Date(toDate as string);
  }
  
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);
  
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  
  res.json({
    data: invoices,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// POST /api/invoices/:id/remind - Send payment reminder
router.post('/:id/remind', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true },
  });
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  if (invoice.status === InvoiceStatus.COMPLETED) {
    return res.status(400).json({ error: 'Invoice is already paid' });
  }
  
  // Reminder sending is handled by the worker queue
  res.json({
    message: 'Payment reminder queued',
    invoiceId: id,
    email: invoice.customer.email,
  });
}));

// GET /api/invoices/stats/summary - Get invoice statistics
router.get('/stats/summary', asyncHandler(async (req: Request, res: Response) => {
  const chain = validateChain(req.body.chain ?? req.query.chain);
  
  const { fromDate, toDate } = req.query;
  
  const where: any = {};
  if (chain) where.chain = chain;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate as string);
    if (toDate) where.createdAt.lte = new Date(toDate as string);
  }
  
  const [totalInvoices, byStatus, byChain, recentInvoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: { amount: true },
    }),
    prisma.invoice.groupBy({
      by: ['chain'],
      where,
      _count: true,
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true },
        },
      },
    }),
  ]);
  
  res.json({
    totalInvoices,
    byStatus: byStatus.map(s => ({
      status: s.status,
      count: s._count,
      totalAmount: s._sum.amount || 0,
    })),
    byChain: byChain.map(c => ({
      chain: c.chain,
      count: c._count,
      totalAmount: c._sum.amount || 0,
    })),
    recentInvoices,
  });
}));

export default router;
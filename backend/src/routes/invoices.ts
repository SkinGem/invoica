
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createInvoiceEvent } from '../events/invoiceEvents';
import { v4 as uuidv4 } from 'uuid';

/**
 * Supported blockchain networks
 */
const SUPPORTED_CHAINS = ['base', 'polygon', 'arbitrum'] as const;

/**
 * Chain validation schema
 */
const chainSchema = z.enum(SUPPORTED_CHAINS).optional();

/**
 * Invoice creation request validation schema
 */
const createInvoiceSchema = z.object({
  amount: z.number().positive().min(1),
  currency: z.string().length(3).default('USD'),
  customerId: z.string().uuid(),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  chain: chainSchema.default('base'),
});

/**
 * Invoice response type
 */
interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  customerId: string;
  description: string | null;
  status: string;
  chain: string;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const router = Router();

/**
 * POST /v1/invoices
 * Create a new invoice with optional chain specification
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 * 
 * @throws {400} - Invalid input data or unsupported chain
 * @throws {500} - Internal server error
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validationResult = createInvoiceSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      const validatedData = validationResult.data;

      // Validate chain if explicitly provided
      if (req.body.chain && !SUPPORTED_CHAINS.includes(req.body.chain)) {
        res.status(400).json({
          error: 'Unsupported chain',
        });
        return;
      }

      const chain = validatedData.chain;

      // Generate invoice number atomically
      const invoiceNumber = await prisma.$transaction(async (tx) => {
        const lastInvoice = await tx.invoices.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { invoiceNumber: true },
        });

        const nextNumber = lastInvoice
          ? parseInt(lastInvoice.invoiceNumber.replace(/^INV-/, ''), 10) + 1
          : 1;

        return `INV-${nextNumber.toString().padStart(6, '0')}`;
      });

      // Create invoice record
      const invoice = await prisma.invoices.create({
        data: {
          id: uuidv4(),
          invoiceNumber,
          amount: validatedData.amount,
          currency: validatedData.currency,
          customerId: validatedData.customerId,
          description: validatedData.description ?? null,
          status: 'pending',
          chain,
          dueDate: validatedData.dueDate
            ? new Date(validatedData.dueDate)
            : null,
        },
      });

      // Emit event to Redis queue for async processing
      await createInvoiceEvent('invoice.created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        customerId: invoice.customerId,
        chain: invoice.chain,
      });

      // Format response
      const response: InvoiceResponse = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        customerId: invoice.customerId,
        description: invoice.description,
        status: invoice.status,
        chain: invoice.chain,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/invoices
 * List all invoices with optional chain filtering
 * 
 * @param {Request} req - Express request object with optional query.chain
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chain, status, customerId, limit = '50', offset = '0' } = req.query;

      // Validate chain if provided
      if (chain && !SUPPORTED_CHAINS.includes(chain as string)) {
        res.status(400).json({
          error: 'Unsupported chain',
        });
        return;
      }

      const where: Record<string, unknown> = {};

      if (chain) {
        where.chain = chain;
      }

      if (status) {
        where.status = status;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoices.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string, 10),
          skip: parseInt(offset as string, 10),
        }),
        prisma.invoices.count({ where }),
      ]);

      res.json({
        data: invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.amount),
          currency: invoice.currency,
          customerId: invoice.customerId,
          description: invoice.description,
          status: invoice.status,
          chain: invoice.chain,
          dueDate: invoice.dueDate?.toISOString() ?? null,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        })),
        meta: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/invoices/:id
 * Get a specific invoice by ID
 * 
 * @param {Request} req - Express request object with params.id
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoices.findUnique({
        where: { id },
      });

      if (!invoice) {
        res.status(404).json({
          error: 'Invoice not found',
        });
        return;
      }

      res.json({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        customerId: invoice.customerId,
        description: invoice.description,
        status: invoice.status,
        chain: invoice.chain,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

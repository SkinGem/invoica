import { Request, Response } from 'express';
import { z } from 'zod';
import { createPendingInvoice } from '../services/invoice';

const BLACKLISTED_DOMAINS = [
  'out.ndlz.net',
  'example.com',
  'test.com',
  'fakeinbox.com',
  'mailinator.com',
  'throwaway.email',
] as const;

export const createInvoiceSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
});

type CreateInvoiceBody = z.infer<typeof createInvoiceSchema>;

/**
 * Extracts domain from an email address
 * @param email - The email address to extract domain from
 * @returns The domain part of the email or null if invalid
 */
function extractDomainFromEmail(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Checks if an email domain is blacklisted
 * @param email - The email address to check
 * @returns True if the domain is blacklisted, false otherwise
 */
function isDomainBlacklisted(email: string): boolean {
  const domain = extractDomainFromEmail(email);
  if (!domain) {
    return false;
  }
  return BLACKLISTED_DOMAINS.includes(domain as typeof BLACKLISTED_DOMAINS[number]);
}

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const parseResult = createInvoiceSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.issues });
    return;
  }

  const { customerEmail } = parseResult.data;

  // Check if email domain is blacklisted
  if (isDomainBlacklisted(customerEmail)) {
    const domain = extractDomainFromEmail(customerEmail);
    res.status(400).json({
      error: 'Invoice rejected',
      message: `Invoices from ${domain} domain are not allowed. Please use a valid business email address.`,
    });
    return;
  }

  try {
    const invoice = await createPendingInvoice(parseResult.data);
    res.status(201).json({
      id: invoice.id,
      number: 'INV-' + invoice.invoiceNumber,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status.toLowerCase(),
      customerEmail: invoice.customerEmail,
      customerName: invoice.customerName,
      createdAt: invoice.createdAt.toISOString(),
      paidAt: null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
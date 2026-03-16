jest.mock('../../services/invoice', () => ({
  createPendingInvoice: jest.fn(),
}));

import { Request, Response } from 'express';
import { createInvoice } from '../invoices-create';
import { createPendingInvoice } from '../../services/invoice';

const mockCreate = createPendingInvoice as jest.Mock;

const VALID_BODY = {
  amount: 50,
  currency: 'USDC',
  customerEmail: 'buyer@acme.com',
  customerName: 'Alice',
};

const FAKE_INVOICE = {
  id: 'inv-001',
  invoiceNumber: '0042',
  amount: 50,
  currency: 'USDC',
  status: 'PENDING',
  customerEmail: 'buyer@acme.com',
  customerName: 'Alice',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

function makeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(body: object): Request {
  return { body } as unknown as Request;
}

beforeEach(() => jest.clearAllMocks());

describe('createInvoice handler', () => {
  it('returns 400 with details when body is empty', async () => {
    const res = makeRes();
    await createInvoice(makeReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ details: expect.any(Array) }));
  });

  it('returns 400 for invalid EVM payment address on base chain', async () => {
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, chain: 'base', paymentAddress: 'not-an-address' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('Invalid payment address');
  });

  it('returns 400 for invalid Solana payment address on solana chain', async () => {
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, chain: 'solana', paymentAddress: '0xinvalid' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('Invalid payment address');
    expect(body.message).toContain('Solana');
  });

  it('returns 400 when programId is not the SPL Token Program on Solana', async () => {
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, chain: 'solana', programId: 'SomeOtherProgramXXXXXXXXXXXXXXXXXXXXXXXXXXX' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('Invalid programId');
  });

  it('returns 400 when tokenMint is not USDC on Solana', async () => {
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, chain: 'solana', tokenMint: 'SomeOtherMint1111111111111111111111111111111' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('Invalid tokenMint');
  });

  it('returns 400 when programId is provided for non-Solana chain', async () => {
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, chain: 'base', programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('only valid for Solana');
  });

  it('returns 403 when merchant email domain is blacklisted', async () => {
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, merchant: { email: 'spammer@mailinator.com', name: 'Bad Actor' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('Invoice rejected');
    expect(body.message).toContain('mailinator.com');
  });

  it('returns 201 with invoice data on successful creation', async () => {
    mockCreate.mockResolvedValueOnce(FAKE_INVOICE);
    const res = makeRes();
    await createInvoice(makeReq(VALID_BODY), res);
    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.id).toBe('inv-001');
    expect(body.number).toBe('INV-0042');
    expect(body.amount).toBe(50);
    expect(body.status).toBe('pending');
    expect(body.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('injects default Solana programId and tokenMint when not provided', async () => {
    mockCreate.mockResolvedValueOnce(FAKE_INVOICE);
    const res = makeRes();
    await createInvoice(makeReq({ ...VALID_BODY, chain: 'solana' }), res);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.paymentDetails.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    expect(callArgs.paymentDetails.tokenMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  it('returns 500 when createPendingInvoice throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB connection failed'));
    const res = makeRes();
    await createInvoice(makeReq(VALID_BODY), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toBe('Internal server error');
  });
});

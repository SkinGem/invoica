import {
  AppError,
  ValidationError,
  NotFoundError,
  InvoiceNotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../errors';

describe('AppError', () => {
  const err = new AppError(500, 'Something went wrong', 'INTERNAL_ERROR');

  it('stores statusCode', () => {
    expect(err.statusCode).toBe(500);
  });

  it('stores message', () => {
    expect(err.message).toBe('Something went wrong');
  });

  it('stores code', () => {
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('isOperational is true', () => {
    expect(err.isOperational).toBe(true);
  });

  it('is instance of Error', () => {
    expect(err).toBeInstanceOf(Error);
  });

  it('name is AppError', () => {
    expect(err.name).toBe('AppError');
  });
});

describe('ValidationError', () => {
  const err = new ValidationError('field is required');

  it('statusCode is 400', () => {
    expect(err.statusCode).toBe(400);
  });

  it('code is VALIDATION_ERROR', () => {
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('stores custom message', () => {
    expect(err.message).toBe('field is required');
  });
});

describe('NotFoundError', () => {
  it('uses default message when none provided', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
  });

  it('uses custom message when provided', () => {
    const err = new NotFoundError('Agent not found');
    expect(err.message).toBe('Agent not found');
  });
});

describe('InvoiceNotFoundError', () => {
  const err = new InvoiceNotFoundError();

  it('statusCode is 404', () => {
    expect(err.statusCode).toBe(404);
  });

  it('code is INVOICE_NOT_FOUND', () => {
    expect(err.code).toBe('INVOICE_NOT_FOUND');
  });

  it('default message is Invoice not found', () => {
    expect(err.message).toBe('Invoice not found');
  });
});

describe('UnauthorizedError', () => {
  const err = new UnauthorizedError();

  it('statusCode is 401', () => {
    expect(err.statusCode).toBe(401);
  });

  it('code is UNAUTHORIZED', () => {
    expect(err.code).toBe('UNAUTHORIZED');
  });
});

describe('ForbiddenError', () => {
  const err = new ForbiddenError();

  it('statusCode is 403', () => {
    expect(err.statusCode).toBe(403);
  });

  it('code is FORBIDDEN', () => {
    expect(err.code).toBe('FORBIDDEN');
  });
});

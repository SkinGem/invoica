import { getDashboardActivity } from '../dashboard-activity';
import { Request, Response } from 'express';

function makeRes(): { json: jest.Mock } {
  return { json: jest.fn() };
}

describe('getDashboardActivity', () => {
  it('calls res.json once', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('returns an array', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    const data = res.json.mock.calls[0][0];
    expect(Array.isArray(data)).toBe(true);
  });

  it('returns 4 activity items', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    expect(res.json.mock.calls[0][0]).toHaveLength(4);
  });

  it('each item has id, title, description, status, timestamp', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    const items = res.json.mock.calls[0][0];
    for (const item of items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('timestamp');
    }
  });

  it('status values are valid (success or failed)', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    const items = res.json.mock.calls[0][0];
    for (const item of items) {
      expect(['success', 'pending', 'failed']).toContain(item.status);
    }
  });

  it('timestamps are valid ISO strings', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    const items = res.json.mock.calls[0][0];
    for (const item of items) {
      expect(new Date(item.timestamp).toISOString()).toBe(item.timestamp);
    }
  });

  it('contains a failed item (webhook delivery)', async () => {
    const req = {} as Request;
    const res = makeRes();
    await getDashboardActivity(req, res as unknown as Response);
    const items = res.json.mock.calls[0][0];
    const failed = items.filter((i: { status: string }) => i.status === 'failed');
    expect(failed.length).toBeGreaterThanOrEqual(1);
  });
});

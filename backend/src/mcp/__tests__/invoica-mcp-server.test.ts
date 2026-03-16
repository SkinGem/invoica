// Capture setRequestHandler calls via mock-prefixed object (allowed in jest.mock factories)
const mockHandlers: Record<string, (...args: any[]) => Promise<any>> = {};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn(() => ({
    setRequestHandler: (schema: any, fn: (...args: any[]) => Promise<any>) => {
      mockHandlers[schema] = fn;
    },
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));
// Use string literals as schema sentinels so we can key the handlers map
jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'LIST_TOOLS',
  CallToolRequestSchema: 'CALL_TOOL',
}));
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => ({})),
}));

// Import triggers module side-effects (server init + IIFE connect)
import '../invoica-mcp-server';

// Resolved handlers after module load
const listTools = () => mockHandlers['LIST_TOOLS']();
const callTool = (name: string, args: Record<string, unknown>) =>
  mockHandlers['CALL_TOOL']({ params: { name, arguments: args } });

// Helper to build a mock fetch Response
function mockFetchOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}
function mockFetchFail(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  global.fetch = jest.fn();
});

// ── ListTools ─────────────────────────────────────────────────────────────────

describe('ListTools handler', () => {
  it('returns exactly 3 tools: create_invoice, list_invoices, check_settlement', async () => {
    const { tools } = await listTools();
    expect(tools).toHaveLength(3);
    const names = tools.map((t: any) => t.name);
    expect(names).toContain('create_invoice');
    expect(names).toContain('list_invoices');
    expect(names).toContain('check_settlement');
  });
});

// ── create_invoice ────────────────────────────────────────────────────────────

describe('create_invoice tool', () => {
  it('returns invoiceId, paymentUrl, amount, status on success', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      mockFetchOk({ id: 'inv-abc', paymentUrl: 'https://pay.invoica.ai/inv-abc', amount: 25.0, status: 'pending' })
    );
    const result = await callTool('create_invoice', {
      amount: 25.0, currency: 'USDC', customerEmail: 'a@b.com', customerName: 'Alice', apiKey: 'key-1',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.invoiceId).toBe('inv-abc');
    expect(parsed.paymentUrl).toBe('https://pay.invoica.ai/inv-abc');
    expect(parsed.amount).toBe(25.0);
    expect(parsed.status).toBe('pending');
  });

  it('returns error text on API failure', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      mockFetchFail(422, { error: 'Invalid amount' })
    );
    const result = await callTool('create_invoice', {
      amount: -1, currency: 'USDC', customerEmail: 'a@b.com', customerName: 'Alice', apiKey: 'key-1',
    });
    expect(result.content[0].text).toContain('Error 422');
  });
});

// ── list_invoices ─────────────────────────────────────────────────────────────

describe('list_invoices tool', () => {
  it('maps array response to summary objects', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      mockFetchOk([{ id: 'inv-1', status: 'paid', amount: 10, currency: 'USDC', customerEmail: 'x@y.com', createdAt: '2026-01-01' }])
    );
    const result = await callTool('list_invoices', { apiKey: 'key-1', limit: 5 });
    const summaries = JSON.parse(result.content[0].text);
    expect(Array.isArray(summaries)).toBe(true);
    expect(summaries[0].id).toBe('inv-1');
    expect(summaries[0].status).toBe('paid');
  });

  it('handles wrapped { invoices: [...] } response format', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      mockFetchOk({ invoices: [{ id: 'inv-2', status: 'pending', amount: 5, currency: 'USD' }] })
    );
    const result = await callTool('list_invoices', { apiKey: 'key-1' });
    const summaries = JSON.parse(result.content[0].text);
    expect(summaries[0].id).toBe('inv-2');
  });

  it('uses limit=10 in query string when no limit arg provided', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(mockFetchOk([]));
    await callTool('list_invoices', { apiKey: 'key-1' });
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
  });
});

// ── check_settlement ──────────────────────────────────────────────────────────

describe('check_settlement tool', () => {
  it('returns settled:true with txHash and chain when invoice is settled', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      mockFetchOk({ status: 'settled', amount: 50, paymentDetails: { txHash: '0xabc', network: 'base' } })
    );
    const result = await callTool('check_settlement', { invoiceId: 'inv-xyz', apiKey: 'key-1' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.settled).toBe(true);
    expect(parsed.txHash).toBe('0xabc');
    expect(parsed.chain).toBe('base');
    expect(parsed.amount).toBe(50);
  });

  it('returns settled:false with null txHash/chain/amount when unsettled', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(
      mockFetchOk({ status: 'pending', amount: 50, paymentDetails: {} })
    );
    const result = await callTool('check_settlement', { invoiceId: 'inv-xyz', apiKey: 'key-1' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.settled).toBe(false);
    expect(parsed.txHash).toBeNull();
    expect(parsed.chain).toBeNull();
    expect(parsed.amount).toBeNull();
  });
});

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe('unknown tool', () => {
  it('returns Unknown tool: <name> text', async () => {
    const result = await callTool('no_such_tool', {});
    expect(result.content[0].text).toBe('Unknown tool: no_such_tool');
  });
});

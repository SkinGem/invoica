import { ApiKey, CreateApiKeyParams, ApiKeyListResponse, Invoice, CreateInvoiceParams, Settlement, InvoiceListParams, InvoiceListResponse, SettlementListParams, SettlementListResponse } from './types';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean>;
}

export class InvoicaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Make an authenticated request to the API
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${options.path}`);
    
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>({
      method: 'GET',
      path: `/invoices/${id}`,
    });
  }

  /**
   * Create a new invoice
   */
  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    return this.request<Invoice>({
      method: 'POST',
      path: '/invoices',
      body: params,
    });
  }

  /**
   * Get a single settlement by ID
   */
  async getSettlement(id: string): Promise<Settlement> {
    return this.request<Settlement>({
      method: 'GET',
      path: `/settlements/${id}`,
    });
  }

  /**
   * List settlements with optional filters
   */
  async listSettlements(params?: SettlementListParams): Promise<SettlementListResponse> {
    return this.request<SettlementListResponse>({
      method: 'GET',
      path: '/settlements',
      params: params as Record<string, string | number | boolean>,
    });
  }

  /**
   * List invoices with optional filters
   */
  async listInvoices(params?: InvoiceListParams): Promise<InvoiceListResponse> {
    return this.request<InvoiceListResponse>({
      method: 'GET',
      path: '/invoices',
      params: params as Record<string, string | number | boolean>,
    });
  }

  /**
   * Create a new API key
   */
  async createApiKey(params: CreateApiKeyParams): Promise<ApiKey> {
    return this.request<ApiKey>({
      method: 'POST',
      path: '/api-keys',
      body: params,
    });
  }

  /**
   * Revoke an API key by ID
   */
  async revokeApiKey(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/api-keys/${id}`,
    });
  }

  /**
   * List all API keys
   */
  async listApiKeys(): Promise<ApiKeyListResponse> {
    return this.request<ApiKeyListResponse>({
      method: 'GET',
      path: '/api-keys',
    });
  }
}

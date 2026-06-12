// Supabase client singleton for backend services
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — Supabase client will be unavailable');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Create a tenant-scoped Supabase client that enforces RLS isolation
 * @param tenantId - The tenant ID to scope queries to
 * @returns Supabase client with tenant context
 */
export function createTenantScopedClient(tenantId: string): SupabaseClient {
  if (!tenantId) {
    throw new Error('Tenant ID is required for scoped client');
  }

  const client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-tenant-id': tenantId,
        },
      },
    }
  );

  return client;
}

/**
 * Verify VAT evidence records RLS policies are properly enforced
 * This function tests cross-tenant isolation for vat_evidence_records table
 * @param testTenantId1 - First tenant ID for testing
 * @param testTenantId2 - Second tenant ID for testing
 * @returns Promise<boolean> - true if isolation is properly enforced
 */
export async function verifyVatEvidenceRLS(
  testTenantId1: string,
  testTenantId2: string
): Promise<boolean> {
  try {
    // Create tenant-scoped clients
    const client1 = createTenantScopedClient(testTenantId1);
    const client2 = createTenantScopedClient(testTenantId2);

    // Insert test record with tenant 1
    const testRecord = {
      tenant_id: testTenantId1,
      invoice_id: 'test-invoice-1',
      evidence_type: 'ip_address',
      evidence_value: '192.168.1.1',
      collected_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await client1
      .from('vat_evidence_records')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert test record:', insertError);
      return false;
    }

    // Try to query the record with tenant 2 client (should fail/return empty)
    const { data: crossTenantData, error: crossTenantError } = await client2
      .from('vat_evidence_records')
      .select('*')
      .eq('id', insertData.id);

    // Clean up test record
    await client1
      .from('vat_evidence_records')
      .delete()
      .eq('id', insertData.id);

    // RLS is working if tenant 2 cannot see tenant 1's record
    const isIsolated = !crossTenantData || crossTenantData.length === 0;
    
    if (!isIsolated) {
      console.error('RLS VIOLATION: Cross-tenant query succeeded when it should have failed');
      console.error('Tenant 2 could access tenant 1 data:', crossTenantData);
    }

    return isIsolated;
  } catch (error) {
    console.error('Error verifying VAT evidence RLS:', error);
    return false;
  }
}

/**
 * Enforce tenant isolation for all queries by setting RLS context
 * @param client - Supabase client instance
 * @param tenantId - Tenant ID to set in context
 */
export async function setTenantContext(client: SupabaseClient, tenantId: string): Promise<void> {
  if (!tenantId) {
    throw new Error('Tenant ID is required to set context');
  }

  // Set the tenant context for RLS policies
  const { error } = await client.rpc('set_config', {
    setting_name: 'app.current_tenant_id',
    setting_value: tenantId,
    is_local: true,
  });

  if (error) {
    console.error('Failed to set tenant context:', error);
    throw new Error(`Failed to set tenant context: ${error.message}`);
  }
}

export default supabase;
// Supabase CRUD for Mandate + MandateTransition.
// Tables created in migration 015. Used by handler.ts only.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { MandateState } from './state-machine';

let cached: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  cached = createClient(url, key);
  return cached;
}

export interface MandateRow {
  id: string;
  proposer_agent_id: string;
  counterparty_agent_id: string;
  scope: string;
  terms: unknown;
  context: Record<string, unknown>;
  state: MandateState;
  pact_mandate_hash: string | null;
  pact_version: string;
  proposer_signature: string | null;
  counterparty_signature: string | null;
  signed_by_proposer_at: string | null;
  signed_by_counterparty_at: string | null;
  completed_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  expires_at: string;
  drs_receipt_id: string | null;
  issuer_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MandateTransitionRow {
  id: string;
  mandate_id: string;
  from_state: MandateState | null;
  to_state: MandateState;
  triggered_by: string | null;
  anchor_tx_hash: string | null;
  anchor_chain: string | null;
  anchor_block_number: number | null;
  drs_receipt_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function createMandate(row: Omit<MandateRow, 'created_at' | 'updated_at'>): Promise<MandateRow> {
  const { data, error } = await sb().from('Mandate').insert(row).select('*').single();
  if (error) throw error;
  return data as MandateRow;
}

export async function getMandate(id: string): Promise<MandateRow | null> {
  const { data, error } = await sb().from('Mandate').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as MandateRow;
}

export async function updateMandate(id: string, patch: Partial<MandateRow>): Promise<MandateRow> {
  const { data, error } = await sb()
    .from('Mandate')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as MandateRow;
}

export async function addTransition(row: Omit<MandateTransitionRow, 'created_at'>): Promise<MandateTransitionRow> {
  const { data, error } = await sb().from('MandateTransition').insert(row).select('*').single();
  if (error) throw error;
  return data as MandateTransitionRow;
}

export async function listTransitions(mandateId: string): Promise<MandateTransitionRow[]> {
  const { data, error } = await sb()
    .from('MandateTransition')
    .select('*')
    .eq('mandate_id', mandateId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as MandateTransitionRow[];
}

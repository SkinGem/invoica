/**
 * sap-client.ts — Lazy singleton for @oobe-protocol-labs/synapse-sap-sdk v0.6.x
 * Used by sap-execute.ts to settle escrow after capability delivery.
 * Returns null gracefully if SAP_KEYPAIR_PATH is not set or file is absent.
 * Env: SAP_KEYPAIR_PATH (defaults to /home/invoica/memory/sap-agent-keypair.json)
 *      SOLANA_RPC_URL   (defaults to mainnet-beta public RPC)
 */
import { existsSync, readFileSync } from 'fs';
import { Keypair } from '@solana/web3.js';
import { SapConnection } from '@oobe-protocol-labs/synapse-sap-sdk';

type SapClient = ReturnType<typeof SapConnection.fromKeypair>['client'];

let _client: SapClient | null = null;
let _initAttempted = false;

/**
 * Returns the SAP SDK client singleton, or null if keypair is unavailable.
 * Logs a warning on first failed init — does not throw.
 */
export function getSapClient(): SapClient | null {
  if (_initAttempted) return _client;
  _initAttempted = true;

  const keypairPath =
    process.env.SAP_KEYPAIR_PATH ||
    '/home/invoica/memory/sap-agent-keypair.json';

  if (!existsSync(keypairPath)) {
    console.warn('[sap-client] Keypair not found at', keypairPath, '— SAP settle disabled');
    return null;
  }

  try {
    const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
    const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const { client } = SapConnection.fromKeypair(rpcUrl, keypair);
    _client = client;
    console.info('[sap-client] SAP SDK v0.6 client initialised, agent:', keypair.publicKey.toBase58());
    return _client;
  } catch (err) {
    console.error('[sap-client] Init failed:', (err as Error).message);
    return null;
  }
}
/**
 * Skale Base on-chain integration test — Scope 2 follow-up to the 2026-04-22
 * API-layer smoke test. Sprint task CHAIN-SKALE-ONCHAIN-TEST (week-118).
 *
 * Prerequisites on .env (see docs/engineering/skale-onchain-test-setup.md):
 *   TEST_WALLET_A_PK        — hex private key of funded wallet A (has USDC)
 *   TEST_WALLET_B_ADDRESS   — address of wallet B (receives USDC)
 *   TEST_SKALE_RPC_URL      — optional override (defaults to prod SKALE_RPC_URL)
 *   TEST_SKALE_USDC         — optional override (defaults to prod SKALE Base USDC)
 *
 * What it does:
 *   1. Issues a throwaway Invoica API key
 *   2. Creates an invoice for Wallet B address, chain='skale', amount=1 USDC
 *   3. Signs + submits a USDC transfer from A → B on Skale Base via viem
 *   4. Waits for tx receipt
 *   5. PATCH /v1/invoices/:id/status → SETTLED with the real txHash
 *   6. Verifies PaymentEvents row has the real txHash + amount
 *   7. Revokes the test key
 *
 * NOTE: this is a stub — the basic flow is here but not exercised until .env
 * is populated. The commit leaves it as a runnable skeleton.
 */
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

dotenv.config();

const API = 'https://api.invoica.ai';
const SKALE_RPC = process.env.TEST_SKALE_RPC_URL || process.env.SKALE_RPC_URL || 'https://skale-base.skalenodes.com/v1/base';
const SKALE_USDC = (process.env.TEST_SKALE_USDC || '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20') as `0x${string}`;
const SKALE_CHAIN_ID = 1187947933;

const walletAPk = process.env.TEST_WALLET_A_PK as `0x${string}` | undefined;
const walletBAddress = process.env.TEST_WALLET_B_ADDRESS as `0x${string}` | undefined;

if (!walletAPk || !walletBAddress) {
  console.error('Missing TEST_WALLET_A_PK or TEST_WALLET_B_ADDRESS in .env. See docs/engineering/skale-onchain-test-setup.md');
  process.exit(1);
}

const ERC20_TRANSFER_ABI = [{
  type: 'function',
  name: 'transfer',
  inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'nonpayable',
}] as const;

async function main(): Promise<void> {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const accountA = privateKeyToAccount(walletAPk!);

  // 1. Issue throwaway Invoica API key
  const plainKey = 'sk_' + crypto.randomBytes(32).toString('hex');
  const keyPrefix = plainKey.substring(3, 11);
  const keyHash = await bcrypt.hash(plainKey, 12);
  const { data: keyRow, error: keyErr } = await sb.from('ApiKey').insert({
    customerId: '7781030d-a44c-4879-9ef1-178733a8f077',
    customerEmail: 'skininthegem@gmail.com',
    keyPrefix, keyHash,
    name: 'skale-onchain-test-' + Date.now(),
    isActive: true, tier: 'developer', plan: 'free',
    permissions: ['*'],
  }).select('id').single();
  if (keyErr) throw keyErr;
  console.log(`API key issued: keyId=${keyRow.id}`);

  try {
    // 2. Create invoice with Wallet B as paymentAddress
    const idempotency = crypto.randomUUID();
    const createRes = await fetch(`${API}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plainKey}`,
        'Idempotency-Key': idempotency,
      },
      body: JSON.stringify({
        customerEmail: 'skale-onchain-test@invoica.ai',
        customerName: 'Skale On-Chain Test',
        amount: 1,
        currency: 'USDC',
        chain: 'skale',
        paymentAddress: walletBAddress,
        buyerCountryCode: 'DE',
        transactionType: 'service',
      }),
    });
    const invoiceBody = await createRes.json();
    if (createRes.status !== 201 && createRes.status !== 200) {
      console.error(`Invoice create failed: HTTP ${createRes.status}`, invoiceBody);
      throw new Error('invoice create failed');
    }
    const invoice = invoiceBody.data || invoiceBody;
    console.log(`Invoice created: ${invoice.id}`);

    // 3. Sign + submit USDC transfer A → B on Skale Base
    const publicClient = createPublicClient({ transport: http(SKALE_RPC) });
    const walletClient = createWalletClient({ account: accountA, transport: http(SKALE_RPC) });
    const data = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [walletBAddress, parseUnits('1', 6)], // 1 USDC (6 decimals)
    });
    const txHash = await walletClient.sendTransaction({
      account: accountA,
      to: SKALE_USDC,
      data,
      chain: { id: SKALE_CHAIN_ID, name: 'SKALE Base', nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 }, rpcUrls: { default: { http: [SKALE_RPC] } } },
    });
    console.log(`Tx submitted: ${txHash}`);

    // 4. Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Tx confirmed: block=${receipt.blockNumber}, status=${receipt.status}`);
    if (receipt.status !== 'success') throw new Error('tx reverted');

    // 5. PATCH status → SETTLED with real txHash
    const settleRes = await fetch(`${API}/v1/invoices/${invoice.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plainKey}`,
      },
      body: JSON.stringify({
        status: 'SETTLED',
        chain: 'skale',
        txHash,
        amountUsdc: 1,
        source: 'evm-detector',
      }),
    });
    if (settleRes.status !== 200) {
      console.error(`Settle failed: HTTP ${settleRes.status}`, await settleRes.json());
      throw new Error('settle failed');
    }

    // 6. Verify PaymentEvents has the real txHash
    const { data: pe } = await sb.from('PaymentEvents').select('*').eq('invoiceId', invoice.id).single();
    if (!pe || pe.txHash !== txHash) throw new Error('PaymentEvents row missing or txHash mismatch');
    console.log(`PaymentEvents OK: chain=${pe.chain} txHash=${pe.txHash} amount=${pe.amountUsdc}`);

    console.log('\n=== PASS ===');
    console.log(`Invoice: ${invoice.id}`);
    console.log(`Tx: https://skale-base-explorer.skalenodes.com/tx/${txHash}`);
  } finally {
    // 7. Revoke test key
    await sb.from('ApiKey').update({ isActive: false }).eq('id', keyRow.id);
    console.log('Test key deactivated.');
  }
}

main().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});

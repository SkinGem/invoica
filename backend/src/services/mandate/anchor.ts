// MandateAnchor on-chain wrapper. Calls anchor(bytes32, string) on
// the Base Sepolia contract deployed for PACT Mandate API v0.1.
//
// Contract source: contracts/MandateAnchor.sol
// Deployed:        env MANDATE_ANCHOR_ADDRESS
// Signer:          env MANDATE_ANCHOR_SIGNER_PRIVATE_KEY

import { createPublicClient, createWalletClient, http, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const ABI: Abi = [
  {
    type: 'event',
    name: 'MandateAnchored',
    inputs: [
      { name: 'mandateHash', type: 'bytes32', indexed: true },
      { name: 'state', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'sender', type: 'address', indexed: true },
    ],
  },
  {
    type: 'function',
    name: 'anchor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'mandateHash', type: 'bytes32' },
      { name: 'state', type: 'string' },
    ],
    outputs: [],
  },
];

export interface AnchorResult {
  txHash: `0x${string}`;
  blockNumber: bigint;
  chain: string;
}

let cachedClients: { publicClient: any; walletClient: any; contractAddress: `0x${string}` } | null = null;

function getClients() {
  if (cachedClients) return cachedClients;

  const contractAddress = process.env.MANDATE_ANCHOR_ADDRESS as `0x${string}` | undefined;
  const pk = process.env.MANDATE_ANCHOR_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

  if (!contractAddress) throw new Error('MANDATE_ANCHOR_ADDRESS not configured');
  if (!pk) throw new Error('MANDATE_ANCHOR_SIGNER_PRIVATE_KEY not configured');

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

  cachedClients = { publicClient, walletClient, contractAddress };
  return cachedClients;
}

/**
 * Emit MandateAnchored event for a state transition. Idempotent on the
 * caller side (we don't dedupe — each call mines a new tx). Caller should
 * skip the anchor if the transition was already recorded with a tx hash.
 */
export async function anchorMandateState(
  mandateHash: `0x${string}`,
  state: string,
): Promise<AnchorResult> {
  const { publicClient, walletClient, contractAddress } = getClients();

  const txHash: `0x${string}` = await walletClient.writeContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'anchor',
    args: [mandateHash, state],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error(`MandateAnchor.anchor() tx failed: ${txHash}`);
  }

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    chain: 'base-sepolia',
  };
}

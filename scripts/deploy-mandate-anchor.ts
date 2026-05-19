// Deploy MandateAnchor.sol to Base Sepolia.
//
// One-shot deploy script for PACT Mandate API v0.1 (Helixa build).
// Compiles contracts/MandateAnchor.sol with solc, deploys with viem.
//
// Prereqs (one-time):
//   npm install --save-dev solc
//
// Run:
//   MANDATE_DEPLOYER_PRIVATE_KEY=0x... npx ts-node scripts/deploy-mandate-anchor.ts
//
// Output: prints the deployed address. Persist it as
// MANDATE_ANCHOR_ADDRESS in backend/.env for the routes to use.

import * as fs from 'fs';
import * as path from 'path';
import { createPublicClient, createWalletClient, http, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Lazy-require solc so this file still typechecks if solc isn't installed yet.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const solc: any = require('solc');

function compileMandateAnchor(): { abi: Abi; bytecode: `0x${string}` } {
  const sourcePath = path.resolve(__dirname, '..', 'contracts', 'MandateAnchor.sol');
  const source = fs.readFileSync(sourcePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'MandateAnchor.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === 'error');
    if (fatal.length > 0) {
      console.error(JSON.stringify(fatal, null, 2));
      throw new Error('Solidity compilation failed');
    }
  }

  const contract = output.contracts['MandateAnchor.sol']['MandateAnchor'];
  return {
    abi: contract.abi as Abi,
    bytecode: `0x${contract.evm.bytecode.object}` as `0x${string}`,
  };
}

async function main() {
  const pk = process.env.MANDATE_DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    console.error('Set MANDATE_DEPLOYER_PRIVATE_KEY (hex with 0x prefix). Need ~0.005 ETH on Base Sepolia.');
    process.exit(1);
  }

  const { abi, bytecode } = compileMandateAnchor();
  console.log(`[compile] ABI: ${abi.length} entries, bytecode: ${bytecode.length / 2} bytes`);

  const account = privateKeyToAccount(pk);
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`[deploy] from=${account.address} balance=${Number(balance) / 1e18} ETH`);

  if (balance < 1_000_000_000_000_000n) {
    console.error('Deployer balance < 0.001 ETH. Fund via https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  console.log('[deploy] sending deployment tx...');
  // Cast: viem's narrow chain typing fights with the dynamic abi shape; safe here for one-shot deploy.
  const txHash = await (walletClient as any).deployContract({ abi, bytecode });
  console.log(`[deploy] tx=${txHash}`);

  console.log('[deploy] waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success' || !receipt.contractAddress) {
    console.error('Deployment failed:', receipt);
    process.exit(1);
  }

  console.log(`\n=== MandateAnchor deployed ===`);
  console.log(`Address: ${receipt.contractAddress}`);
  console.log(`Block:   ${receipt.blockNumber}`);
  console.log(`Tx:      ${txHash}`);
  console.log(`Explorer: https://sepolia.basescan.org/address/${receipt.contractAddress}`);
  console.log(`\nAdd to backend/.env:`);
  console.log(`MANDATE_ANCHOR_ADDRESS=${receipt.contractAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

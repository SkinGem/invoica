import { ChainConfig } from '../../lib/chain-registry';

const USDC_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface SettlementMatch {
  invoiceId: string;
  txHash: string;
  amount: number;
  from: string;
  to: string;
  blockNumber: number;
  timestamp: number;
  chain: string;
}

export class EvmSettlementDetector {
  constructor(private chain: ChainConfig) {}

  private async rpc(method: string, params: unknown[] = []): Promise<unknown> {
    const res = await fetch(this.chain.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result;
  }

  async getLatestBlock(): Promise<number> {
    return parseInt((await this.rpc('eth_blockNumber')) as string, 16);
  }

  async scanTransfersToAddress(
    recipientAddress: string,
    fromBlock: string | number = 'latest',
    toBlock: string | number = 'latest'
  ): Promise<SettlementMatch[]> {
    const from = typeof fromBlock === 'number' ? `0x${fromBlock.toString(16)}` : fromBlock;
    const to = typeof toBlock === 'number' ? `0x${toBlock.toString(16)}` : toBlock;
    const recipientPadded = recipientAddress.slice(2).padStart(64, '0');

    const logs = (await this.rpc('eth_getLogs', [{
      address: this.chain.usdcAddress,
      topics: [USDC_TRANSFER_TOPIC, null, `0x${recipientPadded}`],
      fromBlock: from,
      toBlock: to,
    }])) as Array<{ topics: string[]; data: string; blockNumber: string; transactionHash: string }>;

    const matches: SettlementMatch[] = [];
    for (const log of logs) {
      const fromAddr = `0x${log.topics[1].slice(-40)}`;
      const toAddr = `0x${log.topics[2].slice(-40)}`;
      const amount = Number(BigInt(log.data)) / 1e6;
      const blockNum = parseInt(log.blockNumber, 16);
      const block = (await this.rpc('eth_getBlockByNumber', [log.blockNumber, false])) as { timestamp: string };

      matches.push({
        invoiceId: '',
        txHash: log.transactionHash,
        amount,
        from: fromAddr,
        to: toAddr,
        blockNumber: blockNum,
        timestamp: parseInt(block.timestamp, 16),
        chain: this.chain.name,
      });
    }
    return matches;
  }

  async verifyTransfer(txHash: string, expectedRecipient: string, expectedAmount: number): Promise<boolean> {
    const receipt = (await this.rpc('eth_getTransactionReceipt', [txHash])) as {
      logs: Array<{ address: string; topics: string[]; data: string }>;
    } | null;
    if (!receipt) return false;

    const usdcLower = this.chain.usdcAddress.toLowerCase();
    const expectedRecipientLower = expectedRecipient.toLowerCase();
    const expectedAmountRaw = BigInt(Math.round(expectedAmount * 1e6));

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== usdcLower) continue;
      if (log.topics[0] !== USDC_TRANSFER_TOPIC) continue;

      const to = `0x${log.topics[2].slice(-40)}`.toLowerCase();
      if (to !== expectedRecipientLower) continue;

      const amount = BigInt(log.data);
      if (amount === expectedAmountRaw) return true;
    }
    return false;
  }
}
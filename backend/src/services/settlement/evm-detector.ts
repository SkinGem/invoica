import { ChainConfig } from '../../config/chains';

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

interface RpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface EthLog {
  blockNumber: string;
  transactionHash: string;
  topics: string[];
  data: string;
  address: string;
}

interface EthBlock {
  timestamp: string;
  number: string;
}

interface TransactionReceipt {
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  status: string;
  blockNumber: string;
}

export class EvmSettlementDetector {
  constructor(private chain: ChainConfig) {}

  private async rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.chain.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    });
    
    if (!res.ok) {
      throw new Error(`RPC request failed: ${res.status} ${res.statusText}`);
    }
    
    const json = await res.json() as RpcResponse<T>;
    if (json.error) {
      throw new Error(`RPC error: ${json.error.message}`);
    }
    
    if (json.result === undefined) {
      throw new Error('RPC response missing result');
    }
    
    return json.result;
  }

  async getLatestBlock(): Promise<number> {
    const block = await this.rpc<string>('eth_blockNumber', []);
    return parseInt(block, 16);
  }

  async scanTransfersToAddress(
    recipientAddress: string,
    fromBlock: string | number = 'latest',
    toBlock: string | number = 'latest'
  ): Promise<SettlementMatch[]> {
    const addrPadded = recipientAddress.toLowerCase().replace('0x', '').padStart(64, '0');
    const logs = await this.rpc<EthLog[]>('eth_getLogs', [{
      address: this.chain.usdcAddress,
      fromBlock: typeof fromBlock === 'number' ? `0x${fromBlock.toString(16)}` : fromBlock,
      toBlock: typeof toBlock === 'number' ? `0x${toBlock.toString(16)}` : toBlock,
      topics: [USDC_TRANSFER_TOPIC, null, `0x${addrPadded}`]
    }]);

    const matches: SettlementMatch[] = [];
    for (const log of logs) {
      const block = await this.rpc<EthBlock | null>('eth_getBlockByNumber', [log.blockNumber, false]);
      
      // Convert amount using chain-specific decimals
      const rawAmount = BigInt(log.data);
      const decimals = this.chain.usdcDecimals || 6;
      const amount = Number(rawAmount) / Math.pow(10, decimals);
      
      matches.push({
        invoiceId: '',
        txHash: log.transactionHash,
        amount,
        from: `0x${log.topics[1].slice(-40)}`,
        to: `0x${log.topics[2].slice(-40)}`,
        blockNumber: parseInt(log.blockNumber, 16),
        timestamp: block ? parseInt(block.timestamp, 16) : 0,
        chain: this.chain.id.toString()
      });
    }
    return matches;
  }

  async verifyTransfer(txHash: string, expectedRecipient: string, expectedAmount: number): Promise<boolean> {
    const receipt = await this.rpc<TransactionReceipt | null>('eth_getTransactionReceipt', [txHash]);
    if (!receipt || receipt.status !== '0x1') return false;
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== this.chain.usdcAddress.toLowerCase()) continue;
      if (log.topics[0] !== USDC_TRANSFER_TOPIC) continue;
      
      const to = `0x${log.topics[2].slice(-40)}`.toLowerCase();
      const rawAmount = BigInt(log.data);
      const decimals = this.chain.usdcDecimals || 6;
      const amount = Number(rawAmount) / Math.pow(10, decimals);
      
      if (to === expectedRecipient.toLowerCase() && Math.abs(amount - expectedAmount) < 0.01) {
        return true;
      }
    }
    return false;
  }
}
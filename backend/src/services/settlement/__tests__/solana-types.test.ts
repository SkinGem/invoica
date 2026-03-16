import {
  USDC_MINT,
  TOKEN_PROGRAM,
  MEMO_PROGRAM,
} from '../solana-types';
import type {
  SolanaSettlement,
  SolanaTransferRequest,
  SolanaVerifyRequest,
  SolanaTxParsed,
  SolanaInstruction,
  SolanaTokenTransfer,
  SolanaSignatureInfo,
} from '../solana-types';

// ── Runtime constants ─────────────────────────────────────────────────────────

describe('USDC_MINT', () => {
  it('is the correct Solana mainnet USDC mint address', () => {
    expect(USDC_MINT).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  it('is exactly 44 characters (valid base58 pubkey)', () => {
    expect(USDC_MINT).toHaveLength(44);
  });
});

describe('TOKEN_PROGRAM', () => {
  it('is the correct SPL Token Program ID', () => {
    expect(TOKEN_PROGRAM).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  });

  it('is exactly 43 characters (valid base58 pubkey)', () => {
    expect(TOKEN_PROGRAM).toHaveLength(43);
  });
});

describe('MEMO_PROGRAM', () => {
  it('is the correct Memo Program ID', () => {
    expect(MEMO_PROGRAM).toBe('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  });

  it('is exactly 43 characters (valid base58 pubkey)', () => {
    expect(MEMO_PROGRAM).toHaveLength(43);
  });
});

describe('constants are distinct', () => {
  it('USDC_MINT, TOKEN_PROGRAM, and MEMO_PROGRAM are all different', () => {
    expect(USDC_MINT).not.toBe(TOKEN_PROGRAM);
    expect(USDC_MINT).not.toBe(MEMO_PROGRAM);
    expect(TOKEN_PROGRAM).not.toBe(MEMO_PROGRAM);
  });
});

// ── Interface shape tests (structural, compile-time + runtime) ────────────────

describe('SolanaSettlement interface', () => {
  it('accepts a conforming object with all required fields', () => {
    const settlement: SolanaSettlement = {
      txSignature: '5wHu1qwD7q5ifAN1W47NNarNNbd6',
      fromAddress: 'FromAddr111111111111111111111111111111111111',
      toAddress: 'ToAddr2222222222222222222222222222222222222222',
      amount: BigInt(1_000_000),
      timestamp: 1700000000,
      confirmations: 32,
      invoiceId: 'inv-001',
      chain: 'solana',
    };
    expect(settlement.txSignature).toBeDefined();
    expect(typeof settlement.amount).toBe('bigint');
    expect(settlement.chain).toBe('solana');
  });

  it('accepts optional memo field', () => {
    const settlement: SolanaSettlement = {
      txSignature: 'sig',
      fromAddress: 'from',
      toAddress: 'to',
      amount: BigInt(500_000),
      timestamp: 1700000000,
      confirmations: 1,
      invoiceId: 'inv-002',
      chain: 'solana',
      memo: 'Payment for invoice inv-002',
    };
    expect(settlement.memo).toBe('Payment for invoice inv-002');
  });
});

describe('SolanaTransferRequest interface', () => {
  it('accepts walletAddress without optional limit', () => {
    const req: SolanaTransferRequest = { walletAddress: 'WalletAddr1111111111111111111111111111111111' };
    expect(req.walletAddress).toBeDefined();
    expect(req.limit).toBeUndefined();
  });

  it('accepts walletAddress with optional limit', () => {
    const req: SolanaTransferRequest = { walletAddress: 'WalletAddr1111111111111111111111111111111111', limit: 50 };
    expect(req.limit).toBe(50);
  });
});

describe('SolanaVerifyRequest interface', () => {
  it('encodes expectedAmountUsdc as bigint', () => {
    const req: SolanaVerifyRequest = {
      txSignature: 'SomeSig1111',
      expectedRecipient: 'RecipAddr111111111111111111111111111111111111',
      expectedAmountUsdc: BigInt(1_000_000),
    };
    expect(typeof req.expectedAmountUsdc).toBe('bigint');
    expect(req.expectedAmountUsdc).toBe(BigInt(1_000_000));
  });
});

describe('SolanaSignatureInfo confirmationStatus', () => {
  it.each(['processed', 'confirmed', 'finalized'] as const)(
    'accepts "%s" as a valid confirmationStatus',
    (status) => {
      const info: SolanaSignatureInfo = {
        signature: 'sig123',
        slot: 1000,
        confirmationStatus: status,
      };
      expect(info.confirmationStatus).toBe(status);
    }
  );
});

describe('SolanaTokenTransfer interface', () => {
  it('encodes amount as bigint with decimals', () => {
    const transfer: SolanaTokenTransfer = {
      mint: USDC_MINT,
      source: 'SourceAcct11111111111111111111111111111111111',
      destination: 'DestAcct111111111111111111111111111111111111',
      amount: BigInt(250_000),
      decimals: 6,
    };
    expect(transfer.mint).toBe(USDC_MINT);
    expect(typeof transfer.amount).toBe('bigint');
    expect(transfer.decimals).toBe(6);
  });
});

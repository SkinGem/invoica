/**
 * Environment configuration validator utility
 * Validates required environment variables and provides type-safe access
 * @packageDocumentation
 */

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  // Legacy keys — optional when USE_CLAWROUTER=true (Phase 1 transition)
  ANTHROPIC_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  // ClawRouter x402 keys — required when USE_CLAWROUTER=true
  CLAWROUTER_GATEWAY_URL?: string;
  X402_OUTBOUND_WALLET_KEY?: string;
  USE_CLAWROUTER?: string;
  SUPERVISOR_URL?: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

// Phase 1: only DATABASE_URL and NODE_ENV are universally required.
// When USE_CLAWROUTER=true, CLAWROUTER_GATEWAY_URL and X402_OUTBOUND_WALLET_KEY are needed.
// When USE_CLAWROUTER=false (default), ANTHROPIC_API_KEY and MINIMAX_API_KEY are needed.
const REQUIRED_ENV_VARS: readonly string[] = [
  'NODE_ENV',
  'DATABASE_URL',
] as const;

/**
 * Masks a secret value for safe logging
 * Shows first 4 and last 4 characters with *** in between
 * Returns '****' if value length is under 10 characters
 * @param value - The secret value to mask
 * @returns Masked string (e.g., "abcd***efgh" or "****")
 */
export function maskSecret(value: string): string {
  if (value.length < 10) {
    return '****';
  }

  const firstFour: string = value.slice(0, 4);
  const lastFour: string = value.slice(-4);

  return `${firstFour}***${lastFour}`;
}

/**
 * Coerces PORT environment variable to number with default 3000
 * @param portValue - Raw PORT value from process.env
 * @returns Valid port number
 */
function coercePort(portValue: string | undefined): number {
  if (portValue === undefined || portValue === '') {
    return 3000;
  }

  const parsed: number = parseInt(portValue, 10);

  if (Number.isNaN(parsed)) {
    return 3000;
  }

  return parsed;
}

/**
 * Validates all required environment variables and returns typed config
 * @returns Validated environment configuration object
 * @throws Error with list of ALL missing environment variables
 */
export function validateEnv(): EnvConfig {
  const missingVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value: string | undefined = process.env[varName];
    if (value === undefined || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  // Conditional requirements based on routing mode
  const useClawRouter = process.env.USE_CLAWROUTER === 'true';
  if (useClawRouter) {
    // ClawRouter mode: need gateway URL and outbound wallet
    if (!process.env.X402_OUTBOUND_WALLET_KEY) missingVars.push('X402_OUTBOUND_WALLET_KEY');
  } else {
    // Legacy mode: need subscription API keys
    if (!process.env.ANTHROPIC_API_KEY) missingVars.push('ANTHROPIC_API_KEY');
    if (!process.env.MINIMAX_API_KEY) missingVars.push('MINIMAX_API_KEY');
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}` +
      (useClawRouter ? ' (USE_CLAWROUTER=true mode)' : ' (legacy mode)')
    );
  }

  const rawLogLevel: string | undefined = process.env.LOG_LEVEL;
  const logLevel: 'debug' | 'info' | 'warn' | 'error' =
    rawLogLevel === 'debug' ||
    rawLogLevel === 'info' ||
    rawLogLevel === 'warn' ||
    rawLogLevel === 'error'
      ? rawLogLevel
      : 'info';

  const config: EnvConfig = {
    PORT: coercePort(process.env.PORT),
    NODE_ENV: process.env.NODE_ENV as EnvConfig['NODE_ENV'],
    DATABASE_URL: process.env.DATABASE_URL as string,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
    CLAWROUTER_GATEWAY_URL: process.env.CLAWROUTER_GATEWAY_URL,
    X402_OUTBOUND_WALLET_KEY: process.env.X402_OUTBOUND_WALLET_KEY,
    USE_CLAWROUTER: process.env.USE_CLAWROUTER,
    SUPERVISOR_URL: process.env.SUPERVISOR_URL,
    LOG_LEVEL: logLevel,
  };

  return config;
}
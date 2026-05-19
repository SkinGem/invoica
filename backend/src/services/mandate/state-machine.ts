// PACT Mandate state machine — v0.1 for Helixa Synagent build.
//
// Generic mandate transitions. Used by /v1/mandates routes to validate
// state changes before persisting + emitting DRS receipts.
//
// State graph:
//
//   proposed ──sign_proposer──> signed_by_proposer ──sign_counterparty──>
//   signed_by_both ──start──> in_progress ──complete──> completed
//
//   Any non-terminal state can be disputed or expired.

export type MandateState =
  | 'proposed'
  | 'signed_by_proposer'
  | 'signed_by_both'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'expired';

export type MandateAction =
  | 'sign_proposer'
  | 'sign_counterparty'
  | 'start'
  | 'complete'
  | 'dispute'
  | 'expire';

const TRANSITIONS: Record<MandateState, Partial<Record<MandateAction, MandateState>>> = {
  proposed: {
    sign_proposer: 'signed_by_proposer',
    dispute: 'disputed',
    expire: 'expired',
  },
  signed_by_proposer: {
    sign_counterparty: 'signed_by_both',
    dispute: 'disputed',
    expire: 'expired',
  },
  signed_by_both: {
    start: 'in_progress',
    dispute: 'disputed',
    expire: 'expired',
  },
  in_progress: {
    complete: 'completed',
    dispute: 'disputed',
    expire: 'expired',
  },
  completed: {},
  disputed: {},
  expired: {},
};

export class InvalidTransitionError extends Error {
  constructor(public from: MandateState, public action: MandateAction) {
    super(`Invalid PACT mandate transition: state '${from}' cannot perform action '${action}'`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: MandateState, action: MandateAction): boolean {
  return TRANSITIONS[from][action] !== undefined;
}

export function nextState(from: MandateState, action: MandateAction): MandateState {
  const next = TRANSITIONS[from][action];
  if (!next) throw new InvalidTransitionError(from, action);
  return next;
}

export function isTerminal(state: MandateState): boolean {
  return state === 'completed' || state === 'disputed' || state === 'expired';
}

export function allowedActions(from: MandateState): MandateAction[] {
  return Object.keys(TRANSITIONS[from]) as MandateAction[];
}

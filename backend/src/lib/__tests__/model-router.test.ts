jest.mock('../../../../scripts/lib/ollama-client', () => ({
  callOllama: jest.fn(),
}));

import {
  classifyTask,
  selectModel,
  getFallbackModel,
  getSupportedAliases,
  EXPERTISE_MODELS,
} from '../model-router';

describe('classifyTask', () => {
  it('classifies code prompts', () => {
    expect(classifyTask('Please implement a TypeScript function')).toBe('code');
  });

  it('classifies audit prompts', () => {
    expect(classifyTask('Perform a vulnerability and penetration test')).toBe('audit');
  });

  it('classifies data prompts', () => {
    expect(classifyTask('Write a SQL query to aggregate invoices')).toBe('data');
  });

  it('classifies lang prompts', () => {
    expect(classifyTask('Translate this text to French')).toBe('lang');
  });

  it('classifies reason prompts', () => {
    expect(classifyTask('Explain the tradeoffs between these approaches')).toBe('reason');
  });

  it('classifies content prompts', () => {
    expect(classifyTask('Write a blog post about AI agents')).toBe('content');
  });

  it('classifies util prompts', () => {
    expect(classifyTask('Parse this JSON and extract the id field')).toBe('util');
  });

  it('returns util as default for unrecognized prompts', () => {
    expect(classifyTask('Hello world')).toBe('util');
  });
});

describe('selectModel', () => {
  it('passes through ClawRouter IDs (containing slash)', () => {
    const result = selectModel('some prompt', 'deepseek/deepseek-coder-v2');
    expect(result.model).toBe('deepseek/deepseek-coder-v2');
    expect(result.autoClassified).toBe(false);
  });

  it('maps legacy aliases to ClawRouter IDs', () => {
    const result = selectModel('prompt', 'MiniMax-M2.5');
    expect(result.model).toBe('minimax/minimax-m2.5');
    expect(result.autoClassified).toBe(false);
  });

  it('maps claude-haiku-4-5 alias', () => {
    const result = selectModel('prompt', 'claude-haiku-4-5');
    expect(result.model).toBe('anthropic/claude-haiku-4.5');
  });

  it('maps task type name to primary expertise model', () => {
    const result = selectModel('prompt', 'code');
    expect(result.model).toBe(EXPERTISE_MODELS.code.primary);
    expect(result.taskType).toBe('code');
    expect(result.autoClassified).toBe(false);
  });

  it('auto-classifies when no model specified', () => {
    const result = selectModel('implement a TypeScript class');
    expect(result.taskType).toBe('code');
    expect(result.autoClassified).toBe(true);
    expect(result.model).toBe(EXPERTISE_MODELS.code.primary);
  });

  it('auto-classifies and returns util model for unrecognized prompts', () => {
    const result = selectModel('hello there');
    expect(result.taskType).toBe('util');
    expect(result.autoClassified).toBe(true);
  });
});

describe('getFallbackModel', () => {
  it('returns fallback for code task type', () => {
    expect(getFallbackModel('code')).toBe(EXPERTISE_MODELS.code.fallback);
  });

  it('returns fallback for audit task type', () => {
    expect(getFallbackModel('audit')).toBe(EXPERTISE_MODELS.audit.fallback);
  });

  it('all 7 task types have a fallback', () => {
    const types: Array<'code' | 'reason' | 'lang' | 'util' | 'audit' | 'content' | 'data'> =
      ['code', 'reason', 'lang', 'util', 'audit', 'content', 'data'];
    for (const type of types) {
      expect(typeof getFallbackModel(type)).toBe('string');
      expect(getFallbackModel(type).length).toBeGreaterThan(0);
    }
  });
});

describe('getSupportedAliases', () => {
  it('returns an object', () => {
    expect(typeof getSupportedAliases()).toBe('object');
  });

  it('includes MiniMax-M2.5 alias', () => {
    expect(getSupportedAliases()['MiniMax-M2.5']).toBe('minimax/minimax-m2.5');
  });

  it('returns a copy (mutating does not affect internal state)', () => {
    const aliases1 = getSupportedAliases();
    aliases1['fake-model'] = 'fake/model';
    const aliases2 = getSupportedAliases();
    expect(aliases2['fake-model']).toBeUndefined();
  });
});

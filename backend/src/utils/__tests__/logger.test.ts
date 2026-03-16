import { logger } from '../logger';

describe('logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('info calls console.log', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('test');
    expect(spy).toHaveBeenCalled();
  });

  it('error calls console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('err');
    expect(spy).toHaveBeenCalled();
  });

  it('warn calls console.warn', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    logger.warn('w');
    expect(spy).toHaveBeenCalled();
  });

  it('debug calls console.debug', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation();
    logger.debug('d');
    expect(spy).toHaveBeenCalled();
  });

  it('info includes message in output', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('hello world');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('hello world'));
  });

  it('dev mode output includes meta as JSON', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('test msg', { requestId: 'r123' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('r123'));
    process.env.NODE_ENV = origEnv;
  });

  it('production mode outputs valid JSON with level and message fields', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('prod message');
    const output = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('prod message');
    expect(parsed.timestamp).toBeDefined();
    process.env.NODE_ENV = origEnv;
  });

  it('production mode includes meta fields in JSON output', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('event', { userId: 'u001' });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.userId).toBe('u001');
    process.env.NODE_ENV = origEnv;
  });

  it('object-first (pino-style) message uses msg field', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info({ msg: 'pino message', requestId: 'abc' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('pino message'));
  });

  it('object-first with no msg field falls back to level name', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info({ requestId: 'xyz' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('info'));
  });
});
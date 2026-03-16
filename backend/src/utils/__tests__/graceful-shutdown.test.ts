import { DEFAULT_CONFIG, createShutdownHandler } from '../graceful-shutdown';

describe('graceful-shutdown', () => {
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    consoleLog = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  it('DEFAULT_CONFIG has timeout=10000 and signals with SIGTERM and SIGINT', () => {
    expect(DEFAULT_CONFIG.timeout).toBe(10000);
    expect(DEFAULT_CONFIG.signals).toContain('SIGTERM');
    expect(DEFAULT_CONFIG.signals).toContain('SIGINT');
  });

  it('createShutdownHandler returns a function', () => {
    const server = { close: jest.fn((cb) => cb()) };
    const handler = createShutdownHandler(server);
    expect(typeof handler).toBe('function');
  });

  it('shutdown calls server.close', async () => {
    const server = { close: jest.fn((cb) => cb()) };
    const handler = createShutdownHandler(server);
    await handler();
    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it('double shutdown is prevented', async () => {
    const server = { close: jest.fn((cb) => cb()) };
    const handler = createShutdownHandler(server);
    await handler();
    await handler();
    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it('onShutdown callback is called', async () => {
    const onShutdown = jest.fn();
    const server = { close: jest.fn((cb) => cb()) };
    const handler = createShutdownHandler(server, { onShutdown });
    await handler();
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  it('server.close error is caught and does not reject the shutdown promise', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const server = { close: jest.fn((cb) => cb(new Error('close failed'))) };
    const handler = createShutdownHandler(server);
    await expect(handler()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      '[shutdown] Error during shutdown:',
      expect.any(Error)
    );
    consoleError.mockRestore();
  });

  it('onShutdown error is caught and does not reject the shutdown promise', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const onShutdown = jest.fn().mockRejectedValue(new Error('cleanup failed'));
    const server = { close: jest.fn((cb) => cb()) };
    const handler = createShutdownHandler(server, { onShutdown });
    await expect(handler()).resolves.toBeUndefined();
    consoleError.mockRestore();
  });

  it('accepts custom timeout and signals config without throwing', () => {
    const server = { close: jest.fn((cb) => cb()) };
    expect(() =>
      createShutdownHandler(server, { timeout: 5000, signals: ['SIGUSR2'] })
    ).not.toThrow();
  });

  it('shutdown logs initiation message', async () => {
    const server = { close: jest.fn((cb) => cb()) };
    const handler = createShutdownHandler(server);
    await handler();
    expect(consoleLog).toHaveBeenCalledWith('[shutdown] Graceful shutdown initiated...');
  });
});
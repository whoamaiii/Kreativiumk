import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, aiLogger, storeLogger, pdfLogger } from './logger';

describe('Logger Utility', () => {
    const consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    beforeEach(() => {
        Object.values(consoleSpy).forEach(spy => spy.mockClear());
    });

    describe('createLogger', () => {
        it('creates a logger with all required methods', () => {
            const logger = createLogger('TestService');
            expect(logger).toBeDefined();
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.exception).toBe('function');
            expect(typeof logger.time).toBe('function');
            expect(typeof logger.timeAsync).toBe('function');
        });

        it('logs debug messages in dev mode', () => {
            const logger = createLogger('TestService');
            logger.debug('Test message');
            // In test environment (which is dev mode), this should log
            expect(consoleSpy.log).toHaveBeenCalled();
        });

        it('logs info messages', () => {
            const logger = createLogger('TestService');
            logger.info('Test info');
            expect(consoleSpy.info).toHaveBeenCalled();
        });

        it('logs warnings', () => {
            const logger = createLogger('TestService');
            logger.warn('Test warning');
            expect(consoleSpy.warn).toHaveBeenCalled();
        });

        it('logs errors', () => {
            const logger = createLogger('TestService');
            logger.error('Test error');
            expect(consoleSpy.error).toHaveBeenCalled();
        });

        it('includes context in log messages', () => {
            const logger = createLogger('TestService');
            logger.info('Test message', { key: 'value' });
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'Test message',
                { key: 'value' }
            );
        });

        it('logs exceptions with stack trace', () => {
            const logger = createLogger('TestService');
            const error = new Error('Test error');
            logger.exception('Something failed', error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                'Something failed',
                expect.objectContaining({
                    errorName: 'Error',
                    errorMessage: 'Test error',
                    stack: expect.any(String),
                })
            );
        });
    });

    describe('time utility', () => {
        it('times synchronous operations and returns result', () => {
            const logger = createLogger('TestService');
            const result = logger.time('test operation', () => {
                return 42;
            });
            expect(result).toBe(42);
            expect(consoleSpy.log).toHaveBeenCalled();
        });

        it('times async operations and returns result', async () => {
            const logger = createLogger('TestService');
            const result = await logger.timeAsync('async operation', async () => {
                return Promise.resolve('result');
            });
            expect(result).toBe('result');
            expect(consoleSpy.log).toHaveBeenCalled();
        });

        it('logs errors for failed timed operations', () => {
            const logger = createLogger('TestService');
            expect(() => {
                logger.time('failing operation', () => {
                    throw new Error('Operation failed');
                });
            }).toThrow('Operation failed');
            expect(consoleSpy.error).toHaveBeenCalled();
        });

        it('logs errors for failed async operations', async () => {
            const logger = createLogger('TestService');
            await expect(
                logger.timeAsync('failing async', async () => {
                    throw new Error('Async failed');
                })
            ).rejects.toThrow('Async failed');
            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });

    describe('pre-configured loggers', () => {
        it('has aiLogger configured', () => {
            expect(aiLogger).toBeDefined();
            aiLogger.info('AI service test');
            expect(consoleSpy.info).toHaveBeenCalled();
        });

        it('has storeLogger configured', () => {
            expect(storeLogger).toBeDefined();
            storeLogger.info('Store test');
            expect(consoleSpy.info).toHaveBeenCalled();
        });

        it('has pdfLogger configured', () => {
            expect(pdfLogger).toBeDefined();
            pdfLogger.info('PDF test');
            expect(consoleSpy.info).toHaveBeenCalled();
        });
    });

    describe('log level filtering', () => {
        it('respects minimum log level - warn', () => {
            const logger = createLogger('TestService', { minLevel: 'warn' });
            logger.debug('Should not appear');
            logger.info('Should not appear');

            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.info).not.toHaveBeenCalled();
        });

        it('logs at and above minimum level', () => {
            const logger = createLogger('TestService', { minLevel: 'warn' });
            logger.warn('Should appear');
            logger.error('Should also appear');

            expect(consoleSpy.warn).toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalled();
        });

        it('respects minimum log level - error', () => {
            const logger = createLogger('TestService', { minLevel: 'error' });
            logger.debug('No');
            logger.info('No');
            logger.warn('No');
            logger.error('Yes');

            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.info).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });

    describe('force production mode', () => {
        it('accepts forceProduction option', () => {
            const logger = createLogger('TestService', { forceProduction: true });
            expect(logger).toBeDefined();
            logger.info('Test');
            expect(consoleSpy.info).toHaveBeenCalled();
        });
    });
});

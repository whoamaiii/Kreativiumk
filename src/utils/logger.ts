/**
 * Structured Logger Utility
 * Provides consistent logging with levels, tags, and optional structured data.
 * Only logs in development mode by default.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface LoggerConfig {
    /** Logger name/tag for filtering */
    name: string;
    /** Minimum log level to output */
    minLevel?: LogLevel;
    /** Force logging even in production */
    forceProduction?: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
    debug: 'color: #6b7280',
    info: 'color: #3b82f6',
    warn: 'color: #f59e0b',
    error: 'color: #ef4444; font-weight: bold',
};

const LOG_LEVEL_METHODS: Record<LogLevel, 'log' | 'info' | 'warn' | 'error'> = {
    debug: 'log',
    info: 'info',
    warn: 'warn',
    error: 'error',
};

class Logger {
    private name: string;
    private minLevel: LogLevel;
    private forceProduction: boolean;

    constructor(config: LoggerConfig) {
        this.name = config.name;
        this.minLevel = config.minLevel || 'debug';
        this.forceProduction = config.forceProduction || false;
    }

    private shouldLog(level: LogLevel): boolean {
        // Only log in development unless forced
        if (!import.meta.env.DEV && !this.forceProduction) {
            return false;
        }
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
        if (!this.shouldLog(level)) return;

        const timestamp = new Date().toISOString().slice(11, 23);
        const prefix = `%c[${timestamp}] [${this.name}]`;
        const method = LOG_LEVEL_METHODS[level];
        const style = LOG_LEVEL_STYLES[level];

        if (context && Object.keys(context).length > 0) {
            console[method](prefix, style, message, context);
        } else {
            console[method](prefix, style, message);
        }
    }

    debug(message: string, context?: LogContext): void {
        this.formatMessage('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.formatMessage('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.formatMessage('warn', message, context);
    }

    error(message: string, context?: LogContext): void {
        this.formatMessage('error', message, context);
    }

    /** Log an error with stack trace */
    exception(message: string, error: Error, context?: LogContext): void {
        this.formatMessage('error', message, {
            ...context,
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
        });
    }

    /** Time an operation and log its duration */
    time<T>(label: string, fn: () => T): T {
        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.debug(`${label} completed`, { durationMs: duration.toFixed(2) });
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${label} failed`, { durationMs: duration.toFixed(2) });
            throw error;
        }
    }

    /** Time an async operation and log its duration */
    async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.debug(`${label} completed`, { durationMs: duration.toFixed(2) });
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${label} failed`, { durationMs: duration.toFixed(2) });
            throw error;
        }
    }
}

/**
 * Create a logger instance for a specific module/service
 * @param name - The name/tag for this logger (e.g., 'GeminiService', 'Store')
 * @param options - Optional configuration
 */
export function createLogger(name: string, options?: Partial<Omit<LoggerConfig, 'name'>>): Logger {
    return new Logger({ name, ...options });
}

// Pre-configured loggers for common services
export const aiLogger = createLogger('AI');
export const storeLogger = createLogger('Store');
export const pdfLogger = createLogger('PDF');

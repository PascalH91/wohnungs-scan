/**
 * Structured logging service for the apartment scanning application
 */

export enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
}

interface LogContext {
    [key: string]: any;
}

class Logger {
    private minLevel: LogLevel;
    private serviceName: string;

    constructor(serviceName: string = "wohnungs-scanner") {
        this.serviceName = serviceName;
        this.minLevel = this.getMinLogLevel();
    }

    private getMinLogLevel(): LogLevel {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        return (envLevel as LogLevel) || LogLevel.INFO;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.minLevel);
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
        return `[${timestamp}] [${level}] [${this.serviceName}] ${message}${contextStr}`;
    }

    debug(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.formatMessage(LogLevel.DEBUG, message, context));
        }
    }

    info(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatMessage(LogLevel.INFO, message, context));
        }
    }

    warn(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage(LogLevel.WARN, message, context));
        }
    }

    error(message: string, error?: Error | any, context?: LogContext): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const errorContext = {
                ...context,
                ...(error && {
                    errorMessage: error?.message || String(error),
                    errorStack: error?.stack,
                }),
            };
            console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
        }
    }
}

// Create default logger instance
export const logger = new Logger();

// Create logger for specific contexts
export const createLogger = (serviceName: string): Logger => {
    return new Logger(serviceName);
};

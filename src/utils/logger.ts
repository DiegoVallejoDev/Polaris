/**
 * Logging utilities for POLARIS framework
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private name: string;
  private level: LogLevel;
  // private parent: Logger | undefined; // Reserved for future hierarchical logging

  constructor(name: string, level: LogLevel = LogLevel.INFO) {
    this.name = name;
    this.level = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  /**
   * Create a child logger
   */
  createChild(name: string): Logger {
    const childName = this.name ? `${this.name}.${name}` : name;
    return new Logger(childName, this.level);
  }

  /**
   * Set the logging level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current logging level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Check if a level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.level;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.isLevelEnabled(level)) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}] [${this.name}]`;

    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data || "");
        break;
      case LogLevel.INFO:
        console.info(logMessage, data || "");
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || "");
        break;
      case LogLevel.ERROR:
        console.error(logMessage, data || "");
        break;
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger("POLARIS");

/**
 * Performance measurement utilities
 */
export class PerformanceLogger {
  private static measurements: Map<string, number> = new Map();

  /**
   * Start measuring performance for a given operation
   */
  static start(operationName: string): void {
    this.measurements.set(operationName, performance.now());
  }

  /**
   * End measurement and log the duration
   */
  static end(operationName: string, logger?: Logger): number {
    const startTime = this.measurements.get(operationName);
    if (startTime === undefined) {
      throw new Error(`No measurement started for operation: ${operationName}`);
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(operationName);

    if (logger) {
      logger.debug(
        `Performance: ${operationName} took ${duration.toFixed(2)}ms`
      );
    }

    return duration;
  }

  /**
   * Measure the duration of an async function
   */
  static async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    logger?: Logger
  ): Promise<{ result: T; duration: number }> {
    this.start(operationName);
    const result = await fn();
    const duration = this.end(operationName, logger);

    return { result, duration };
  }

  /**
   * Clear all measurements
   */
  static clear(): void {
    this.measurements.clear();
  }
}

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
    this.log(LogLevel.ERROR, message, this.sanitizeError(error));
  }

  /**
   * Log an error message with safe sanitization
   */
  errorSafe(message: string, error?: Error | any): void {
    const sanitizedError = this.sanitizeError(error);
    this.log(LogLevel.ERROR, message, sanitizedError);
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

  /**
   * Sanitize error objects to remove sensitive data and reduce verbosity
   */
  private sanitizeError(error: any): any {
    if (!error) return error;

    // Handle Axios errors specially
    if (error.isAxiosError || error.response) {
      return {
        message: error.message || "Request failed",
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        url: this.maskSensitiveUrl(
          error.config?.url || error.response?.config?.url
        ),
        method:
          error.config?.method?.toUpperCase() ||
          error.response?.config?.method?.toUpperCase(),
        data:
          error.response?.data && typeof error.response.data === "object"
            ? this.sanitizeObject(error.response.data)
            : error.response?.data,
      };
    }

    // Handle regular errors
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 3).join("\n"), // Only first 3 lines of stack
      };
    }

    // Handle objects that might contain sensitive data
    if (typeof error === "object") {
      return this.sanitizeObject(error);
    }

    return error;
  }

  /**
   * Sanitize objects to mask sensitive data
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Mask sensitive fields
      if (
        lowerKey.includes("key") ||
        lowerKey.includes("token") ||
        lowerKey.includes("auth") ||
        lowerKey.includes("password") ||
        lowerKey.includes("secret")
      ) {
        sanitized[key] = this.maskSensitiveValue(value as string);
      } else if (
        typeof value === "string" &&
        this.containsSensitiveData(value)
      ) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === "object" && value !== null) {
        // Recursively sanitize nested objects (but limit depth)
        sanitized[key] = Array.isArray(value) ? "[Array]" : "[Object]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Check if a string contains sensitive data (API keys, tokens, etc.)
   */
  private containsSensitiveData(str: string): boolean {
    return /sk-[a-zA-Z0-9-_]+|Bearer\s+[a-zA-Z0-9-_]+|proj_[a-zA-Z0-9]+/.test(
      str
    );
  }

  /**
   * Mask sensitive values while keeping some context
   */
  private maskSensitiveValue(value: string): string {
    if (!value || typeof value !== "string") return "[MASKED]";

    if (value.length <= 8) return "[MASKED]";

    // Show first 4 and last 4 characters with masking in between
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    const middle = "*".repeat(Math.min(value.length - 8, 20)); // Limit mask length

    return `${start}${middle}${end}`;
  }

  /**
   * Mask sensitive parts of URLs
   */
  private maskSensitiveUrl(url: string): string {
    if (!url) return url;

    try {
      // Handle relative URLs
      if (url.startsWith("/")) {
        return `[API_ENDPOINT]${url}`;
      }

      // Handle full URLs
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return a generic placeholder
      return "[API_ENDPOINT]";
    }
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

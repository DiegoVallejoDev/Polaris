/**
 * Rate limiter for controlling concurrent API requests across agents.
 * Prevents 429 (Too Many Requests) errors when running agents in parallel.
 *
 * Uses a token bucket algorithm with configurable:
 * - maxConcurrent: Maximum simultaneous in-flight requests
 * - minDelayMs: Minimum delay between consecutive request starts
 */

export interface RateLimiterConfig {
  /** Maximum concurrent requests allowed */
  maxConcurrent: number;

  /** Minimum delay between consecutive requests (ms) */
  minDelayMs: number;

  /** Maximum queue size before rejecting new requests */
  maxQueueSize?: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  enqueuedAt: number;
}

export class RateLimiter {
  private readonly config: Required<RateLimiterConfig>;
  private inFlight: number = 0;
  private lastRequestTime: number = 0;
  private queue: QueuedRequest<unknown>[] = [];
  private processing: boolean = false;

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxConcurrent: config.maxConcurrent,
      minDelayMs: config.minDelayMs,
      maxQueueSize: config.maxQueueSize ?? 100,
    };
  }

  /**
   * Schedule a function for rate-limited execution.
   * Returns a promise that resolves when the function completes.
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(
        `Rate limiter queue full (${this.config.maxQueueSize} items). ` +
          "Reduce concurrency or increase queue size."
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now(),
      });
      this.processQueue();
    });
  }

  /**
   * Execute multiple functions with rate limiting.
   * Similar to Promise.allSettled but rate-limited.
   */
  async scheduleAll<T>(fns: Array<() => Promise<T>>): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(fns.map((fn) => this.schedule(fn)));
  }

  /** Current number of in-flight requests */
  get activeRequests(): number {
    return this.inFlight;
  }

  /** Current queue depth */
  get queueDepth(): number {
    return this.queue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Wait for a slot to open
      if (this.inFlight >= this.config.maxConcurrent) {
        await this.waitForSlot();
        continue;
      }

      // Enforce minimum delay with jitter to prevent thundering herd
      const elapsed = Date.now() - this.lastRequestTime;
      const jitter = Math.random() * this.config.minDelayMs * 0.2;
      const effectiveDelay = this.config.minDelayMs + jitter;
      if (elapsed < effectiveDelay) {
        await this.delay(effectiveDelay - elapsed);
      }

      const request = this.queue.shift();
      if (!request) break;

      this.inFlight++;
      this.lastRequestTime = Date.now();

      // Fire-and-forget — the promise handles its own resolution
      this.executeRequest(request);
    }

    this.processing = false;
  }

  private async executeRequest(request: QueuedRequest<unknown>): Promise<void> {
    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.inFlight--;
      // Trigger queue processing when a slot frees up
      this.processQueue();
    }
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.inFlight < this.config.maxConcurrent) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      setTimeout(check, 50);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Pre-configured rate limiters for common provider limits.
 */
export const ProviderRateLimiters = {
  /** OpenAI: 500 RPM on most tiers → ~8 RPS */
  openai: () => new RateLimiter({ maxConcurrent: 8, minDelayMs: 125 }),

  /** Anthropic: 50 RPM on free tier → ~0.8 RPS */
  anthropic: () => new RateLimiter({ maxConcurrent: 2, minDelayMs: 1200 }),

  /** Google: 60 RPM on free tier → 1 RPS */
  google: () => new RateLimiter({ maxConcurrent: 3, minDelayMs: 1000 }),

  /** Conservative: Safe for any provider */
  conservative: () => new RateLimiter({ maxConcurrent: 2, minDelayMs: 2000 }),
} as const;

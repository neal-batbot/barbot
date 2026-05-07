export type RateLimitFailureMode = 'fail-open' | 'fail-closed';

export interface WindowLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  degraded?: boolean;
}

export interface DailyLimitResult {
  allowed: boolean;
  remaining: number;
  degraded?: boolean;
}

export interface RateLimitStore {
  consumeWindow(input: {
    scope: string;
    key: string;
    nowMs: number;
    windowMs: number;
    max: number;
  }): Promise<WindowLimitResult>;
  consumeDaily(input: {
    scope: string;
    key: string;
    dayKey: string;
    max: number;
  }): Promise<DailyLimitResult>;
}

type WindowState = { count: number; windowStart: number };
type DailyState = { dayKey: string; count: number };

class InMemoryRateLimitStore implements RateLimitStore {
  private windowStore = new Map<string, WindowState>();
  private dailyStore = new Map<string, DailyState>();

  async consumeWindow(input: {
    scope: string;
    key: string;
    nowMs: number;
    windowMs: number;
    max: number;
  }): Promise<WindowLimitResult> {
    const cacheKey = `${input.scope}:${input.key}`;
    const state = this.windowStore.get(cacheKey);

    if (!state || input.nowMs - state.windowStart >= input.windowMs) {
      this.windowStore.set(cacheKey, {
        count: 1,
        windowStart: input.nowMs,
      });
      return {
        allowed: true,
        remaining: Math.max(input.max - 1, 0),
        retryAfterSec: Math.ceil(input.windowMs / 1000),
      };
    }

    if (state.count >= input.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(
          (input.windowMs - (input.nowMs - state.windowStart)) / 1000
        ),
      };
    }

    state.count += 1;
    this.windowStore.set(cacheKey, state);
    return {
      allowed: true,
      remaining: Math.max(input.max - state.count, 0),
      retryAfterSec: Math.ceil(
        (input.windowMs - (input.nowMs - state.windowStart)) / 1000
      ),
    };
  }

  async consumeDaily(input: {
    scope: string;
    key: string;
    dayKey: string;
    max: number;
  }): Promise<DailyLimitResult> {
    const cacheKey = `${input.scope}:${input.key}`;
    const state = this.dailyStore.get(cacheKey);

    if (!state || state.dayKey !== input.dayKey) {
      this.dailyStore.set(cacheKey, { dayKey: input.dayKey, count: 1 });
      return { allowed: true, remaining: Math.max(input.max - 1, 0) };
    }

    if (state.count >= input.max) {
      return { allowed: false, remaining: 0 };
    }

    state.count += 1;
    this.dailyStore.set(cacheKey, state);
    return { allowed: true, remaining: Math.max(input.max - state.count, 0) };
  }
}

class UpstashRedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string,
    private readonly keyPrefix: string
  ) {}

  private async command(args: string[]): Promise<any> {
    const encoded = args.map((part) => encodeURIComponent(part)).join('/');
    const resp = await fetch(`${this.restUrl}/${encoded}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.restToken}`,
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`redis command failed: ${resp.status} ${text}`);
    }
    const payload = await resp.json();
    return payload?.result;
  }

  private windowKey(scope: string, key: string) {
    return `${this.keyPrefix}:win:${scope}:${key}`;
  }

  private dailyKey(scope: string, key: string, dayKey: string) {
    return `${this.keyPrefix}:day:${scope}:${key}:${dayKey}`;
  }

  async consumeWindow(input: {
    scope: string;
    key: string;
    nowMs: number;
    windowMs: number;
    max: number;
  }): Promise<WindowLimitResult> {
    const redisKey = this.windowKey(input.scope, input.key);
    const count = Number(await this.command(['INCR', redisKey]));
    if (count === 1) {
      await this.command(['PEXPIRE', redisKey, String(input.windowMs)]);
    }
    const ttlMs = Number(await this.command(['PTTL', redisKey]));
    const retryAfterSec = Math.max(1, Math.ceil(Math.max(ttlMs, 1000) / 1000));

    if (count > input.max) {
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    return {
      allowed: true,
      remaining: Math.max(input.max - count, 0),
      retryAfterSec,
    };
  }

  async consumeDaily(input: {
    scope: string;
    key: string;
    dayKey: string;
    max: number;
  }): Promise<DailyLimitResult> {
    const redisKey = this.dailyKey(input.scope, input.key, input.dayKey);
    const count = Number(await this.command(['INCR', redisKey]));
    if (count === 1) {
      // Keep for 48h to survive timezone/date boundary reads safely.
      await this.command(['EXPIRE', redisKey, '172800']);
    }
    if (count > input.max) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: Math.max(input.max - count, 0) };
  }
}

let singletonStore: RateLimitStore | null = null;

function toFailureMode(value?: string): RateLimitFailureMode {
  return value === 'fail-closed' ? 'fail-closed' : 'fail-open';
}

export function getRateLimitStore(): RateLimitStore {
  if (singletonStore) return singletonStore;

  const storeMode = (process.env.RATE_LIMIT_STORE || 'memory').toLowerCase();
  const restUrl = process.env.REDIS_REST_URL?.replace(/\/$/, '') || '';
  const restToken = process.env.REDIS_REST_TOKEN || '';
  const keyPrefix = process.env.RATE_LIMIT_REDIS_PREFIX || 'icai';

  if (storeMode === 'redis' && restUrl && restToken) {
    singletonStore = new UpstashRedisRateLimitStore(restUrl, restToken, keyPrefix);
    return singletonStore;
  }

  singletonStore = new InMemoryRateLimitStore();
  return singletonStore;
}

export async function withRateLimitFailureMode<T>(
  task: () => Promise<T>,
  fallback: T
): Promise<T> {
  const failureMode = toFailureMode(process.env.RATE_LIMIT_FAILURE_MODE);
  try {
    return await task();
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'rate_limit.store.failure',
        errorCode: 'RATE_LIMIT_STORE_FAILURE',
        failureMode,
        message,
      })
    );
    if (failureMode === 'fail-closed') {
      throw error;
    }
    return fallback;
  }
}

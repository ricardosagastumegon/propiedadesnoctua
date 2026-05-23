// Rate limiting con Upstash Redis. En dev sin credenciales cae a un limiter
// en memoria por proceso (no robusto entre instancias pero no rompe el flujo).
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const URL = process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = URL && TOKEN ? new Redis({ url: URL, token: TOKEN }) : null

interface MemoryEntry { count: number; resetAt: number }
const memory = new Map<string, MemoryEntry>()

// Fallback in-memory: bucket fijo por ventana.
function memoryCheck(key: string, limit: number, windowMs: number): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }
  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }
  entry.count++
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt }
}

function makeLimiter(limit: number, window: `${number} ${"s" | "m" | "h"}`, prefix: string) {
  if (redis) {
    return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix })
  }
  return null
}

const loginLimiter = makeLimiter(10, "15 m", "rl:login")
const signupLimiter = makeLimiter(3, "1 h", "rl:signup")
const resetLimiter = makeLimiter(3, "1 h", "rl:reset")

const WINDOWS = {
  login: { limit: 10, ms: 15 * 60 * 1000 },
  signup: { limit: 3, ms: 60 * 60 * 1000 },
  reset: { limit: 3, ms: 60 * 60 * 1000 },
}

type Kind = keyof typeof WINDOWS

const LIMITERS: Record<Kind, Ratelimit | null> = {
  login: loginLimiter,
  signup: signupLimiter,
  reset: resetLimiter,
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number  // ms epoch
}

/**
 * Aplica rate limit a una operación. `identifier` debe ser IP o email.
 */
export async function checkRateLimit(kind: Kind, identifier: string): Promise<RateLimitResult> {
  const limiter = LIMITERS[kind]
  if (limiter) {
    const r = await limiter.limit(identifier)
    return { success: r.success, remaining: r.remaining, reset: r.reset }
  }
  const w = WINDOWS[kind]
  return memoryCheck(`${kind}:${identifier}`, w.limit, w.ms)
}

export function isRateLimitConfigured(): boolean {
  return !!redis
}

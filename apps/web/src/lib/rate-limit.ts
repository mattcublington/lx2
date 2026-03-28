import { headers } from 'next/headers'

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Tracks call counts per IP within a rolling window. Suitable for
 * single-instance deployments. For multi-instance, swap the Map
 * for a shared store (Redis / Upstash).
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Clean up expired entries every 60 s to avoid unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000).unref()

/**
 * Check (and consume) a rate-limit token for the caller's IP.
 *
 * @param limit  max requests per window
 * @param windowMs  window size in milliseconds (default 60 s)
 * @throws Error('RATE_LIMITED') if the limit is exceeded
 */
export async function rateLimit(limit: number, windowMs = 60_000): Promise<void> {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `rl:${ip}`
  const now = Date.now()

  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  entry.count++
  if (entry.count > limit) {
    throw new Error('RATE_LIMITED')
  }
}

import { describe, it, expect, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
})

// Sin Upstash configurado (entorno de test), checkRateLimit NO limita:
// el contador en memoria daba falsos positivos en serverless, así que se
// desactivó. La protección real requiere Upstash.
describe("checkRateLimit (sin Upstash → no limita)", () => {
  it("permite muchos intentos de login sin bloquear", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    for (let i = 0; i < 20; i++) {
      const r = await checkRateLimit("login", "ip-test-1")
      expect(r.success, `intento ${i + 1}`).toBe(true)
    }
  })

  it("permite múltiples signups sin bloquear", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    for (let i = 0; i < 10; i++) {
      const r = await checkRateLimit("signup", "ip-signup-1")
      expect(r.success).toBe(true)
    }
  })

  it("isRateLimitConfigured = false sin credenciales", async () => {
    const { isRateLimitConfigured } = await import("@/lib/rate-limit")
    expect(isRateLimitConfigured()).toBe(false)
  })
})

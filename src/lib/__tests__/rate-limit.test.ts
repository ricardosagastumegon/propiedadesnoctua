import { describe, it, expect, beforeEach, vi } from "vitest"

// El módulo mantiene estado en memoria entre invocaciones. Reseteamos cargándolo
// fresco por cada test para evitar contaminación.
beforeEach(() => {
  vi.resetModules()
})

describe("checkRateLimit (in-memory fallback, sin Upstash)", () => {
  it("permite los primeros 5 intentos de login", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit("login", "ip-test-1")
      expect(r.success, `intento ${i + 1}`).toBe(true)
    }
  })

  it("rechaza el sexto intento de login dentro de la ventana", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("login", "ip-test-2")
    }
    const r = await checkRateLimit("login", "ip-test-2")
    expect(r.success).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it("permite 3 signups, rechaza el cuarto", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit("signup", "ip-signup-1")
      expect(r.success).toBe(true)
    }
    const fourth = await checkRateLimit("signup", "ip-signup-1")
    expect(fourth.success).toBe(false)
  })

  it("identificadores diferentes no se afectan entre sí", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    for (let i = 0; i < 5; i++) await checkRateLimit("login", "ip-a")
    // ip-a está agotado; ip-b sigue limpio
    const a = await checkRateLimit("login", "ip-a")
    const b = await checkRateLimit("login", "ip-b")
    expect(a.success).toBe(false)
    expect(b.success).toBe(true)
  })
})

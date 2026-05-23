import { describe, it, expect, vi } from "vitest"
import { prismaMock } from "@/test/setup"
import { applyPasswordReset } from "@/app/restablecer-password/actions"

function tokenRow(over: Partial<{ id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null; user: { id: string; isActive: boolean } }> = {}) {
  return {
    id: "tok_1",
    userId: "u_1",
    token: "valid",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null as Date | null,
    createdAt: new Date(),
    user: { id: "u_1", isActive: true },
    ...over,
  }
}

describe("applyPasswordReset", () => {
  it("rechaza si token no existe", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null)
    const r = await applyPasswordReset({ token: "nope", newPassword: "0123456789", confirm: "0123456789" })
    expect(r.error).toMatch(/Enlace inválido/)
  })

  it("rechaza si token ya fue usado", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(tokenRow({ usedAt: new Date() }) as never)
    const r = await applyPasswordReset({ token: "valid", newPassword: "0123456789", confirm: "0123456789" })
    expect(r.error).toMatch(/ya fue usado/)
  })

  it("rechaza si token expiró", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      tokenRow({ expiresAt: new Date(Date.now() - 1000) }) as never,
    )
    const r = await applyPasswordReset({ token: "valid", newPassword: "0123456789", confirm: "0123456789" })
    expect(r.error).toMatch(/expiró/)
  })

  it("rechaza si usuario inactivo", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      tokenRow({ user: { id: "u_1", isActive: false } }) as never,
    )
    const r = await applyPasswordReset({ token: "valid", newPassword: "0123456789", confirm: "0123456789" })
    expect(r.error).toMatch(/inactivo/)
  })

  it("rechaza si passwords no coinciden", async () => {
    const r = await applyPasswordReset({ token: "valid", newPassword: "0123456789", confirm: "diferente1" })
    expect(r.error).toMatch(/no coinciden/)
  })

  it("rechaza si password < 10 chars", async () => {
    const r = await applyPasswordReset({ token: "valid", newPassword: "corta", confirm: "corta" })
    expect(r.error).toMatch(/al menos 10/)
  })

  it("token válido + password OK → ok=true y actualiza en transacción", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(tokenRow() as never)
    prismaMock.$transaction.mockResolvedValue([] as never)

    const r = await applyPasswordReset({ token: "valid", newPassword: "0123456789", confirm: "0123456789" })
    expect(r.ok).toBe(true)
    expect(prismaMock.$transaction).toHaveBeenCalled()
  })
})

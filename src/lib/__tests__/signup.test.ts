import { describe, it, expect, vi, beforeEach } from "vitest"
import { prismaMock } from "@/test/setup"
import { makeOrg, makeUser, makeOrgSettings } from "@/test/factories"

// Stub headers() — la action lo usa para rate limit
vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", "127.0.0.1"]]) as never,
}))

// Stub rate-limit — los tests no quieren toparse con la cuota
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: 0 }),
  isRateLimitConfigured: () => false,
}))

// Stub email para no enviar nada
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendInviteEmail: vi.fn().mockResolvedValue({ ok: true }),
  isEmailConfigured: () => false,
}))

// Stub signIn — no auto-login en test
vi.mock("@/auth", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
}))

import { createOrganizationWithOwner } from "@/app/signup/actions"

function fd(obj: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(obj)) f.append(k, v)
  return f
}

const validInput = {
  orgName: "Mi Empresa Nueva",
  orgType: "FAMILY",
  adminName: "Juan Pérez",
  adminEmail: "juan@miempresa.gt",
  adminPassword: "ContraseñaSegura1!",
  adminPasswordConfirm: "ContraseñaSegura1!",
  acceptTerms: "on",
}

describe("createOrganizationWithOwner", () => {
  beforeEach(() => {
    // Stubs comunes
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.organization.findUnique.mockResolvedValue(null)
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.organization.create.mockResolvedValue(makeOrg({ id: "new_org" }) as never)
    prismaMock.organizationSettings.create.mockResolvedValue(makeOrgSettings({ organizationId: "new_org" }) as never)
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "new_user", organizationId: "new_org", role: "OWNER" }) as never)
    prismaMock.assetRecordType.createMany.mockResolvedValue({ count: 6 } as never)
  })

  it("crea Org + Settings + Owner + AssetRecordTypes y devuelve redirectTo /dashboard", async () => {
    const r = await createOrganizationWithOwner(fd(validInput))
    expect(r.ok).toBe(true)
    expect(r.organizationId).toBe("new_org")
    expect(r.redirectTo).toBe("/dashboard")
    // El owner se crea con OWNER + ALONE + mustChangePassword=false
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: "OWNER",
        authorityPolicy: "ALONE",
        mustChangePassword: false,
      }),
    }))
  })

  it("rechaza si email ya existe en CUALQUIER organización", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ email: "juan@miempresa.gt" }) as never)
    const r = await createOrganizationWithOwner(fd(validInput))
    expect((r.error as any)?.adminEmail?.[0]).toMatch(/Ya existe/)
  })

  it("rechaza si passwords no coinciden", async () => {
    const r = await createOrganizationWithOwner(fd({ ...validInput, adminPasswordConfirm: "diferente1!" }))
    expect(r.error).toBeDefined()
  })

  it("rechaza si no acepta términos", async () => {
    const f = new FormData()
    for (const [k, v] of Object.entries({ ...validInput, acceptTerms: "" })) f.append(k, v as string)
    // acceptTerms ausente — zod literal("on") debe fallar
    f.delete("acceptTerms")
    const r = await createOrganizationWithOwner(f)
    expect(r.error).toBeDefined()
  })

  it("rechaza si password < 10 chars", async () => {
    const r = await createOrganizationWithOwner(fd({ ...validInput, adminPassword: "corta", adminPasswordConfirm: "corta" }))
    expect(r.error).toBeDefined()
  })

  it("genera slug único cuando el primero ya existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    // 1ra llamada (signup uniqueSlug): slug "mi-empresa-nueva" ocupado
    // 2da llamada (signup uniqueSlug): slug "mi-empresa-nueva-2" libre
    // 3ra llamada (createOrganization inner check): libre
    prismaMock.organization.findUnique
      .mockResolvedValueOnce(makeOrg({ slug: "mi-empresa-nueva" }) as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const r = await createOrganizationWithOwner(fd(validInput))
    expect(r.ok).toBe(true)
    expect(prismaMock.organization.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        slug: expect.stringMatching(/^mi-empresa-nueva-/),
      }),
    }))
  })
})

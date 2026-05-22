import { describe, it, expect } from "vitest"
import { prismaMock } from "@/test/setup"
import { createOrganization, repairTenant } from "@/lib/tenant"
import { makeOrg, makeUser, makeOrgSettings } from "@/test/factories"

describe("createOrganization", () => {
  it("rechaza si slug está vacío", async () => {
    await expect(createOrganization({
      slug: "", name: "N", adminEmail: "a@b.gt", adminName: "A", adminPassword: "12345678",
    })).rejects.toThrow(/Slug requerido/)
  })

  it("rechaza si la password es corta", async () => {
    await expect(createOrganization({
      slug: "abc", name: "N", adminEmail: "a@b.gt", adminName: "A", adminPassword: "123",
    })).rejects.toThrow(/al menos 8/)
  })

  it("rechaza si ya existe org con ese slug", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(makeOrg({ slug: "abc" }) as any)
    prismaMock.user.findUnique.mockResolvedValue(null)
    await expect(createOrganization({
      slug: "abc", name: "N", adminEmail: "a@b.gt", adminName: "A", adminPassword: "12345678",
    })).rejects.toThrow(/Ya existe una organización/)
  })

  it("rechaza si ya existe usuario con ese email", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ email: "a@b.gt" }) as any)
    await expect(createOrganization({
      slug: "newslug", name: "N", adminEmail: "a@b.gt", adminName: "A", adminPassword: "12345678",
    })).rejects.toThrow(/Ya existe un usuario/)
  })

  it("crea Organization + Settings + User + 6 AssetRecordTypes en transacción", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue(null)

    // Mock de la transacción: ejecuta el callback con el mismo prisma mock
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))

    prismaMock.organization.create.mockResolvedValue(makeOrg({ id: "new_org", slug: "new" }) as any)
    prismaMock.organizationSettings.create.mockResolvedValue(makeOrgSettings({ organizationId: "new_org" }) as any)
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "new_user", organizationId: "new_org", role: "OWNER" }) as any)
    prismaMock.assetRecordType.createMany.mockResolvedValue({ count: 6 } as any)

    const result = await createOrganization({
      slug: "new", name: "New Org",
      adminEmail: "owner@new.gt", adminName: "Owner",
      adminPassword: "Strong123!",
    })

    expect(result.organizationId).toBe("new_org")
    expect(result.adminUserId).toBe("new_user")

    // Confirma que se llamó createMany de AssetRecordTypes con 6 items
    expect(prismaMock.assetRecordType.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ code: "INSURANCE" }),
          expect.objectContaining({ code: "REGISTRATION" }),
          expect.objectContaining({ code: "LICENSE" }),
          expect.objectContaining({ code: "INSPECTION" }),
          expect.objectContaining({ code: "WARRANTY" }),
          expect.objectContaining({ code: "PERMIT" }),
        ]),
      }),
    )

    // El admin debe ser OWNER con authorityPolicy ALONE y canAcceptServices=true
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "OWNER",
          authorityPolicy: "ALONE",
          canAcceptServices: true,
          isActive: true,
        }),
      }),
    )
  })

  it("admin por defecto NO requiere cambio de password (forcePasswordChange=false)", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.organization.create.mockResolvedValue(makeOrg() as any)
    prismaMock.organizationSettings.create.mockResolvedValue(makeOrgSettings() as any)
    prismaMock.user.create.mockResolvedValue(makeUser() as any)
    prismaMock.assetRecordType.createMany.mockResolvedValue({ count: 6 } as any)

    await createOrganization({
      slug: "x", name: "X",
      adminEmail: "x@x.gt", adminName: "X", adminPassword: "Strong123!",
    })

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: false }),
      }),
    )
  })
})

describe("repairTenant", () => {
  it("lanza si la org no existe", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null)
    await expect(repairTenant("fake_org")).rejects.toThrow(/no existe/)
  })

  it("crea OrganizationSettings si falta", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(makeOrg({ id: "org_1" }) as any)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(null)
    prismaMock.organizationSettings.create.mockResolvedValue(makeOrgSettings() as any)
    prismaMock.assetRecordType.findMany.mockResolvedValue([])
    prismaMock.assetRecordType.createMany.mockResolvedValue({ count: 6 } as any)

    const result = await repairTenant("org_1")
    expect(result.fixed.organizationSettings).toBe(true)
    expect(result.fixed.assetRecordTypes).toBe(6)
  })

  it("idempotente: si todo está bien, no crea nada", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(makeOrg({ id: "org_1" }) as any)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(makeOrgSettings() as any)
    prismaMock.assetRecordType.findMany.mockResolvedValue([
      { code: "INSURANCE" },
      { code: "REGISTRATION" },
      { code: "LICENSE" },
      { code: "INSPECTION" },
      { code: "WARRANTY" },
      { code: "PERMIT" },
    ] as any)

    const result = await repairTenant("org_1")
    expect(result.fixed.organizationSettings).toBe(false)
    expect(result.fixed.assetRecordTypes).toBe(0)
    expect(prismaMock.organizationSettings.create).not.toHaveBeenCalled()
    expect(prismaMock.assetRecordType.createMany).not.toHaveBeenCalled()
  })

  it("crea solo los AssetRecordTypes que faltan (parciales)", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(makeOrg() as any)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(makeOrgSettings() as any)
    prismaMock.assetRecordType.findMany.mockResolvedValue([
      { code: "INSURANCE" },
      { code: "REGISTRATION" },
      // faltan 4
    ] as any)
    prismaMock.assetRecordType.createMany.mockResolvedValue({ count: 4 } as any)

    const result = await repairTenant("org_1")
    expect(result.fixed.assetRecordTypes).toBe(4)
  })
})

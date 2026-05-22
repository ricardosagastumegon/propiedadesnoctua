import { describe, it, expect, vi, beforeEach } from "vitest"
import { prismaMock } from "@/test/setup"

// Mock @/auth para controlar la sesión por test.
const authMock = vi.fn()
vi.mock("@/auth", () => ({
  auth: () => authMock(),
}))

import { guardAction, tryGuard, ActionForbiddenError } from "@/lib/action-guard"

function sess(role: string, opts: { userId?: string; orgId?: string } = {}) {
  return {
    user: {
      id: opts.userId ?? "u1",
      role,
      organizationId: opts.orgId ?? "org_1",
      name: "Test User",
    },
  }
}

beforeEach(() => {
  authMock.mockReset()
  prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
})

describe("guardAction — permiso de rol", () => {
  it("OWNER puede crear propiedades", async () => {
    authMock.mockResolvedValue(sess("OWNER"))
    const user = await guardAction({ module: "propiedades", action: "create" })
    expect(user.role).toBe("OWNER")
  })

  it("VIEWER NO puede crear propiedades", async () => {
    authMock.mockResolvedValue(sess("VIEWER"))
    await expect(guardAction({ module: "propiedades", action: "create" })).rejects.toThrow(/no tiene permiso/)
  })

  it("TECHNICIAN NO puede crear propiedades aunque mande propertyId válido", async () => {
    authMock.mockResolvedValue(sess("TECHNICIAN"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
    await expect(
      guardAction({ module: "propiedades", action: "create", propertyId: "p1" }),
    ).rejects.toThrow(/no tiene permiso/)
  })

  it("ACCOUNTANT puede crear pagos pero NO inquilinos", async () => {
    authMock.mockResolvedValue(sess("ACCOUNTANT"))
    await expect(guardAction({ module: "pagos", action: "create" })).resolves.toBeDefined()
    await expect(guardAction({ module: "inquilinos", action: "create" })).rejects.toThrow(/no tiene permiso/)
  })

  it("ASSISTANT puede editar pero NO eliminar", async () => {
    authMock.mockResolvedValue(sess("ASSISTANT"))
    await expect(guardAction({ module: "propiedades", action: "edit" })).resolves.toBeDefined()
    await expect(guardAction({ module: "propiedades", action: "delete" })).rejects.toThrow(/no tiene permiso/)
  })

  it("MANAGER puede aprobar pero NO ve configuracion", async () => {
    authMock.mockResolvedValue(sess("MANAGER"))
    await expect(guardAction({ module: "autorizaciones", action: "edit" })).resolves.toBeDefined()
    await expect(guardAction({ module: "configuracion", action: "edit" })).rejects.toThrow(/no tiene permiso/)
  })

  it("sin sesión → lanza No autenticado", async () => {
    authMock.mockResolvedValue(null)
    await expect(guardAction({ module: "propiedades", action: "create" })).rejects.toThrow(/No autenticado/)
  })
})

describe("guardAction — acceso a propiedad", () => {
  it("OWNER con propertyId pero SIN restricción de propiedades → pasa", async () => {
    authMock.mockResolvedValue(sess("OWNER"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
    await expect(
      guardAction({ module: "propiedades", action: "edit", propertyId: "any_prop" }),
    ).resolves.toBeDefined()
  })

  it("SUPERVISOR con propertyId DENTRO de su lista de UserPropertyAccess → pasa", async () => {
    authMock.mockResolvedValue(sess("SUPERVISOR"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p_mia" } as never,
      { propertyId: "p_otra" } as never,
    ])
    await expect(
      guardAction({ module: "mantenimiento", action: "edit", propertyId: "p_mia" }),
    ).resolves.toBeDefined()
  })

  it("SUPERVISOR intentando editar ticket en propiedad AJENA → lanza ActionForbiddenError", async () => {
    authMock.mockResolvedValue(sess("SUPERVISOR"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p_mia" } as never,
    ])
    await expect(
      guardAction({ module: "mantenimiento", action: "edit", propertyId: "p_ajena" }),
    ).rejects.toThrow(ActionForbiddenError)
    await expect(
      guardAction({ module: "mantenimiento", action: "edit", propertyId: "p_ajena" }),
    ).rejects.toThrow(/No tenés acceso a esa propiedad/)
  })

  it("SUPERVISOR creando algo sin propertyId → bypass del check de propiedad (validación queda en negocio)", async () => {
    authMock.mockResolvedValue(sess("SUPERVISOR"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p_mia" } as never,
    ])
    // SUPERVISOR puede crear cotizaciones según matriz de permisos
    await expect(
      guardAction({ module: "cotizaciones", action: "create" }),
    ).resolves.toBeDefined()
  })
})

describe("tryGuard (wrapper)", () => {
  it("devuelve { user } cuando pasa", async () => {
    authMock.mockResolvedValue(sess("OWNER"))
    const r = await tryGuard({ module: "propiedades", action: "create" })
    expect("user" in r).toBe(true)
  })

  it("devuelve { error } cuando rol no tiene permiso (no lanza)", async () => {
    authMock.mockResolvedValue(sess("VIEWER"))
    const r = await tryGuard({ module: "propiedades", action: "delete" })
    expect("error" in r).toBe(true)
    if ("error" in r) expect(r.error).toMatch(/no tiene permiso/)
  })

  it("devuelve { error } cuando sin acceso a la propiedad", async () => {
    authMock.mockResolvedValue(sess("SUPERVISOR"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p_mia" } as never,
    ])
    const r = await tryGuard({ module: "mantenimiento", action: "edit", propertyId: "p_ajena" })
    expect("error" in r).toBe(true)
    if ("error" in r) expect(r.error).toMatch(/No tenés acceso/)
  })
})

describe("escenarios reales — defense in depth", () => {
  it("SUPERVISOR del Chalet intenta editar ticket de la Casa → bloqueado aunque mande propertyId", async () => {
    authMock.mockResolvedValue(sess("SUPERVISOR", { userId: "pedro" }))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "chalet_id" } as never,
    ])
    // Pedro manda manualmente el propertyId de la Casa
    const r = await tryGuard({ module: "mantenimiento", action: "edit", propertyId: "casa_id" })
    expect("error" in r).toBe(true)
  })

  it("TECHNICIAN intenta crear propiedad — bloqueado a nivel de rol antes de tocar DB", async () => {
    authMock.mockResolvedValue(sess("TECHNICIAN"))
    const r = await tryGuard({ module: "propiedades", action: "create" })
    expect("error" in r).toBe(true)
    expect(prismaMock.userPropertyAccess.findMany).not.toHaveBeenCalled()
  })

  it("OWNER siempre pasa en todo", async () => {
    authMock.mockResolvedValue(sess("OWNER"))
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
    for (const mod of ["propiedades", "mantenimiento", "configuracion", "empleados"] as const) {
      for (const act of ["create", "edit", "delete"] as const) {
        const r = await tryGuard({ module: mod, action: act })
        expect("error" in r, `OWNER en ${mod}/${act}`).toBe(false)
      }
    }
  })
})

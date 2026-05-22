import { describe, it, expect, vi } from "vitest"
import { prismaMock } from "@/test/setup"
import {
  can, getVisibleModules, getAccessiblePropertyIds, canAccessProperty,
  propertyAccessWhere, assertPropertyAccess,
} from "@/lib/permissions"

// Mock next/navigation.notFound para test de assertPropertyAccess
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND") },
}))

const u = (role: string) => ({ id: "u1", role, organizationId: "org_1" })

describe("can(user, module, action)", () => {
  it("OWNER tiene full access en todo", () => {
    expect(can(u("OWNER"), "configuracion", "delete")).toBe(true)
    expect(can(u("OWNER"), "propiedades", "delete")).toBe(true)
    expect(can(u("OWNER"), "empleados", "create")).toBe(true)
  })

  it("VIEWER solo puede ver, no modificar", () => {
    expect(can(u("VIEWER"), "propiedades", "view")).toBe(true)
    expect(can(u("VIEWER"), "propiedades", "create")).toBe(false)
    expect(can(u("VIEWER"), "propiedades", "edit")).toBe(false)
    expect(can(u("VIEWER"), "propiedades", "delete")).toBe(false)
  })

  it("TECHNICIAN solo ve dashboard, mantenimiento y activos", () => {
    expect(can(u("TECHNICIAN"), "dashboard", "view")).toBe(true)
    expect(can(u("TECHNICIAN"), "mantenimiento", "view")).toBe(true)
    expect(can(u("TECHNICIAN"), "activos", "view")).toBe(true)
    expect(can(u("TECHNICIAN"), "contratos", "view")).toBe(false)
    expect(can(u("TECHNICIAN"), "configuracion", "view")).toBe(false)
    expect(can(u("TECHNICIAN"), "empleados", "view")).toBe(false)
  })

  it("TECHNICIAN puede editar mantenimiento (sus tickets) pero no crear ni borrar", () => {
    expect(can(u("TECHNICIAN"), "mantenimiento", "edit")).toBe(true)
    expect(can(u("TECHNICIAN"), "mantenimiento", "create")).toBe(false)
    expect(can(u("TECHNICIAN"), "mantenimiento", "delete")).toBe(false)
  })

  it("ACCOUNTANT ve módulos financieros pero no puede crear inquilinos", () => {
    expect(can(u("ACCOUNTANT"), "pagos", "create")).toBe(true)
    expect(can(u("ACCOUNTANT"), "cajaChica", "create")).toBe(true)
    expect(can(u("ACCOUNTANT"), "reportes", "view")).toBe(true)
    expect(can(u("ACCOUNTANT"), "inquilinos", "create")).toBe(false)
    expect(can(u("ACCOUNTANT"), "mantenimiento", "edit")).toBe(false)
  })

  it("ASSISTANT puede crear pero no eliminar ni autorizar", () => {
    expect(can(u("ASSISTANT"), "propiedades", "create")).toBe(true)
    expect(can(u("ASSISTANT"), "propiedades", "edit")).toBe(true)
    expect(can(u("ASSISTANT"), "propiedades", "delete")).toBe(false)
    expect(can(u("ASSISTANT"), "autorizaciones", "view")).toBe(true)
    expect(can(u("ASSISTANT"), "autorizaciones", "edit")).toBe(false)
    expect(can(u("ASSISTANT"), "configuracion", "view")).toBe(false)
  })

  it("MANAGER puede aprobar pero no eliminar críticos", () => {
    expect(can(u("MANAGER"), "autorizaciones", "edit")).toBe(true)
    expect(can(u("MANAGER"), "aceptaciones", "edit")).toBe(true)
    expect(can(u("MANAGER"), "propiedades", "delete")).toBe(false)
    expect(can(u("MANAGER"), "configuracion", "view")).toBe(false)
  })

  it("SUPERVISOR opera caja chica y mantenimiento de su propiedad", () => {
    expect(can(u("SUPERVISOR"), "cajaChica", "create")).toBe(true)
    expect(can(u("SUPERVISOR"), "mantenimiento", "create")).toBe(true)
    expect(can(u("SUPERVISOR"), "cotizaciones", "create")).toBe(true)
    expect(can(u("SUPERVISOR"), "empleados", "view")).toBe(false)
    expect(can(u("SUPERVISOR"), "configuracion", "view")).toBe(false)
  })

  it("user null o role desconocido → no puede nada", () => {
    expect(can(null, "propiedades", "view")).toBe(false)
    expect(can(undefined, "propiedades", "view")).toBe(false)
    // Rol desconocido cae al VIEWER por seguridad
    expect(can(u("UNKNOWN"), "propiedades", "create")).toBe(false)
  })
})

describe("getVisibleModules", () => {
  it("OWNER ve todos los módulos", () => {
    const mods = getVisibleModules(u("OWNER"))
    expect(mods).toContain("configuracion")
    expect(mods).toContain("empleados")
    expect(mods.length).toBeGreaterThan(10)
  })

  it("TECHNICIAN solo ve 3 módulos", () => {
    const mods = getVisibleModules(u("TECHNICIAN"))
    expect(mods).toEqual(expect.arrayContaining(["dashboard", "mantenimiento", "activos"]))
    expect(mods).not.toContain("configuracion")
    expect(mods).not.toContain("empleados")
    expect(mods).not.toContain("contratos")
  })

  it("VIEWER ve TODO en modo view", () => {
    const mods = getVisibleModules(u("VIEWER"))
    expect(mods.length).toBeGreaterThan(10)
  })
})

describe("getAccessiblePropertyIds", () => {
  it("sin filas en UserPropertyAccess → null (acceso total)", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
    const result = await getAccessiblePropertyIds(u("OWNER"))
    expect(result).toBeNull()
  })

  it("con filas → solo esos IDs", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p1" }, { propertyId: "p3" },
    ] as any)
    const result = await getAccessiblePropertyIds(u("SUPERVISOR"))
    expect(result).toEqual(["p1", "p3"])
  })
})

describe("canAccessProperty (sincrónica con lista pre-cargada)", () => {
  it("acceso total (null) → siempre true", () => {
    expect(canAccessProperty(u("OWNER"), "any_prop", null)).toBe(true)
  })

  it("acceso filtrado: solo las del listado", () => {
    const allowed = ["p1", "p2"]
    expect(canAccessProperty(u("SUPERVISOR"), "p1", allowed)).toBe(true)
    expect(canAccessProperty(u("SUPERVISOR"), "p99", allowed)).toBe(false)
  })

  it("user null → false", () => {
    expect(canAccessProperty(null, "p1", null)).toBe(false)
  })
})

describe("propertyAccessWhere", () => {
  it("sin restricción → {} (acceso total, no filtra)", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
    const w = await propertyAccessWhere(u("OWNER"))
    expect(w).toEqual({})
  })

  it("con restricción → { propertyId: { in: [...] } }", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p1" }, { propertyId: "p2" },
    ] as any)
    const w = await propertyAccessWhere(u("SUPERVISOR"))
    expect(w).toEqual({ propertyId: { in: ["p1", "p2"] } })
  })
})

describe("assertPropertyAccess", () => {
  it("usuario con acceso total → no lanza", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([])
    await expect(assertPropertyAccess(u("OWNER"), "any_prop")).resolves.toBeUndefined()
  })

  it("usuario con acceso a la propiedad → no lanza", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p1" }, { propertyId: "p2" },
    ] as any)
    await expect(assertPropertyAccess(u("SUPERVISOR"), "p1")).resolves.toBeUndefined()
  })

  it("usuario sin acceso a la propiedad → lanza notFound", async () => {
    prismaMock.userPropertyAccess.findMany.mockResolvedValue([
      { propertyId: "p1" },
    ] as any)
    await expect(assertPropertyAccess(u("SUPERVISOR"), "p99")).rejects.toThrow("NOT_FOUND")
  })
})

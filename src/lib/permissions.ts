// Sistema de permisos por rol. Una sola fuente de verdad para:
// - Qué módulos ve cada rol (sidebar)
// - Qué acciones puede hacer en cada módulo (botones, server actions)
// - Filtro de acceso a propiedades específicas (UserPropertyAccess)
import { prisma } from "@/lib/prisma"

export const MODULES = [
  "dashboard",
  "propiedades",
  "inquilinos",
  "contratos",
  "pagos",
  "cajaChica",
  "mantenimiento",
  "activos",
  "proyectos",
  "proveedores",
  "cotizaciones",
  "empleados",
  "autorizaciones",
  "aceptaciones",
  "reportes",
  "configuracion",
] as const
export type Module = typeof MODULES[number]

export interface ModulePermission {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export type Action = keyof ModulePermission

const NONE: ModulePermission = { view: false, create: false, edit: false, delete: false }
const VIEW: ModulePermission = { view: true, create: false, edit: false, delete: false }
const RW:   ModulePermission = { view: true, create: true,  edit: true,  delete: false }
const FULL: ModulePermission = { view: true, create: true,  edit: true,  delete: true }

function allFull(): Record<Module, ModulePermission> {
  return Object.fromEntries(MODULES.map(m => [m, FULL])) as Record<Module, ModulePermission>
}

function allView(): Record<Module, ModulePermission> {
  return Object.fromEntries(MODULES.map(m => [m, VIEW])) as Record<Module, ModulePermission>
}

function allNone(): Record<Module, ModulePermission> {
  return Object.fromEntries(MODULES.map(m => [m, NONE])) as Record<Module, ModulePermission>
}

export const ROLE_PERMISSIONS: Record<string, Record<Module, ModulePermission>> = {
  // OWNER: dueño, control total sin restricciones
  OWNER: allFull(),

  // ADMIN: casi como OWNER. Puede gestionar usuarios.
  ADMIN: allFull(),

  // MANAGER: gerente operativo. Crea y edita pero no borra crítico. No ve empleados ni configuración profunda.
  MANAGER: {
    dashboard: VIEW,
    propiedades: RW,
    inquilinos: RW,
    contratos: RW,
    pagos: RW,
    cajaChica: RW,
    mantenimiento: RW,
    activos: RW,
    proyectos: RW,
    proveedores: RW,
    cotizaciones: RW,
    empleados: VIEW,
    autorizaciones: { view: true, create: true, edit: true, delete: false },
    aceptaciones: { view: true, create: true, edit: true, delete: false },
    reportes: VIEW,
    configuracion: NONE,
  },

  // ACCOUNTANT: contador. Ve la parte financiera, no opera propiedades.
  ACCOUNTANT: {
    dashboard: VIEW,
    propiedades: VIEW,
    inquilinos: VIEW,
    contratos: VIEW,
    pagos: RW,
    cajaChica: RW,
    mantenimiento: VIEW,
    activos: VIEW,
    proyectos: VIEW,
    proveedores: VIEW,
    cotizaciones: VIEW,
    empleados: NONE,
    autorizaciones: VIEW,
    aceptaciones: VIEW,
    reportes: VIEW,
    configuracion: NONE,
  },

  // SUPERVISOR: encargado de una propiedad. Acceso filtrado por UserPropertyAccess.
  SUPERVISOR: {
    dashboard: VIEW,
    propiedades: { view: true, create: false, edit: true, delete: false },
    inquilinos: VIEW,
    contratos: VIEW,
    pagos: VIEW,
    cajaChica: RW,
    mantenimiento: RW,
    activos: RW,
    proyectos: { view: true, create: true, edit: true, delete: false },
    proveedores: VIEW,
    cotizaciones: RW,
    empleados: NONE,
    autorizaciones: { view: true, create: false, edit: false, delete: false },
    aceptaciones: { view: true, create: false, edit: false, delete: false },
    reportes: VIEW,
    configuracion: NONE,
  },

  // ASSISTANT: asistente operativo. Crea pero no aprueba ni borra.
  ASSISTANT: {
    dashboard: VIEW,
    propiedades: { view: true, create: true, edit: true, delete: false },
    inquilinos: { view: true, create: true, edit: true, delete: false },
    contratos: { view: true, create: true, edit: true, delete: false },
    pagos: { view: true, create: true, edit: false, delete: false },
    cajaChica: { view: true, create: true, edit: false, delete: false },
    mantenimiento: { view: true, create: true, edit: true, delete: false },
    activos: { view: true, create: true, edit: true, delete: false },
    proyectos: { view: true, create: true, edit: true, delete: false },
    proveedores: { view: true, create: true, edit: true, delete: false },
    cotizaciones: { view: true, create: true, edit: true, delete: false },
    empleados: NONE,
    autorizaciones: VIEW,
    aceptaciones: VIEW,
    reportes: VIEW,
    configuracion: NONE,
  },

  // TECHNICIAN: técnico de mantenimiento. Solo ve sus tickets asignados y activos relacionados.
  TECHNICIAN: {
    ...allNone(),
    dashboard: VIEW,
    mantenimiento: { view: true, create: false, edit: true, delete: false },
    activos: VIEW,
  },

  // VIEWER: solo lectura, sin nada que modificar.
  VIEWER: allView(),
}

// User shape mínimo que necesitan estos helpers (sub-set de Session.user / Prisma User)
export interface UserForPermissions {
  id: string
  role: string
  organizationId: string
}

function permsForRole(role: string): Record<Module, ModulePermission> {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.VIEWER
}

/**
 * Chequeo principal: ¿el usuario puede realizar `action` en `module`?
 */
export function can(user: UserForPermissions | null | undefined, module: Module, action: Action): boolean {
  if (!user) return false
  return permsForRole(user.role)[module]?.[action] ?? false
}

/**
 * Lista de módulos VISIBLES (action="view") — para el sidebar.
 */
export function getVisibleModules(user: UserForPermissions | null | undefined): Module[] {
  if (!user) return []
  const perms = permsForRole(user.role)
  return MODULES.filter(m => perms[m].view)
}

/**
 * IDs de propiedades a las que el usuario tiene acceso.
 * - Si NO tiene filas en UserPropertyAccess → ve todas las de su org.
 * - Si tiene filas → solo esas.
 *
 * Devuelve `null` para indicar "todas las de la org" (no filtrar).
 * Devuelve array para indicar "solo estos IDs".
 */
export async function getAccessiblePropertyIds(user: UserForPermissions): Promise<string[] | null> {
  const access = await prisma.userPropertyAccess.findMany({
    where: { userId: user.id },
    select: { propertyId: true },
  })
  if (access.length === 0) return null
  return access.map(a => a.propertyId)
}

/**
 * Versión síncrona: chequea si un usuario puede acceder a UNA propiedad específica,
 * dado el listado pre-cargado de propertyIds (o null = todas).
 */
export function canAccessProperty(
  user: UserForPermissions | null | undefined,
  propertyId: string,
  accessiblePropertyIds: string[] | null,
): boolean {
  if (!user) return false
  if (accessiblePropertyIds === null) return true
  return accessiblePropertyIds.includes(propertyId)
}

/**
 * Helper para usar en where clauses de Prisma.
 * Retorna `{ propertyId: { in: [...] } }` o `{}` si tiene acceso total.
 */
export async function propertyAccessWhere(user: UserForPermissions): Promise<{ propertyId?: { in: string[] } }> {
  const ids = await getAccessiblePropertyIds(user)
  if (ids === null) return {}
  return { propertyId: { in: ids } }
}

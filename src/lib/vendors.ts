// Helpers para queries de Vendor que se repetían en múltiples páginas.
import { prisma } from "@/lib/prisma"

/**
 * Lista de proveedores activos para una org, ordenados por nombre.
 * Con los campos necesarios para QuoteForm + VendorCard (vista compact/expanded).
 *
 * Usado en: /proyectos/[id], /mantenimiento/[id], /cotizaciones/nueva.
 */
export function getVendorsForOrg(orgId: string) {
  return prisma.vendor.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      contactName: true,
      phone: true,
      email: true,
      rating: true,
    },
  })
}

/**
 * Variante mínima cuando solo se necesita {id, name} (selects rápidos).
 */
export function getVendorsMinimal(orgId: string) {
  return prisma.vendor.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

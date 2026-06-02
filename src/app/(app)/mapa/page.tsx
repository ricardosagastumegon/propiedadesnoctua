import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { getAccessiblePropertyIds } from "@/lib/permissions"
import { MapWrapper } from "./_map-wrapper"
import { differenceInDays } from "date-fns"

export const dynamic = "force-dynamic"

export type PropertyStatus = "ACTIVE" | "VACANT" | "EXPIRING" | "EXPIRED"

export interface MapProperty {
  id: string
  name: string
  alias: string | null
  city: string
  department: string
  type: string
  status: PropertyStatus
  lat: number
  lon: number
  /** Mes 1-12 del próximo vencimiento; null si vacante / sin contrato activo */
  expirationMonth: number | null
  /** Año del próximo vencimiento */
  expirationYear: number | null
  /** Inquilino actual (si hay contrato activo) */
  tenantName: string | null
  /** Renta mensual (si hay contrato activo) */
  monthlyRent: number | null
  /** Días hasta vencimiento (negativo si ya venció) */
  daysToExpiry: number | null
}

export default async function MapaPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const accessibleIds = await getAccessiblePropertyIds({
    id: session.user.id, role: session.user.role, organizationId: orgId,
  })

  const properties = await prisma.property.findMany({
    where: {
      organizationId: orgId,
      ...(accessibleIds !== null ? { id: { in: accessibleIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      alias: true,
      city: true,
      department: true,
      type: true,
      latitude: true,
      longitude: true,
      contracts: {
        where: { status: { in: ["ACTIVE", "RENEWED"] } },
        orderBy: { endDate: "desc" },
        take: 1,
        select: {
          endDate: true,
          monthlyRent: true,
          status: true,
          tenant: { select: { fullName: true } },
        },
      },
    },
  })

  const now = new Date()
  const mapped: MapProperty[] = properties
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => {
      const c = p.contracts[0]
      let status: PropertyStatus = "VACANT"
      let expirationMonth: number | null = null
      let expirationYear: number | null = null
      let tenantName: string | null = null
      let monthlyRent: number | null = null
      let daysToExpiry: number | null = null

      if (c) {
        tenantName = c.tenant?.fullName ?? null
        monthlyRent = c.monthlyRent
        const end = new Date(c.endDate)
        daysToExpiry = differenceInDays(end, now)
        expirationMonth = end.getMonth() + 1
        expirationYear = end.getFullYear()
        if (daysToExpiry < 0) status = "EXPIRED"
        else if (daysToExpiry <= 90) status = "EXPIRING"
        else status = "ACTIVE"
      }

      return {
        id: p.id,
        name: p.name,
        alias: p.alias,
        city: p.city,
        department: p.department,
        type: p.type,
        status,
        lat: p.latitude!,
        lon: p.longitude!,
        expirationMonth,
        expirationYear,
        tenantName,
        monthlyRent,
        daysToExpiry,
      }
    })

  // Centroide para centrar el mapa por default
  const center = mapped.length > 0
    ? {
        lat: mapped.reduce((s, p) => s + p.lat, 0) / mapped.length,
        lon: mapped.reduce((s, p) => s + p.lon, 0) / mapped.length,
      }
    : { lat: 14.6349, lon: -90.5069 } // Guatemala City default

  // Propiedades SIN coordenadas (las mostramos en una lista aparte)
  const withoutCoords = properties.filter(p => p.latitude == null || p.longitude == null)

  // Stats
  const stats = {
    total: properties.length,
    mapped: mapped.length,
    active: mapped.filter(p => p.status === "ACTIVE").length,
    expiring: mapped.filter(p => p.status === "EXPIRING").length,
    expired: mapped.filter(p => p.status === "EXPIRED").length,
    vacant: mapped.filter(p => p.status === "VACANT").length,
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Mapa de propiedades"
        description={`${stats.mapped} de ${stats.total} propiedades en el mapa · ${stats.active} activas · ${stats.expiring} por vencer · ${stats.expired} vencidas · ${stats.vacant} vacantes`}
      />

      {mapped.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="font-display text-lg mb-2">No hay propiedades con coordenadas</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Para que aparezcan en el mapa, ingresá la latitud y longitud al crear o editar cada propiedad.
            Podés obtener las coordenadas desde Google Maps haciendo click derecho sobre el lote.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <MapWrapper properties={mapped} center={center} />
        </Card>
      )}

      {withoutCoords.length > 0 && (
        <Card className="p-5 mt-6">
          <h3 className="font-medium text-sm">Sin coordenadas ({withoutCoords.length})</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Estas propiedades no aparecen en el mapa. Editalas y agregá latitud/longitud.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {withoutCoords.map(p => (
              <a
                key={p.id}
                href={`/propiedades/${p.id}/editar`}
                className="text-sm border rounded-md px-3 py-2 hover:bg-muted/50 truncate"
              >
                {p.name} <span className="text-muted-foreground">· {p.city}</span>
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

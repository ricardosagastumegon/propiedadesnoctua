import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { isValidPolygon, type LatLng } from "@/lib/geo"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { AcqTabs } from "../_tabs"
import { AcqMap, type AcqMapItem, type PoiPoint } from "./_map"

export const dynamic = "force-dynamic"

export default async function AdquisicionesMapaPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")

  const [rows, settings] = await Promise.all([
    prisma.acquisitionCandidate.findMany({
      where: { OR: [{ organizationId: me }, { link: { intermediaryOrgId: me } }] },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organizationSettings.findUnique({ where: { organizationId: me }, select: { poiEnabled: true } }),
  ])

  const items: AcqMapItem[] = rows
    .map(c => ({
      id: c.id, title: c.title, stage: c.stage,
      price: c.price, currency: c.currency,
      lat: c.latitude, lng: c.longitude,
      polygon: isValidPolygon(c.mapPolygon) ? (c.mapPolygon as LatLng[]) : null,
      categories: c.categories,
    }))
    .filter(c => c.lat != null && c.lng != null)

  let pois: PoiPoint[] = []
  if (settings?.poiEnabled) {
    const p = await prisma.pointOfInterest.findMany({
      where: { organizationId: me, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, name: true, category: true, municipality: true, latitude: true, longitude: true },
    })
    pois = p.map(x => ({ id: x.id, name: x.name, category: x.category, municipality: x.municipality, lat: x.latitude!, lng: x.longitude! }))
  }

  const withoutLocation = rows.length - items.length
  const empty = items.length === 0 && pois.length === 0

  return (
    <div className="p-6 md:p-8 space-y-4">
      <PageHeader title="Mapa de adquisiciones" description="Propiedades recibidas y puntos de interés, ubicados con su precio." />
      {settings?.poiEnabled && <AcqTabs />}

      {empty ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nada ubicado en el mapa todavía.
        </Card>
      ) : (
        <>
          <AcqMap items={items} pois={pois} />
          {withoutLocation > 0 && (
            <p className="text-xs text-muted-foreground">
              {withoutLocation} propiedad(es) sin ubicación en el mapa (solo con catastro). Aparecen en la lista.
            </p>
          )}
        </>
      )}
    </div>
  )
}

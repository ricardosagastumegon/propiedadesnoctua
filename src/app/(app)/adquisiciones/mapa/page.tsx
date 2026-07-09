import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { isValidPolygon, type LatLng } from "@/lib/geo"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { List } from "lucide-react"
import { AcqMap, type AcqMapItem } from "./_map"

export const dynamic = "force-dynamic"

export default async function AdquisicionesMapaPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")

  const rows = await prisma.acquisitionCandidate.findMany({
    where: { OR: [{ organizationId: me }, { link: { intermediaryOrgId: me } }] },
    orderBy: { createdAt: "desc" },
  })

  const items: AcqMapItem[] = rows
    .map(c => ({
      id: c.id, title: c.title, stage: c.stage,
      price: c.price, currency: c.currency,
      lat: c.latitude, lng: c.longitude,
      polygon: isValidPolygon(c.mapPolygon) ? (c.mapPolygon as LatLng[]) : null,
    }))
    .filter(c => c.lat != null && c.lng != null)

  const withoutLocation = rows.length - items.length

  return (
    <div className="p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageHeader title="Mapa de adquisiciones" description="Todas las propiedades recibidas, ubicadas y con su precio." />
        <Link href="/adquisiciones" className="text-sm inline-flex items-center gap-1 rounded-lg border px-3 py-2 hover:bg-muted/50">
          <List className="size-4" /> Ver lista
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Ninguna propiedad tiene ubicación en el mapa todavía. Las que se envíen con catastro georreferenciado o con contorno aparecerán acá.
        </Card>
      ) : (
        <>
          <AcqMap items={items} />
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

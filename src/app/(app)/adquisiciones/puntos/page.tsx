import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/page-header"
import { AcqTabs } from "../_tabs"
import { PoiManager, type Poi } from "./_poi-manager"

export const dynamic = "force-dynamic"

export default async function PuntosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")

  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: me }, select: { poiEnabled: true } })
  if (!settings?.poiEnabled) redirect("/adquisiciones")

  const [rows, perms] = await Promise.all([
    prisma.pointOfInterest.findMany({
      where: { organizationId: me },
      orderBy: { createdAt: "asc" },
      include: { sharedByOrg: { select: { name: true } } },
    }),
    prisma.acquisitionForwardPermission.findMany({
      where: { senderOrgId: me },
      select: { receiver: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ])
  const pois: Poi[] = rows.map(p => ({
    id: p.id, name: p.name, category: p.category, municipality: p.municipality,
    latitude: p.latitude, longitude: p.longitude,
    mine: p.sharedByOrgId == null,
    origin: p.sharedByOrgId != null ? (p.sharedByOrg?.name ?? "Compartido") : null,
  }))
  const shareTargets = perms.map(p => p.receiver)

  return (
    <div className="p-6 md:p-8 space-y-4">
      <PageHeader title="Puntos de interés" description="Gasolineras y lugares de referencia. Se ven en el mapa junto a lo que te ofrecen." />
      <AcqTabs />
      <PoiManager pois={pois} canEdit={can(user, "adquisiciones", "edit")} shareTargets={shareTargets} />
    </div>
  )
}

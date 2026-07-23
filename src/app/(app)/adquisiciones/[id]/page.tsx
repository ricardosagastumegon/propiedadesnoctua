import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { pricePerV2 } from "@/lib/deal-score"
import { CandidateDetail } from "./_detail"

export const dynamic = "force-dynamic"

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")

  const c = await prisma.acquisitionCandidate.findFirst({
    where: { id, OR: [{ organizationId: me }, { link: { intermediaryOrgId: me } }] },
    include: {
      negotiations: { orderBy: { createdAt: "asc" } },
      link: { select: { name: true } },
      submittedByOrg: { select: { name: true } },
    },
  })
  if (!c) notFound()
  const isOwner = c.organizationId === me

  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: me }, select: { fxUsdGtq: true } })
  const fx = settings?.fxUsdGtq ?? 7.5

  // Origen (quién la cargó) para trazabilidad.
  const origin = c.source === "FORWARDED"
    ? (c.submittedByOrg?.name ? `${c.submittedByOrg.name} (enviada)` : "Reenviada")
    : c.source === "MANUAL" ? "Manual" : (c.link?.name ?? "Público")

  // Destinos a los que puedo reenviar esta propiedad (allowlist). Solo si es MÍA y
  // ORIGINADA por mí — las que me reenviaron (submittedByOrgId != null) no se re-reenvían.
  const canForward = isOwner && c.submittedByOrgId == null
  const forwardTargets = canForward
    ? (await prisma.acquisitionForwardPermission.findMany({
        where: { senderOrgId: me },
        select: { receiver: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      })).map(p => p.receiver)
    : []
  const negotiations = c.negotiations.map(n => ({ id: n.id, kind: n.kind, amount: n.amount, currency: n.currency, note: n.note, createdAt: n.createdAt.toISOString() }))

  // Referencia automática: precio/v² de tus otras propiedades en el mismo departamento
  let autoRef: { count: number; avg: number; min: number; max: number; dept: string } | null = null
  if (c.department) {
    const deptCands = await prisma.acquisitionCandidate.findMany({
      where: { organizationId: c.organizationId, department: c.department, id: { not: c.id }, area: { not: null }, price: { not: null } },
      select: { price: true, area: true, areaUnit: true, cuerdaVaras: true },
    })
    const ppvs = deptCands.map(pricePerV2).filter((x): x is number => x != null)
    if (ppvs.length) {
      autoRef = { count: ppvs.length, avg: ppvs.reduce((a, b) => a + b, 0) / ppvs.length, min: Math.min(...ppvs), max: Math.max(...ppvs), dept: c.department }
    }
  }

  return (
    <CandidateDetail
      autoRef={autoRef}
      fx={fx}
      negotiations={negotiations}
      origin={origin}
      forwardTargets={forwardTargets}
      candidate={{
        id: c.id, stage: c.stage, title: c.title, propertyType: c.propertyType,
        department: c.department, city: c.city, zone: c.zone, addressLine: c.addressLine,
        cadastralNumber: c.cadastralNumber, hasLocation: c.latitude != null && c.longitude != null,
        price: c.price, currency: c.currency, bedrooms: c.bedrooms, bathrooms: c.bathrooms,
        area: c.area, description: c.description, galleryUrls: c.galleryUrls,
        documentUrls: c.documentUrls, latitude: c.latitude, longitude: c.longitude,
        agentName: c.agentName, agentPhone: c.agentPhone, agentEmail: c.agentEmail,
        analysisNotes: c.analysisNotes, categories: c.categories,
        areaUnit: c.areaUnit, cuerdaVaras: c.cuerdaVaras,
        refPriceMinV2: c.refPriceMinV2, refPriceMaxV2: c.refPriceMaxV2,
        isCommercial: c.isCommercial, offerPerV2: c.offerPerV2,
        createdAt: c.createdAt.toISOString(),
      }}
      canEdit={isOwner && can(user, "adquisiciones", "edit")}
      canDelete={isOwner && can(user, "adquisiciones", "delete")}
    />
  )
}

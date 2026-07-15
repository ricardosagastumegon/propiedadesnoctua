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
  })
  if (!c) notFound()
  const isOwner = c.organizationId === me

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
      candidate={{
        id: c.id, stage: c.stage, title: c.title, propertyType: c.propertyType,
        department: c.department, city: c.city, zone: c.zone, addressLine: c.addressLine,
        cadastralNumber: c.cadastralNumber, hasLocation: c.latitude != null && c.longitude != null,
        price: c.price, currency: c.currency, bedrooms: c.bedrooms, bathrooms: c.bathrooms,
        area: c.area, description: c.description, galleryUrls: c.galleryUrls,
        agentName: c.agentName, agentPhone: c.agentPhone, agentEmail: c.agentEmail,
        analysisNotes: c.analysisNotes,
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

import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { CandidateDetail } from "./_detail"

export const dynamic = "force-dynamic"

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")

  const c = await prisma.acquisitionCandidate.findFirst({ where: { id, organizationId: orgId } })
  if (!c) notFound()

  return (
    <CandidateDetail
      candidate={{
        id: c.id, stage: c.stage, title: c.title, propertyType: c.propertyType,
        department: c.department, city: c.city, zone: c.zone, addressLine: c.addressLine,
        price: c.price, currency: c.currency, bedrooms: c.bedrooms, bathrooms: c.bathrooms,
        area: c.area, description: c.description, galleryUrls: c.galleryUrls,
        agentName: c.agentName, agentPhone: c.agentPhone, agentEmail: c.agentEmail,
        analysisNotes: c.analysisNotes, estimatedValue: c.estimatedValue, offerAmount: c.offerAmount,
        createdAt: c.createdAt.toISOString(),
      }}
      canEdit={can(user, "adquisiciones", "edit")}
      canDelete={can(user, "adquisiciones", "delete")}
    />
  )
}

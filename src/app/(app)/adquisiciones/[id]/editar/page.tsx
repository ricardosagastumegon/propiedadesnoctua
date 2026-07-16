import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/page-header"
import { CandidateForm } from "../../_candidate-form"

export const dynamic = "force-dynamic"

export default async function EditarCandidataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "edit")) redirect("/adquisiciones")

  const c = await prisma.acquisitionCandidate.findFirst({ where: { id, organizationId: me } })
  if (!c) notFound()

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Editar propiedad" description="Corregí ubicación, datos o cualquier información." />
      <div className="mt-4">
        <CandidateForm initial={{
          id: c.id, title: c.title, propertyType: c.propertyType, department: c.department, city: c.city, zone: c.zone,
          addressLine: c.addressLine, cadastralNumber: c.cadastralNumber, price: c.price, currency: c.currency,
          bedrooms: c.bedrooms, bathrooms: c.bathrooms, area: c.area, areaUnit: c.areaUnit, cuerdaVaras: c.cuerdaVaras,
          description: c.description, galleryUrls: c.galleryUrls, documentUrls: c.documentUrls,
          mapPolygon: c.mapPolygon, latitude: c.latitude, longitude: c.longitude,
        }} />
      </div>
    </div>
  )
}

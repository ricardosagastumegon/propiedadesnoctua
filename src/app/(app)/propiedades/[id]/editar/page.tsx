import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { PropertyForm } from "../../_components/property-form"
import { updateProperty } from "../../actions"

export default async function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const property = await prisma.property.findFirst({ where: { id, organizationId: orgId } })
  if (!property) notFound()

  const action = async (fd: FormData) => {
    "use server"
    return updateProperty(id, fd)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title={`Editar: ${property.name}`} description="Modifica los datos de la propiedad." />
      <PropertyForm property={property} action={action} submitLabel="Guardar cambios" />
    </div>
  )
}

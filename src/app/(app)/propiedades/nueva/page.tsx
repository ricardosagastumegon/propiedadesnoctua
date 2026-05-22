import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PageHeader } from "@/components/ui/page-header"
import { PropertyForm } from "../_components/property-form"
import { createProperty } from "../actions"
import { can } from "@/lib/permissions"

export default async function NuevaPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = { id: session.user.id, role: session.user.role, organizationId: session.user.organizationId }
  if (!can(user, "propiedades", "create")) redirect("/propiedades")

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Nueva propiedad" description="Registra una propiedad en tu portafolio." />
      <PropertyForm action={createProperty} submitLabel="Crear propiedad" />
    </div>
  )
}

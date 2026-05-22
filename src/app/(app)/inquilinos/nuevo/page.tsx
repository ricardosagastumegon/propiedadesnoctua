import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PageHeader } from "@/components/ui/page-header"
import { TenantForm } from "../_components/tenant-form"
import { createTenant } from "../actions"
import { can } from "@/lib/permissions"

export default async function NuevoInquilinoPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = { id: session.user.id, role: session.user.role, organizationId: session.user.organizationId }
  if (!can(user, "inquilinos", "create")) redirect("/inquilinos")

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Nuevo inquilino" description="Registra un inquilino para asignarlo a contratos." />
      <TenantForm action={createTenant} submitLabel="Crear inquilino" />
    </div>
  )
}

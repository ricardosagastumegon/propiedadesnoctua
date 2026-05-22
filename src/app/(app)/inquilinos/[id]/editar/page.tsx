import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { TenantForm } from "../../_components/tenant-form"
import { updateTenant } from "../../actions"
import { can } from "@/lib/permissions"

export default async function EditarInquilinoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  if (!can(user, "inquilinos", "edit")) redirect("/inquilinos")

  const tenant = await prisma.tenant.findFirst({ where: { id, organizationId: orgId } })
  if (!tenant) notFound()

  const action = async (fd: FormData) => {
    "use server"
    return updateTenant(id, fd)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title={`Editar: ${tenant.fullName}`} description="Actualiza los datos del inquilino." />
      <TenantForm tenant={tenant} action={action} submitLabel="Guardar cambios" />
    </div>
  )
}

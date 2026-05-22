import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { VendorForm } from "../../_components/vendor-form"
import { updateVendor } from "../../actions"
import { can } from "@/lib/permissions"

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  if (!can(user, "proveedores", "edit")) redirect("/proveedores")
  const { id } = await params

  const vendor = await prisma.vendor.findFirst({ where: { id, organizationId: orgId } })
  if (!vendor) notFound()

  async function action(fd: FormData) {
    "use server"
    return updateVendor(id, fd)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Editar proveedor" description={vendor.name} />
      <VendorForm action={action} defaultValues={vendor as any} />
    </div>
  )
}

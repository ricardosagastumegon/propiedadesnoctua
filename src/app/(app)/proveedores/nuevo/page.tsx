import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PageHeader } from "@/components/ui/page-header"
import { VendorForm } from "../_components/vendor-form"
import { createVendor } from "../actions"
import { can } from "@/lib/permissions"

export default async function NuevoProveedorPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = { id: session.user.id, role: session.user.role, organizationId: session.user.organizationId }
  if (!can(user, "proveedores", "create")) redirect("/proveedores")

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Nuevo proveedor" description="Registra un proveedor de servicios." />
      <VendorForm action={createVendor} />
    </div>
  )
}

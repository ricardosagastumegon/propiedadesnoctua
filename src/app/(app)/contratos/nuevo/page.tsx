import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { ContractForm } from "../_components/contract-form"
import { createContract } from "../actions"
import { can } from "@/lib/permissions"

export default async function NuevoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; tenantId?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  if (!can(user, "contratos", "create")) redirect("/contratos")
  const sp = await searchParams

  const [properties, tenants] = await Promise.all([
    prisma.property.findMany({ where: { organizationId: orgId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.tenant.findMany({ where: { organizationId: orgId }, orderBy: { fullName: "asc" } }),
  ])

  const year = new Date().getFullYear()
  const count = await prisma.contract.count({ where: { organizationId: orgId } })
  const suggestedNumber = `C-${year}-${String(count + 1).padStart(4, "0")}`

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Nuevo contrato" description="Registra un contrato de arrendamiento." />
      <ContractForm
        properties={properties}
        tenants={tenants}
        defaultPropertyId={sp.propertyId}
        defaultTenantId={sp.tenantId}
        suggestedNumber={suggestedNumber}
        action={createContract}
      />
    </div>
  )
}

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

  const [properties, tenants, parcels] = await Promise.all([
    prisma.property.findMany({ where: { organizationId: orgId, status: { notIn: ["INACTIVE", "SOLD"] } }, orderBy: { name: "asc" } }),
    prisma.tenant.findMany({ where: { organizationId: orgId }, orderBy: { fullName: "asc" } }),
    prisma.propertyParcel.findMany({
      where: { property: { organizationId: orgId } },
      select: { id: true, name: true, cadastralNumber: true, propertyId: true },
      orderBy: { orderIndex: "asc" },
    }),
  ])

  const parcelsByProperty: Record<string, { id: string; name: string | null; cadastralNumber: string | null }[]> = {}
  for (const pc of parcels) {
    (parcelsByProperty[pc.propertyId] ??= []).push({ id: pc.id, name: pc.name, cadastralNumber: pc.cadastralNumber })
  }

  const year = new Date().getFullYear()
  const count = await prisma.contract.count({ where: { organizationId: orgId } })
  const suggestedNumber = `C-${year}-${String(count + 1).padStart(4, "0")}`

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Detalles del contrato" description="Registrá los términos del contrato (renta, depósito, fechas) para el seguimiento financiero." />
      <ContractForm
        properties={properties}
        tenants={tenants}
        parcelsByProperty={parcelsByProperty}
        defaultPropertyId={sp.propertyId}
        defaultTenantId={sp.tenantId}
        suggestedNumber={suggestedNumber}
        action={createContract}
      />
    </div>
  )
}

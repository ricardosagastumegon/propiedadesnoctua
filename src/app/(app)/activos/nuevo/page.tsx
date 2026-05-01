import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { AssetForm } from "../_components/asset-form"
import { createAsset } from "../actions"

export default async function NuevoActivoPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const sp = await searchParams

  const properties = await prisma.property.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Nuevo activo" description="Registra un equipo, vehiculo o bien de la organizacion." />
      <AssetForm properties={properties} defaultPropertyId={sp.propertyId} action={createAsset} />
    </div>
  )
}

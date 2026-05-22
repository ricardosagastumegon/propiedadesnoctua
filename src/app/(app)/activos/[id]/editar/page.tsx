import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { AssetForm } from "../../_components/asset-form"
import { updateAsset } from "../../actions"

export default async function EditarActivoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const { id } = await params

  const asset = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
  if (!asset) notFound()

  const properties = await prisma.property.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } })

  async function action(fd: FormData) {
    "use server"
    return updateAsset(id, fd)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Editar activo" description={asset.name} />
      <AssetForm properties={properties} action={action} defaultValues={asset as any} />
    </div>
  )
}

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { ProjectForm } from "../_components/project-form"
import { createProject } from "../actions"

export default async function NuevoProyectoPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const sp = await searchParams

  const properties = await prisma.property.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Nuevo proyecto" description="Planifica y controla proyectos de mejora o construccion." />
      <ProjectForm properties={properties} defaultPropertyId={sp.propertyId} action={createProject} />
    </div>
  )
}

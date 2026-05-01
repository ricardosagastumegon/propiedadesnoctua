import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { ProjectForm } from "../../_components/project-form"
import { updateProject } from "../../actions"

export default async function EditarProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const project = await prisma.project.findFirst({ where: { id, organizationId: orgId } })
  if (!project) notFound()

  const properties = await prisma.property.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } })

  async function action(fd: FormData) {
    "use server"
    return updateProject(id, fd)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Editar proyecto" description={project.name} />
      <ProjectForm properties={properties} action={action} defaultValues={project as any} />
    </div>
  )
}

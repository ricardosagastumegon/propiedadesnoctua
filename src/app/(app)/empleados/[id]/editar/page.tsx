import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { EmployeeForm } from "../../_components/employee-form"
import { updateEmployee } from "../../actions"
import { can } from "@/lib/permissions"

export default async function EditarEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  if (!can(user, "empleados", "edit")) redirect("/empleados")
  const { id } = await params

  const employee = await prisma.employee.findFirst({ where: { id, organizationId: orgId } })
  if (!employee) notFound()

  async function action(fd: FormData) {
    "use server"
    return updateEmployee(id, fd)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Editar empleado" description={employee.fullName} />
      <EmployeeForm action={action} defaultValues={employee as any} />
    </div>
  )
}

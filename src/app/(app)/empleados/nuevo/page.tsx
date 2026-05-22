import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PageHeader } from "@/components/ui/page-header"
import { EmployeeForm } from "../_components/employee-form"
import { createEmployee } from "../actions"
import { can } from "@/lib/permissions"

export default async function NuevoEmpleadoPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = { id: session.user.id, role: session.user.role, organizationId: session.user.organizationId }
  if (!can(user, "empleados", "create")) redirect("/empleados")

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Nuevo empleado" description="Registra un empleado o colaborador." />
      <EmployeeForm action={createEmployee} />
    </div>
  )
}

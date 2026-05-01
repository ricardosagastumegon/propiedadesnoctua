import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PageHeader } from "@/components/ui/page-header"
import { EmployeeForm } from "../_components/employee-form"
import { createEmployee } from "../actions"

export default async function NuevoEmpleadoPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Nuevo empleado" description="Registra un empleado o colaborador." />
      <EmployeeForm action={createEmployee} />
    </div>
  )
}

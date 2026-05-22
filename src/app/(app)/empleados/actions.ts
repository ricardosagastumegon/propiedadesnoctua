"use server"
import { prisma } from "@/lib/prisma"
import { employeeSchema } from "@/lib/schemas/employee"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { tryGuard, guardAction } from "@/lib/action-guard"

export async function createEmployee(formData: FormData) {
  const g = await tryGuard({ module: "empleados", action: "create" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = employeeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const emp = await prisma.employee.create({
    data: {
      organizationId: orgId,
      ...parsed.data,
      email: parsed.data.email || null,
      terminationDate: parsed.data.terminationDate ? new Date(parsed.data.terminationDate) : null,
      hireDate: new Date(parsed.data.hireDate),
    },
  })
  revalidatePath("/empleados")
  return { redirectTo: `/empleados/${emp.id}` }
}

export async function updateEmployee(id: string, formData: FormData) {
  const g = await tryGuard({ module: "empleados", action: "edit" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = employeeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.employee.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      terminationDate: parsed.data.terminationDate ? new Date(parsed.data.terminationDate) : null,
      hireDate: new Date(parsed.data.hireDate),
    },
  })
  revalidatePath(`/empleados/${id}`)
  revalidatePath("/empleados")
  return { redirectTo: `/empleados/${id}` }
}

export async function deleteEmployee(id: string) {
  const user = await guardAction({ module: "empleados", action: "delete" })
  await prisma.employee.deleteMany({ where: { id, organizationId: user.organizationId } })
  revalidatePath("/empleados")
  redirect("/empleados")
}

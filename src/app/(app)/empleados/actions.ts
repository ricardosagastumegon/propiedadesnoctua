"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { employeeSchema } from "@/lib/schemas/employee"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return session.user.organizationId
}

export async function createEmployee(formData: FormData) {
  const orgId = await getOrgId()
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
  const orgId = await getOrgId()
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
  const orgId = await getOrgId()
  await prisma.employee.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/empleados")
  redirect("/empleados")
}

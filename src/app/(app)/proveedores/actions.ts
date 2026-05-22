"use server"
import { prisma } from "@/lib/prisma"
import { vendorSchema } from "@/lib/schemas/vendor"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { tryGuard, guardAction } from "@/lib/action-guard"

export async function createVendor(formData: FormData) {
  const g = await tryGuard({ module: "proveedores", action: "create" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = vendorSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const vendor = await prisma.vendor.create({
    data: { organizationId: orgId, ...parsed.data, email: parsed.data.email || null, rating: parsed.data.rating ?? null },
  })
  revalidatePath("/proveedores")
  return { redirectTo: `/proveedores/${vendor.id}` }
}

export async function updateVendor(id: string, formData: FormData) {
  const g = await tryGuard({ module: "proveedores", action: "edit" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = vendorSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.vendor.updateMany({
    where: { id, organizationId: orgId },
    data: { ...parsed.data, email: parsed.data.email || null, rating: parsed.data.rating ?? null },
  })
  revalidatePath(`/proveedores/${id}`)
  revalidatePath("/proveedores")
  return { redirectTo: `/proveedores/${id}` }
}

export async function deleteVendor(id: string) {
  const user = await guardAction({ module: "proveedores", action: "delete" })
  await prisma.vendor.deleteMany({ where: { id, organizationId: user.organizationId } })
  revalidatePath("/proveedores")
  redirect("/proveedores")
}

export async function toggleVendorActive(id: string, isActive: boolean) {
  const g = await tryGuard({ module: "proveedores", action: "edit" })
  if ("error" in g) return
  await prisma.vendor.updateMany({ where: { id, organizationId: g.user.organizationId }, data: { isActive } })
  revalidatePath("/proveedores")
  revalidatePath(`/proveedores/${id}`)
}

export async function createVendorInvoice(vendorId: string, formData: FormData) {
  const g = await tryGuard({ module: "pagos", action: "create" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, organizationId: orgId } })
  if (!vendor) return { error: "Proveedor no encontrado" }

  const invoiceNumber = formData.get("invoiceNumber") as string
  const dateRaw = formData.get("date") as string
  const dueDateRaw = formData.get("dueDate") as string
  const subtotal = parseFloat(formData.get("subtotal") as string) || 0
  const taxAmount = parseFloat(formData.get("taxAmount") as string) || 0
  const notes = formData.get("notes") as string

  if (!invoiceNumber?.trim()) return { error: "Numero de factura requerido" }
  if (!dateRaw) return { error: "Fecha requerida" }

  const total = subtotal + taxAmount
  await prisma.vendorInvoice.create({
    data: {
      organizationId: orgId,
      vendorId,
      invoiceNumber,
      date: new Date(dateRaw),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      subtotal,
      taxAmount,
      total,
      balance: total,
      notes: notes || null,
    },
  })
  revalidatePath(`/proveedores/${vendorId}`)
}

export async function updateVendorInvoiceStatus(invoiceId: string, status: string, vendorId: string) {
  const g = await tryGuard({ module: "pagos", action: "edit" })
  if ("error" in g) return
  const orgId = g.user.organizationId
  const data: Record<string, unknown> = { status }
  if (status === "PAID") {
    const inv = await prisma.vendorInvoice.findFirst({ where: { id: invoiceId, organizationId: orgId } })
    if (inv) {
      data.paidAt = new Date()
      data.paidAmount = inv.total
      data.balance = 0
    }
  }
  await prisma.vendorInvoice.updateMany({ where: { id: invoiceId, organizationId: orgId }, data })
  revalidatePath(`/proveedores/${vendorId}`)
}

export async function deleteVendorInvoice(invoiceId: string, vendorId: string) {
  const user = await guardAction({ module: "pagos", action: "delete" })
  await prisma.vendorInvoice.deleteMany({ where: { id: invoiceId, organizationId: user.organizationId } })
  revalidatePath(`/proveedores/${vendorId}`)
}

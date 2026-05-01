"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

async function nextQuoteNumber(orgId: string) {
  const count = await prisma.quote.count({ where: { organizationId: orgId } })
  return `COT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`
}

export async function createQuote(formData: FormData) {
  const orgId = await getOrgId()
  const vendorId = formData.get("vendorId") as string
  const projectId = formData.get("projectId") as string || null
  const partidaId = formData.get("partidaId") as string || null
  const date = formData.get("date") as string
  const validUntil = formData.get("validUntil") as string || null
  const subtotal = parseFloat(formData.get("subtotal") as string) || 0
  const taxAmount = parseFloat(formData.get("taxAmount") as string) || 0
  const total = parseFloat(formData.get("total") as string) || subtotal + taxAmount
  const notes = formData.get("notes") as string || null

  if (!vendorId) return { error: { vendorId: ["Proveedor requerido"] } }
  if (!date) return { error: { date: ["Fecha requerida"] } }

  const quoteNumber = await nextQuoteNumber(orgId)
  const quote = await prisma.quote.create({
    data: {
      organizationId: orgId,
      vendorId,
      projectId,
      partidaId,
      quoteNumber,
      date: new Date(date),
      validUntil: validUntil ? new Date(validUntil) : null,
      subtotal,
      taxAmount,
      total,
      notes,
    },
  })
  revalidatePath("/cotizaciones")
  return { redirectTo: `/cotizaciones/${quote.id}` }
}

export async function updateQuoteStatus(id: string, status: string) {
  const orgId = await getOrgId()
  await prisma.quote.updateMany({
    where: { id, organizationId: orgId },
    data: { status, ...(status === "APPROVED" ? { approvedAt: new Date() } : {}) },
  })
  revalidatePath(`/cotizaciones/${id}`)
  revalidatePath("/cotizaciones")
}

export async function deleteQuote(id: string) {
  const orgId = await getOrgId()
  await prisma.quote.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/cotizaciones")
  redirect("/cotizaciones")
}

export async function addQuoteItem(quoteId: string, formData: FormData) {
  const orgId = await getOrgId()
  const quote = await prisma.quote.findFirst({ where: { id: quoteId, organizationId: orgId } })
  if (!quote) throw new Error("Cotizacion no encontrada")

  const description = formData.get("description") as string
  const quantity = parseFloat(formData.get("quantity") as string) || 1
  const unit = formData.get("unit") as string || null
  const unitPrice = parseFloat(formData.get("unitPrice") as string) || 0
  const total = quantity * unitPrice

  await prisma.quoteItem.create({ data: { quoteId, description, quantity, unit, unitPrice, total } })

  const items = await prisma.quoteItem.findMany({ where: { quoteId } })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const tax = quote.taxAmount
  await prisma.quote.update({ where: { id: quoteId }, data: { subtotal, total: subtotal + tax } })

  revalidatePath(`/cotizaciones/${quoteId}`)
}

export async function deleteQuoteItem(itemId: string, quoteId: string) {
  const orgId = await getOrgId()
  await prisma.quoteItem.delete({ where: { id: itemId } })

  const quote = await prisma.quote.findFirst({ where: { id: quoteId, organizationId: orgId } })
  if (!quote) return
  const items = await prisma.quoteItem.findMany({ where: { quoteId } })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  await prisma.quote.update({ where: { id: quoteId }, data: { subtotal, total: subtotal + quote.taxAmount } })

  revalidatePath(`/cotizaciones/${quoteId}`)
}

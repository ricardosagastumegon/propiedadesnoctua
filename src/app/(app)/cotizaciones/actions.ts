"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { tryGuard, guardAction } from "@/lib/action-guard"

/** Resuelve el propertyId desde un projectId. */
async function projectPropertyId(projectId: string | null | undefined): Promise<string | null> {
  if (!projectId) return null
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { propertyId: true } })
  return p?.propertyId ?? null
}

async function getSession() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    orgId: session.user.organizationId,
    userId: session.user.id,
    actorName: session.user.name ?? "Usuario",
    authorityPolicy: session.user.authorityPolicy,
  }
}

async function getOrgId() {
  const { orgId } = await getSession()
  return orgId
}

async function nextQuoteNumber(orgId: string) {
  const count = await prisma.quote.count({ where: { organizationId: orgId } })
  return `COT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`
}

export async function createQuote(formData: FormData) {
  const projectIdForGuard = (formData.get("projectId") as string) || null
  const propertyIdForGuard = await projectPropertyId(projectIdForGuard)
  const g = await tryGuard({ module: "cotizaciones", action: "create", propertyId: propertyIdForGuard })
  if ("error" in g) return { error: g.error }
  const { orgId, userId, actorName, authorityPolicy } = await getSession()
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

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true } })
  await logActivity({
    orgId, entityType: "QUOTE", entityId: quote.id,
    projectId,
    action: "CREATED",
    actorId: userId, actorName,
    metadata: { vendor: vendor?.name, total, partida: partidaId },
  })

  // When creating from a partida, auto-create approval request for COSIGN_REQUIRED users
  if (partidaId && projectId && authorityPolicy === "COSIGN_REQUIRED") {
    const partida = await prisma.projectPartida.findUnique({
      where: { id: partidaId },
      include: { project: { select: { name: true } } },
    })
    const approvalReq = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "PROJECT_PARTIDA",
        entityId: partidaId,
        relatedId: quote.id,
        title: `Aprobar cotización: ${vendor?.name ?? "proveedor"} — ${partida?.project?.name ?? "proyecto"}`,
        amount: total,
        notes: `Partida: ${partida?.name ?? partidaId}`,
        status: "PENDING_COSIGN",
      },
    })
    await logActivity({
      orgId, entityType: "APPROVAL", entityId: approvalReq.id, projectId,
      action: "APPROVAL_REQUESTED", actorId: userId, actorName,
      metadata: { vendor: vendor?.name, amount: total, partida: partida?.name },
    })
    revalidatePath("/autorizaciones")
  }

  revalidatePath("/cotizaciones")
  if (projectId) revalidatePath(`/proyectos/${projectId}`)

  if (projectId && partidaId) {
    return { redirectTo: `/proyectos/${projectId}?expandPartida=${partidaId}` }
  }
  return { redirectTo: projectId ? `/proyectos/${projectId}` : `/cotizaciones/${quote.id}` }
}

export async function updateQuoteStatus(id: string, status: string) {
  const q = await prisma.quote.findUnique({ where: { id }, select: { projectId: true } })
  const propertyId = await projectPropertyId(q?.projectId)
  const g = await tryGuard({ module: "cotizaciones", action: "edit", propertyId })
  if ("error" in g) return
  await prisma.quote.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: { status, ...(status === "APPROVED" ? { approvedAt: new Date() } : {}) },
  })
  revalidatePath(`/cotizaciones/${id}`)
  revalidatePath("/cotizaciones")
}

export async function deleteQuote(id: string) {
  const q = await prisma.quote.findUnique({ where: { id }, select: { projectId: true } })
  const propertyId = await projectPropertyId(q?.projectId)
  const user = await guardAction({ module: "cotizaciones", action: "delete", propertyId })
  await prisma.quote.deleteMany({ where: { id, organizationId: user.organizationId } })
  revalidatePath("/cotizaciones")
  redirect("/cotizaciones")
}

export async function addQuoteItem(quoteId: string, formData: FormData) {
  const q = await prisma.quote.findUnique({ where: { id: quoteId }, select: { projectId: true } })
  const propertyId = await projectPropertyId(q?.projectId)
  const g = await tryGuard({ module: "cotizaciones", action: "edit", propertyId })
  if ("error" in g) return
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
  const q = await prisma.quote.findUnique({ where: { id: quoteId }, select: { projectId: true } })
  const propertyId = await projectPropertyId(q?.projectId)
  const g = await tryGuard({ module: "cotizaciones", action: "edit", propertyId })
  if ("error" in g) return
  const orgId = await getOrgId()
  await prisma.quoteItem.delete({ where: { id: itemId } })

  const quote = await prisma.quote.findFirst({ where: { id: quoteId, organizationId: orgId } })
  if (!quote) return
  const items = await prisma.quoteItem.findMany({ where: { quoteId } })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  await prisma.quote.update({ where: { id: quoteId }, data: { subtotal, total: subtotal + quote.taxAmount } })

  revalidatePath(`/cotizaciones/${quoteId}`)
}

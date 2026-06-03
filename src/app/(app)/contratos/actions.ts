"use server"
import { prisma } from "@/lib/prisma"
import { contractSchema } from "@/lib/schemas/contract"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { tryGuard, guardAction } from "@/lib/action-guard"

export async function createContract(formData: FormData) {
  const propertyId = (formData.get("propertyId") as string) || null
  const g = await tryGuard({ module: "contratos", action: "create", propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = contractSchema.safeParse({
    ...raw,
    includesUtilities: raw.includesUtilities === "on" || raw.includesUtilities === "true",
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const d = parsed.data
  const contract = await prisma.contract.create({
    data: {
      organizationId: orgId,
      contractNumber: d.contractNumber,
      propertyId: d.propertyId,
      unitId: d.unitId || null,
      parcelId: d.parcelId || null,
      tenantId: d.tenantId,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      monthlyRent: d.monthlyRent,
      currency: d.currency,
      deposit: d.deposit ?? null,
      paymentDueDay: d.paymentDueDay,
      paymentFrequency: d.paymentFrequency,
      includesUtilities: d.includesUtilities,
      utilitiesNotes: d.utilitiesNotes || null,
      lateFeePercent: d.lateFeePercent ?? null,
      annualIncrease: d.annualIncrease ?? null,
      status: d.status,
      notes: d.notes || null,
    },
  })
  revalidatePath("/contratos")
  return { redirectTo: `/contratos/${contract.id}` }
}

export async function updateContractStatus(id: string, status: string) {
  const c = await prisma.contract.findUnique({ where: { id }, select: { organizationId: true, propertyId: true } })
  if (!c) return
  const g = await tryGuard({ module: "contratos", action: "edit", propertyId: c.propertyId })
  if ("error" in g) return
  await prisma.contract.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: {
      status,
      ...(status === "TERMINATED" ? { terminatedAt: new Date() } : {}),
      ...(status === "ACTIVE" ? { signedAt: new Date() } : {}),
    },
  })
  revalidatePath(`/contratos/${id}`)
  revalidatePath("/contratos")
}

export async function deleteContract(id: string) {
  const c = await prisma.contract.findUnique({ where: { id }, select: { organizationId: true, propertyId: true } })
  if (!c) redirect("/contratos")
  const user = await guardAction({ module: "contratos", action: "delete", propertyId: c.propertyId })
  await prisma.contract.deleteMany({ where: { id, organizationId: user.organizationId } })
  revalidatePath("/contratos")
  redirect("/contratos")
}

export async function registerPayment(formData: FormData) {
  const contractId = formData.get("contractId") as string
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { propertyId: true, organizationId: true } })
  const g = await tryGuard({ module: "pagos", action: "create", propertyId: contract?.propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const invoiceId = formData.get("invoiceId") as string | null
  const amount = parseFloat(formData.get("amount") as string)
  const method = formData.get("method") as string
  const reference = formData.get("reference") as string
  const paymentDate = formData.get("paymentDate") as string
  const notes = formData.get("notes") as string

  if (!contractId || isNaN(amount) || !method || !paymentDate) return { error: "Datos incompletos" }

  await prisma.payment.create({
    data: {
      organizationId: orgId,
      contractId,
      invoiceId: invoiceId || null,
      amount,
      currency: "GTQ",
      paymentDate: new Date(paymentDate),
      method,
      reference: reference || null,
      notes: notes || null,
    },
  })

  if (invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (invoice) {
      const newPaid = invoice.paidAmount + amount
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          balance: invoice.total - newPaid,
          status: newPaid >= invoice.total ? "PAID" : "PARTIAL",
        },
      })
    }
  }

  revalidatePath(`/contratos/${contractId}`)
  revalidatePath("/pagos")
}

export async function createInvoice(formData: FormData) {
  const contractId = formData.get("contractId") as string
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { propertyId: true } })
  const g = await tryGuard({ module: "pagos", action: "create", propertyId: contract?.propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const issueDate = formData.get("issueDate") as string
  const dueDate = formData.get("dueDate") as string
  const amount = parseFloat(formData.get("amount") as string)
  const notes = formData.get("notes") as string

  const count = await prisma.invoice.count({ where: { organizationId: orgId } })
  const number = `F-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

  await prisma.invoice.create({
    data: {
      organizationId: orgId,
      contractId,
      number,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      subtotal: amount,
      total: amount,
      balance: amount,
      status: "PENDING",
      notes: notes || null,
      items: {
        create: [{
          description: "Renta mensual",
          quantity: 1,
          unitPrice: amount,
          total: amount,
        }],
      },
    },
  })

  revalidatePath(`/contratos/${contractId}`)
  revalidatePath("/pagos")
}

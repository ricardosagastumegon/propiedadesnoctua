import { describe, it, expect } from "vitest"
import { prismaMock } from "@/test/setup"
import { canMakePayment } from "@/lib/service-acceptance"
import {
  makeTicket, makeTicketPayment, makeQuote, makeOrgSettings, makeAcceptance,
} from "@/test/factories"

const ORG = "org_test"
const TICKET = "ticket_contado"

describe("Flujo Pago Contado", () => {
  it("ticket modo CONTADO, primer pago al 100% sin aceptación → bloquea (excede cap)", async () => {
    prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
      ...makeTicket({ id: TICKET, paymentMode: "CONTADO", totalAmount: 1500, amountPaid: 0 }),
      ticketPayments: [],
      ticketQuotes: [makeQuote({ ticketId: TICKET, total: 1500, status: "SELECTED" })],
    } as any)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(
      makeOrgSettings({ organizationId: ORG, prepaymentCapPercentage: 80 }),
    )
    prismaMock.serviceAcceptance.findFirst.mockResolvedValue(null)

    const res = await canMakePayment({
      entityType: "TICKET", entityId: TICKET,
      proposedAmount: 1500, paymentMethod: "TRANSFER", orgId: ORG,
    })

    expect(res.allowed).toBe(false)
    expect(res.newPercentage).toBe(100)
    expect(res.needsAcceptanceRequest).toBe(true)
  })

  it("ticket modo CONTADO con aceptación ACCEPTED → permite el 100%", async () => {
    prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
      ...makeTicket({ id: TICKET, paymentMode: "CONTADO", totalAmount: 1500, amountPaid: 0 }),
      ticketPayments: [],
      ticketQuotes: [makeQuote({ ticketId: TICKET, total: 1500, status: "SELECTED" })],
    } as any)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(
      makeOrgSettings({ organizationId: ORG, prepaymentCapPercentage: 80 }),
    )
    prismaMock.serviceAcceptance.findFirst.mockResolvedValue({
      ...makeAcceptance({ entityId: TICKET, entityType: "TICKET", status: "ACCEPTED" }),
      requestedBy: null, acceptedBy: null, rejectedBy: null, photos: [],
    } as any)

    const res = await canMakePayment({
      entityType: "TICKET", entityId: TICKET,
      proposedAmount: 1500, paymentMethod: "TRANSFER", orgId: ORG,
    })

    expect(res.allowed).toBe(true)
    expect(res.hasAcceptance).toBe(true)
  })

  it("ticket modo CONTADO con method=CAJA_CHICA → permite (excepción)", async () => {
    prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
      ...makeTicket({ id: TICKET, paymentMode: "CONTADO", totalAmount: 800 }),
      ticketPayments: [],
      ticketQuotes: [makeQuote({ ticketId: TICKET, total: 800, status: "SELECTED" })],
    } as any)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(makeOrgSettings({ organizationId: ORG }))
    prismaMock.serviceAcceptance.findFirst.mockResolvedValue(null)

    const res = await canMakePayment({
      entityType: "TICKET", entityId: TICKET,
      proposedAmount: 800, paymentMethod: "CAJA_CHICA", orgId: ORG,
    })

    expect(res.allowed).toBe(true)
    expect(res.isPettyCash).toBe(true)
  })
})

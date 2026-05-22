import { describe, it, expect } from "vitest"
import { prismaMock } from "@/test/setup"
import { canMakePayment, getPaymentProgress } from "@/lib/service-acceptance"
import {
  makePartida, makePartidaPayment, makeTicket, makeTicketPayment,
  makeQuote, makeOrgSettings, makeAcceptance,
} from "@/test/factories"

const ORG = "org_test"
const PARTIDA = "partida_test"
const TICKET = "ticket_test"

function arrangePartida({
  amountApproved = 10000,
  payments = [] as Array<{ amount: number; method?: string; closesWithDiscount?: boolean; discountAmount?: number }>,
  acceptanceStatus = null as "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED" | null,
  cap = 80,
}) {
  prismaMock.projectPartida.findUnique.mockResolvedValue({
    ...makePartida({ id: PARTIDA, amountApproved }),
    payments: payments.map(p => makePartidaPayment({
      partidaId: PARTIDA,
      amount: p.amount,
      method: p.method ?? "TRANSFER",
      closesWithDiscount: p.closesWithDiscount ?? false,
      discountAmount: p.discountAmount ?? null,
    })),
  } as any)
  prismaMock.organizationSettings.findUnique.mockResolvedValue(
    makeOrgSettings({ organizationId: ORG, prepaymentCapPercentage: cap }),
  )
  prismaMock.serviceAcceptance.findFirst.mockResolvedValue(
    acceptanceStatus
      ? { ...makeAcceptance({ entityId: PARTIDA, status: acceptanceStatus }), requestedBy: null, acceptedBy: null, rejectedBy: null, photos: [] } as any
      : null,
  )
}

function arrangeTicket({
  totalAmount = 10000,
  payments = [] as Array<{ amount: number; method?: string; closesWithDiscount?: boolean; discountAmount?: number }>,
  selectedQuoteTotals = [] as number[],
  acceptanceStatus = null as "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED" | null,
  cap = 80,
}) {
  prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
    ...makeTicket({ id: TICKET, totalAmount }),
    ticketPayments: payments.map(p => makeTicketPayment({
      ticketId: TICKET,
      amount: p.amount,
      method: p.method ?? "TRANSFER",
      closesWithDiscount: p.closesWithDiscount ?? false,
      discountAmount: p.discountAmount ?? null,
    })),
    ticketQuotes: selectedQuoteTotals.map(total => makeQuote({ ticketId: TICKET, total, status: "SELECTED" })),
  } as any)
  prismaMock.organizationSettings.findUnique.mockResolvedValue(
    makeOrgSettings({ organizationId: ORG, prepaymentCapPercentage: cap }),
  )
  prismaMock.serviceAcceptance.findFirst.mockResolvedValue(
    acceptanceStatus
      ? { ...makeAcceptance({ entityId: TICKET, entityType: "TICKET", status: acceptanceStatus }), requestedBy: null, acceptedBy: null, rejectedBy: null, photos: [] } as any
      : null,
  )
}

describe("canMakePayment — partida", () => {
  it("permite pago dentro del cap de 80%", async () => {
    arrangePartida({ amountApproved: 10000, payments: [{ amount: 3000 }] })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 4000, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(true)
    expect(res.cap).toBe(80)
    expect(res.newPercentage).toBe(70)
  })

  it("bloquea pago que excede el cap (85%) sin aceptación", async () => {
    arrangePartida({ amountApproved: 10000, payments: [{ amount: 3000 }] })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 5500, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(false)
    expect(res.needsAcceptanceRequest).toBe(true)
    expect(res.maxAllowedAmount).toBe(5000) // 80% de 10000 - 3000 ya pagado
    expect(res.reason).toContain("Aceptación de Servicio")
  })

  it("permite pago al 100% CON aceptación ACCEPTED", async () => {
    arrangePartida({
      amountApproved: 10000,
      payments: [{ amount: 8000 }],
      acceptanceStatus: "ACCEPTED",
    })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 2000, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(true)
    expect(res.hasAcceptance).toBe(true)
  })

  it("permite cualquier monto si method=CAJA_CHICA (excepción)", async () => {
    arrangePartida({ amountApproved: 10000, payments: [{ amount: 3000 }] })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 7000, paymentMethod: "CAJA_CHICA", orgId: ORG,
    })
    expect(res.allowed).toBe(true)
    expect(res.isPettyCash).toBe(true)
  })

  it("cierre con descuento: 8000 pagado + 500 propuesto + 1500 discount sobre 10000 → permite (100% efectivo)", async () => {
    arrangePartida({ amountApproved: 10000, payments: [{ amount: 8000 }] })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 500, paymentMethod: "TRANSFER", orgId: ORG,
      discountAmount: 1500,
    })
    expect(res.allowed).toBe(true)
    expect(res.newPercentage).toBe(100)
  })

  it("sin total seteado → permite (no hay referencia para medir)", async () => {
    arrangePartida({ amountApproved: 0, payments: [] })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 999, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(true)
  })

  it("cap configurado en 70% se respeta", async () => {
    arrangePartida({ amountApproved: 10000, payments: [], cap: 70 })
    const res = await canMakePayment({
      entityType: "PARTIDA", entityId: PARTIDA,
      proposedAmount: 7500, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(false)
    expect(res.cap).toBe(70)
  })
})

describe("canMakePayment — ticket", () => {
  it("usa total de quotes seleccionadas si existen", async () => {
    arrangeTicket({
      totalAmount: 5000,
      selectedQuoteTotals: [3000, 2000], // total = 5000
      payments: [{ amount: 2000 }],
    })
    const res = await canMakePayment({
      entityType: "TICKET", entityId: TICKET,
      proposedAmount: 1500, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(true) // 3500/5000 = 70%
  })

  it("acceptance ACCEPTED permite cierre del 100%", async () => {
    arrangeTicket({
      totalAmount: 8000,
      payments: [{ amount: 6400 }],
      acceptanceStatus: "ACCEPTED",
    })
    const res = await canMakePayment({
      entityType: "TICKET", entityId: TICKET,
      proposedAmount: 1600, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(true)
    expect(res.hasAcceptance).toBe(true)
  })

  it("acceptance PENDING NO permite saltarse el cap", async () => {
    arrangeTicket({
      totalAmount: 10000,
      payments: [{ amount: 7000 }],
      acceptanceStatus: "PENDING",
    })
    const res = await canMakePayment({
      entityType: "TICKET", entityId: TICKET,
      proposedAmount: 2000, paymentMethod: "TRANSFER", orgId: ORG,
    })
    expect(res.allowed).toBe(false)
  })
})

describe("getPaymentProgress", () => {
  it("excluye pagos CAJA_CHICA del totalPaidExcludingPettyCash", async () => {
    arrangePartida({
      amountApproved: 10000,
      payments: [
        { amount: 3000, method: "TRANSFER" },
        { amount: 500, method: "CAJA_CHICA" },
      ],
    })
    const r = await getPaymentProgress("PARTIDA", PARTIDA)
    expect(r.totalPaid).toBe(3500)
    expect(r.totalPaidExcludingPettyCash).toBe(3000)
  })

  it("computa totalDiscountClosed correctamente", async () => {
    arrangePartida({
      amountApproved: 10000,
      payments: [
        { amount: 8000, method: "TRANSFER" },
        { amount: 500, method: "TRANSFER", closesWithDiscount: true, discountAmount: 1500 },
      ],
    })
    const r = await getPaymentProgress("PARTIDA", PARTIDA)
    expect(r.totalDiscountClosed).toBe(1500)
    expect(r.effectivePercentage).toBe(100) // (8000 + 500 + 1500) / 10000
    expect(r.percentage).toBe(85) // sin contar descuento = 8500/10000
    expect(r.pending).toBe(0)
  })

  it("returns empty result si la entidad no existe", async () => {
    prismaMock.projectPartida.findUnique.mockResolvedValue(null)
    prismaMock.organizationSettings.findUnique.mockResolvedValue(makeOrgSettings())
    const r = await getPaymentProgress("PARTIDA", "no_existe")
    expect(r.total).toBe(0)
    expect(r.totalPaid).toBe(0)
  })
})

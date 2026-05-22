import { describe, it, expect } from "vitest"
import { computePartidaState } from "@/lib/partida-state"

const base = {
  status: "PENDING",
  amountApproved: null as number | null,
  amountPaid: 0,
  deliveredAt: null as Date | null,
  approvedQuoteId: null as string | null,
  hasQuotes: false,
  hasApprovalPending: false,
  hasAcceptancePending: false,
  hasAcceptanceAccepted: false,
  prepaymentCapPercentage: 80,
}

describe("computePartidaState", () => {
  it("sin cotizaciones → PENDING_QUOTES", () => {
    const r = computePartidaState(base)
    expect(r.state).toBe("PENDING_QUOTES")
  })

  it("con cotizaciones pero ninguna aprobada → AWAITING_APPROVAL", () => {
    const r = computePartidaState({ ...base, hasQuotes: true })
    expect(r.state).toBe("AWAITING_APPROVAL")
  })

  it("con autorización pendiente → AWAITING_APPROVAL", () => {
    const r = computePartidaState({ ...base, hasApprovalPending: true })
    expect(r.state).toBe("AWAITING_APPROVAL")
  })

  it("aprobada sin pagos → APPROVED", () => {
    const r = computePartidaState({
      ...base, approvedQuoteId: "q1", amountApproved: 10000,
    })
    expect(r.state).toBe("APPROVED")
  })

  it("con pagos parciales (50%) → IN_PROGRESS", () => {
    const r = computePartidaState({
      ...base, approvedQuoteId: "q1", amountApproved: 10000, amountPaid: 5000,
    })
    expect(r.state).toBe("IN_PROGRESS")
  })

  it("80% pagado + aceptación PENDING → PENDING_ACCEPTANCE", () => {
    const r = computePartidaState({
      ...base, approvedQuoteId: "q1", amountApproved: 10000, amountPaid: 8000,
      hasAcceptancePending: true,
    })
    expect(r.state).toBe("PENDING_ACCEPTANCE")
  })

  it("entregada sin estar 100% pagada → DELIVERED", () => {
    const r = computePartidaState({
      ...base, approvedQuoteId: "q1", amountApproved: 10000, amountPaid: 9000,
      deliveredAt: new Date(),
    })
    expect(r.state).toBe("DELIVERED")
  })

  it("100% pagado + entregada → PAID", () => {
    const r = computePartidaState({
      ...base, approvedQuoteId: "q1", amountApproved: 10000, amountPaid: 10000,
      deliveredAt: new Date(),
    })
    expect(r.state).toBe("PAID")
  })

  it("CANCELLED manual tiene prioridad sobre todo", () => {
    const r = computePartidaState({
      ...base, status: "CANCELLED", approvedQuoteId: "q1", amountApproved: 10000, amountPaid: 10000,
      deliveredAt: new Date(),
    })
    expect(r.state).toBe("CANCELLED")
  })

  it("incluye reason, color y label en el resultado", () => {
    const r = computePartidaState(base)
    expect(r.reason).toBeTruthy()
    expect(r.color).toBeTruthy()
    expect(r.label).toBeTruthy()
  })

  it("cap configurado 70%: a 75% pagado + aceptación pendiente → PENDING_ACCEPTANCE", () => {
    const r = computePartidaState({
      ...base, approvedQuoteId: "q1", amountApproved: 10000, amountPaid: 7500,
      hasAcceptancePending: true, prepaymentCapPercentage: 70,
    })
    expect(r.state).toBe("PENDING_ACCEPTANCE")
  })
})

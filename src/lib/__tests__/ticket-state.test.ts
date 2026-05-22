import { describe, it, expect } from "vitest"
import { computeTicketState } from "@/lib/ticket-state"

const base = {
  status: "REPORTED",
  assignedToId: null,
  paymentMode: null,
  amountPaid: 0,
  totalAmount: null as number | null,
  completedAt: null as Date | null,
  escalatedToProjectId: null as string | null,
  hasApprovalPending: false,
  hasApprovalApproved: false,
  hasAcceptancePending: false,
  hasAcceptanceAccepted: false,
  prepaymentCapPercentage: 80,
}

describe("computeTicketState", () => {
  it("ticket recién creado sin asignar → REPORTED", () => {
    const r = computeTicketState(base)
    expect(r.state).toBe("REPORTED")
  })

  it("asignado sin paymentMode → AWAITING_PAYMENT_INFO", () => {
    const r = computeTicketState({ ...base, assignedToId: "u1" })
    expect(r.state).toBe("AWAITING_PAYMENT_INFO")
  })

  it("asignado con paymentMode → ASSIGNED", () => {
    const r = computeTicketState({ ...base, assignedToId: "u1", paymentMode: "PROVEEDOR" })
    expect(r.state).toBe("ASSIGNED")
  })

  it("aprobado sin pagos → APPROVED", () => {
    const r = computeTicketState({
      ...base, assignedToId: "u1", paymentMode: "PROVEEDOR", hasApprovalApproved: true,
    })
    expect(r.state).toBe("APPROVED")
  })

  it("en autorización → AWAITING_APPROVAL", () => {
    const r = computeTicketState({
      ...base, assignedToId: "u1", paymentMode: "PROVEEDOR", hasApprovalPending: true,
    })
    expect(r.state).toBe("AWAITING_APPROVAL")
  })

  it("con pagos parciales (50%) → IN_PROGRESS", () => {
    const r = computeTicketState({
      ...base, totalAmount: 10000, amountPaid: 5000,
      assignedToId: "u1", paymentMode: "PROVEEDOR", hasApprovalApproved: true,
    })
    expect(r.state).toBe("IN_PROGRESS")
  })

  it("80% pagado + aceptación PENDING → PENDING_ACCEPTANCE", () => {
    const r = computeTicketState({
      ...base, totalAmount: 10000, amountPaid: 8000,
      assignedToId: "u1", paymentMode: "PROVEEDOR",
      hasApprovalApproved: true, hasAcceptancePending: true,
    })
    expect(r.state).toBe("PENDING_ACCEPTANCE")
  })

  it("100% pagado → COMPLETED", () => {
    const r = computeTicketState({
      ...base, totalAmount: 10000, amountPaid: 10000,
      assignedToId: "u1", paymentMode: "PROVEEDOR",
    })
    expect(r.state).toBe("COMPLETED")
  })

  it("CANCELLED manual tiene prioridad sobre todo", () => {
    const r = computeTicketState({
      ...base, status: "CANCELLED", totalAmount: 10000, amountPaid: 10000,
    })
    expect(r.state).toBe("CANCELLED")
  })

  it("escalatedToProjectId → ESCALATED", () => {
    const r = computeTicketState({
      ...base, escalatedToProjectId: "proj_1",
    })
    expect(r.state).toBe("ESCALATED")
  })

  it("incluye reason en el resultado", () => {
    const r = computeTicketState(base)
    expect(r.reason).toBeTruthy()
    expect(r.color).toBeTruthy()
    expect(r.label).toBeTruthy()
  })
})

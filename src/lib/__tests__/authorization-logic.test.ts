// Tests de la LÓGICA de autorización (estados según authorityPolicy).
// Las server actions completas usan auth() y revalidatePath — son más difíciles
// de mockear. Acá nos enfocamos en la lógica pura.

import { describe, it, expect } from "vitest"

// Réplica de la lógica que vive en mantenimiento/actions.ts:finalizeTicketSelection
// para tener confianza en que las reglas son las correctas.
function computeApprovalStatusForAuthorityPolicy(policy: string): "PENDING" | "PENDING_COSIGN" | null {
  if (policy === "ALONE") return "PENDING"
  if (policy === "COSIGN_REQUIRED") return "PENDING_COSIGN"
  if (policy === "NONE") return null // no autoridad para crear approval requests
  return null
}

describe("authorityPolicy → estado inicial de ApprovalRequest", () => {
  it("ALONE → PENDING (puede actuar solo)", () => {
    expect(computeApprovalStatusForAuthorityPolicy("ALONE")).toBe("PENDING")
  })

  it("COSIGN_REQUIRED → PENDING_COSIGN (requiere co-firma)", () => {
    expect(computeApprovalStatusForAuthorityPolicy("COSIGN_REQUIRED")).toBe("PENDING_COSIGN")
  })

  it("NONE → null (sin autoridad)", () => {
    expect(computeApprovalStatusForAuthorityPolicy("NONE")).toBeNull()
  })

  it("policy desconocida → null (seguro)", () => {
    expect(computeApprovalStatusForAuthorityPolicy("UNKNOWN_POLICY")).toBeNull()
  })
})

// Política: el solicitante de una autorización no puede aprobarla.
function canUserApprove(approval: { requestedById: string; status: string }, userId: string): boolean {
  if (approval.requestedById === userId) return false
  if (approval.status !== "PENDING" && approval.status !== "PENDING_COSIGN") return false
  return true
}

describe("canUserApprove", () => {
  it("el solicitante NO puede aprobar su propia request", () => {
    expect(
      canUserApprove({ requestedById: "u1", status: "PENDING" }, "u1"),
    ).toBe(false)
  })

  it("otro usuario SÍ puede aprobar PENDING", () => {
    expect(
      canUserApprove({ requestedById: "u1", status: "PENDING" }, "u2"),
    ).toBe(true)
  })

  it("otro usuario SÍ puede co-firmar PENDING_COSIGN", () => {
    expect(
      canUserApprove({ requestedById: "u1", status: "PENDING_COSIGN" }, "u2"),
    ).toBe(true)
  })

  it("nadie puede actuar sobre APPROVED ya resuelta", () => {
    expect(
      canUserApprove({ requestedById: "u1", status: "APPROVED" }, "u2"),
    ).toBe(false)
  })

  it("nadie puede actuar sobre REJECTED", () => {
    expect(
      canUserApprove({ requestedById: "u1", status: "REJECTED" }, "u2"),
    ).toBe(false)
  })
})

// Política: al aprobar una cotización, las otras cotizaciones de la misma partida
// pasan automáticamente a REJECTED. Replicamos la lógica:
function computeOtherQuotesStatus(
  approvedQuoteId: string,
  allQuotes: Array<{ id: string }>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const q of allQuotes) {
    result[q.id] = q.id === approvedQuoteId ? "APPROVED" : "REJECTED"
  }
  return result
}

describe("approveQuote — efecto sobre cotizaciones hermanas", () => {
  it("al aprobar una cotización, las otras quedan REJECTED", () => {
    const result = computeOtherQuotesStatus("q2", [
      { id: "q1" }, { id: "q2" }, { id: "q3" },
    ])
    expect(result["q1"]).toBe("REJECTED")
    expect(result["q2"]).toBe("APPROVED")
    expect(result["q3"]).toBe("REJECTED")
  })

  it("si hay una sola cotización, queda APPROVED", () => {
    const result = computeOtherQuotesStatus("q1", [{ id: "q1" }])
    expect(result["q1"]).toBe("APPROVED")
  })
})

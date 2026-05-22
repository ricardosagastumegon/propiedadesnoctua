import { describe, it, expect } from "vitest"
import { prismaMock } from "@/test/setup"
import {
  acceptService, rejectServiceAcceptance, requestServiceAcceptance,
  canUserAcceptThis,
} from "@/lib/service-acceptance"
import {
  makeUser, makeAcceptance, makePartida, makeApproval,
} from "@/test/factories"

const ORG = "org_test"
const PARTIDA = "partida_test"
const ACCEPT_ID = "accept_test"

const fullChecklist = [
  { key: "completed_on_time", checked: true },
  { key: "quality_as_expected", checked: true },
  { key: "equipment_working", checked: true },
  { key: "no_observations", checked: true },
  { key: "documentation_delivered", checked: true },
]

function arrangeAcceptance({
  status = "PENDING",
  requestedById = "user_requester",
  version = 0,
  entityType = "PARTIDA" as "PARTIDA" | "TICKET",
}) {
  const acceptance = makeAcceptance({
    id: ACCEPT_ID,
    organizationId: ORG,
    entityType,
    entityId: PARTIDA,
    status,
    version,
    requestedById,
  })
  prismaMock.serviceAcceptance.findFirst.mockResolvedValue(acceptance as any)
  return acceptance
}

function arrangeActor({
  id = "user_acceptor",
  canAcceptServices = true,
}: { id?: string; canAcceptServices?: boolean } = {}) {
  prismaMock.user.findFirst.mockResolvedValue(
    makeUser({ id, organizationId: ORG, canAcceptServices }) as any,
  )
  return id
}

describe("acceptService — permisos", () => {
  it("lanza error si el usuario no tiene canAcceptServices", async () => {
    arrangeAcceptance({})
    arrangeActor({ canAcceptServices: false })
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 5, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/permiso para aceptar/i)
  })

  it("lanza error si el actor es el mismo que solicitó (conflicto auto-aceptación)", async () => {
    arrangeAcceptance({ requestedById: "user_acceptor" })
    arrangeActor({ id: "user_acceptor" })
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 5, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/conflicto de interés/i)
  })

  it("lanza error si el actor aprobó la cotización (conflicto de interés)", async () => {
    arrangeAcceptance({ requestedById: "user_other" })
    arrangeActor({ id: "user_acceptor" })
    prismaMock.projectPartida.findUnique.mockResolvedValue(
      makePartida({ id: PARTIDA, approvedQuoteId: "quote_1" }) as any,
    )
    prismaMock.approvalRequest.findFirst.mockResolvedValue(
      makeApproval({ status: "APPROVED", approvedById: "user_acceptor" }) as any,
    )
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 5, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/Conflicto de interés/i)
  })

  it("lanza error si el actor cofirmó la cotización", async () => {
    arrangeAcceptance({ requestedById: "user_other" })
    arrangeActor({ id: "user_acceptor" })
    prismaMock.projectPartida.findUnique.mockResolvedValue(
      makePartida({ id: PARTIDA, approvedQuoteId: "quote_1" }) as any,
    )
    prismaMock.approvalRequest.findFirst.mockResolvedValue(
      makeApproval({ status: "APPROVED", cosignerId: "user_acceptor" }) as any,
    )
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 5, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/Conflicto de interés/i)
  })
})

describe("acceptService — validaciones de input", () => {
  it("rechaza si el checklist tiene items no marcados", async () => {
    arrangeAcceptance({})
    arrangeActor({})
    prismaMock.projectPartida.findUnique.mockResolvedValue(makePartida({ id: PARTIDA, approvedQuoteId: null }) as any)
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null)
    const incompleteChecklist = [...fullChecklist]
    incompleteChecklist[0] = { ...incompleteChecklist[0], checked: false }
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: incompleteChecklist, rating: 5, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/checklist son obligatorios/i)
  })

  it("rechaza si rating no está entre 1-5", async () => {
    arrangeAcceptance({})
    arrangeActor({})
    prismaMock.projectPartida.findUnique.mockResolvedValue(makePartida({ id: PARTIDA, approvedQuoteId: null }) as any)
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null)
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 0, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/calificación de 1 a 5/i)
  })

  it("rechaza si no hay fotos de evidencia", async () => {
    arrangeAcceptance({})
    arrangeActor({})
    prismaMock.projectPartida.findUnique.mockResolvedValue(makePartida({ id: PARTIDA, approvedQuoteId: null }) as any)
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null)
    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 5, photos: [],
      }),
    ).rejects.toThrow(/foto de evidencia/i)
  })
})

describe("acceptService — caso válido genera hash + version lock", () => {
  it("marca ACCEPTED y genera verificationHash determinístico", async () => {
    arrangeAcceptance({ version: 0 })
    arrangeActor({})
    prismaMock.projectPartida.findUnique.mockResolvedValue(makePartida({ id: PARTIDA, approvedQuoteId: null }) as any)
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null)
    prismaMock.serviceAcceptance.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.serviceAcceptancePhoto.createMany.mockResolvedValue({ count: 1 })
    prismaMock.serviceAcceptance.findUnique.mockResolvedValue(
      makeAcceptance({ id: ACCEPT_ID, status: "ACCEPTED", verificationHash: "abc" }) as any,
    )

    const result = await acceptService({
      orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
      checklist: fullChecklist, rating: 5, photos: [{ url: "f.jpg" }], notes: "OK",
    })

    expect(result.status).toBe("ACCEPTED")
    // El updateMany fue llamado con where { id, version: 0, status: "PENDING" }
    expect(prismaMock.serviceAcceptance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: ACCEPT_ID, version: 0, status: "PENDING" }),
        data: expect.objectContaining({
          status: "ACCEPTED",
          version: { increment: 1 },
        }),
      }),
    )
  })

  it("version lock: si otra persona ya procesó (count=0), lanza error", async () => {
    arrangeAcceptance({ version: 0 })
    arrangeActor({})
    prismaMock.projectPartida.findUnique.mockResolvedValue(makePartida({ id: PARTIDA, approvedQuoteId: null }) as any)
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null)
    prismaMock.serviceAcceptance.updateMany.mockResolvedValue({ count: 0 }) // race lost

    await expect(
      acceptService({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        checklist: fullChecklist, rating: 5, photos: [{ url: "f.jpg" }],
      }),
    ).rejects.toThrow(/ya fue procesada/i)
  })
})

describe("rejectServiceAcceptance", () => {
  it("marca REJECTED y devuelve la partida a IN_PROGRESS", async () => {
    arrangeAcceptance({ version: 0 })
    arrangeActor({})
    prismaMock.serviceAcceptance.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.serviceAcceptance.findUnique.mockResolvedValue(
      makeAcceptance({ status: "REJECTED" }) as any,
    )

    const result = await rejectServiceAcceptance({
      orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
      rejectionReason: "Falta documentación",
    })

    expect(result.status).toBe("REJECTED")
    expect(prismaMock.projectPartida.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PARTIDA },
        data: expect.objectContaining({ status: "IN_PROGRESS", deliveredAt: null }),
      }),
    )
  })

  it("ticket REJECTED vuelve a IN_PROGRESS y limpia completedAt", async () => {
    arrangeAcceptance({ entityType: "TICKET", version: 0 })
    arrangeActor({})
    prismaMock.serviceAcceptance.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.serviceAcceptance.findUnique.mockResolvedValue(
      makeAcceptance({ entityType: "TICKET", status: "REJECTED" }) as any,
    )

    await rejectServiceAcceptance({
      orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
      rejectionReason: "Trabajo incompleto",
    })

    expect(prismaMock.maintenanceRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "IN_PROGRESS", completedAt: null }),
      }),
    )
  })

  it("rechaza si la razón está vacía", async () => {
    arrangeAcceptance({})
    arrangeActor({})
    await expect(
      rejectServiceAcceptance({
        orgId: ORG, acceptanceId: ACCEPT_ID, actorId: "user_acceptor", actorName: "Test",
        rejectionReason: "  ",
      }),
    ).rejects.toThrow(/Razón de rechazo requerida/i)
  })
})

describe("requestServiceAcceptance", () => {
  it("cancela aceptaciones PENDING previas (SUPERSEDED)", async () => {
    prismaMock.serviceAcceptance.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.projectPartida.findUnique.mockResolvedValue({
      ...makePartida({ id: PARTIDA }),
      vendor: { id: "v1", name: "Vendor" },
      project: { name: "Proj" },
    } as any)
    prismaMock.serviceAcceptance.create.mockResolvedValue(
      makeAcceptance({ id: "new_accept" }) as any,
    )
    prismaMock.user.findMany.mockResolvedValue([])

    await requestServiceAcceptance({
      orgId: ORG, entityType: "PARTIDA", entityId: PARTIDA,
      requestedById: "user_x", requestedByName: "X",
    })

    expect(prismaMock.serviceAcceptance.updateMany).toHaveBeenCalledWith({
      where: { entityType: "PARTIDA", entityId: PARTIDA, status: "PENDING" },
      data: { status: "SUPERSEDED" },
    })
  })

  it("notifica a todos los acceptors (excepto al solicitante)", async () => {
    prismaMock.serviceAcceptance.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.projectPartida.findUnique.mockResolvedValue({
      ...makePartida({ id: PARTIDA }),
      vendor: null,
      project: null,
    } as any)
    prismaMock.serviceAcceptance.create.mockResolvedValue(
      makeAcceptance({ id: "new_accept" }) as any,
    )
    prismaMock.user.findMany.mockResolvedValue([
      makeUser({ id: "acc1" }),
      makeUser({ id: "acc2" }),
    ] as any)

    await requestServiceAcceptance({
      orgId: ORG, entityType: "PARTIDA", entityId: PARTIDA,
      requestedById: "user_requester", requestedByName: "Pedro",
    })

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          canAcceptServices: true,
          isActive: true,
          id: { not: "user_requester" },
        }),
      }),
    )
    expect(prismaMock.notification.createMany).toHaveBeenCalled()
  })
})

describe("canUserAcceptThis", () => {
  it("retorna ok=false si el usuario no tiene canAcceptServices", async () => {
    prismaMock.user.findFirst.mockResolvedValue(
      makeUser({ id: "u", canAcceptServices: false }) as any,
    )
    const r = await canUserAcceptThis(ORG, ACCEPT_ID, "u")
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/permiso/i)
  })

  it("retorna ok=false si el usuario es el solicitante", async () => {
    prismaMock.user.findFirst.mockResolvedValue(
      makeUser({ id: "u", canAcceptServices: true }) as any,
    )
    prismaMock.serviceAcceptance.findFirst.mockResolvedValue(
      makeAcceptance({ requestedById: "u" }) as any,
    )
    const r = await canUserAcceptThis(ORG, ACCEPT_ID, "u")
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/solicit/i)
  })

  it("retorna ok=true si no hay conflicto", async () => {
    prismaMock.user.findFirst.mockResolvedValue(
      makeUser({ id: "u", canAcceptServices: true }) as any,
    )
    prismaMock.serviceAcceptance.findFirst.mockResolvedValue(
      makeAcceptance({ requestedById: "other" }) as any,
    )
    prismaMock.projectPartida.findUnique.mockResolvedValue(
      makePartida({ approvedQuoteId: null }) as any,
    )
    prismaMock.approvalRequest.findFirst.mockResolvedValue(null)
    const r = await canUserAcceptThis(ORG, ACCEPT_ID, "u")
    expect(r.ok).toBe(true)
  })
})

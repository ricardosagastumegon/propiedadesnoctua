import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AuditClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function AuthAuditPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const [requests, users, pettyCashes] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId },
      include: {
        requestedBy: { select: { id: true, name: true, role: true } },
        cosigner: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      include: {
        cosignPolicy: {
          include: { allowedCosigners: { select: { id: true, name: true } } },
        },
        cosignAllowedIn: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.pettyCash.findMany({
      where: { organizationId: orgId },
      include: {
        property: { select: { id: true, name: true } },
        movements: { where: { type: "REPLENISHMENT" }, select: { id: true, createdAt: true, amount: true } },
      },
    }),
  ])

  const now = Date.now()
  const MS_72H = 72 * 60 * 60 * 1000

  // ── Stats ────────────────────────────────────────────
  const byStatus: Record<string, number> = {}
  for (const r of requests) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  }

  const approvedRequests = requests.filter(r => r.status === "APPROVED" && r.approvedAt)
  const avgApprovalMs =
    approvedRequests.length > 0
      ? approvedRequests.reduce((sum, r) => sum + (r.approvedAt!.getTime() - r.createdAt.getTime()), 0) /
        approvedRequests.length
      : null

  const stuckIds = new Set(
    requests
      .filter(r => (r.status === "PENDING" || r.status === "PENDING_COSIGN") && now - r.updatedAt.getTime() > MS_72H)
      .map(r => r.id)
  )

  // by entity type stats
  const entityTypeSet = Array.from(new Set(requests.map(r => r.entityType)))
  const byEntityType = entityTypeSet.map(et => {
    const rows = requests.filter(r => r.entityType === et)
    const etApproved = rows.filter(r => r.status === "APPROVED" && r.approvedAt)
    const avgMs =
      etApproved.length > 0
        ? etApproved.reduce((s, r) => s + (r.approvedAt!.getTime() - r.createdAt.getTime()), 0) / etApproved.length
        : null
    return {
      type: et,
      total: rows.length,
      pending: rows.filter(r => r.status === "PENDING" || r.status === "PENDING_COSIGN").length,
      approved: rows.filter(r => r.status === "APPROVED").length,
      rejected: rows.filter(r => r.status === "REJECTED").length,
      avgApprovalMs: avgMs,
    }
  })

  // ── Diagnostics ────────────────────────────────────────────
  // PETTY_CASH approvals
  const pettyCashApprovalEntityIds = new Set(
    requests.filter(r => r.entityType === "PETTY_CASH").map(r => r.entityId)
  )
  const pettyCashesNoApproval = pettyCashes.filter(
    pc => pc.movements.length > 0 && !pettyCashApprovalEntityIds.has(pc.id)
  )

  // Orphan requests: we can detect PETTY_CASH orphans
  const allPcIds = new Set(pettyCashes.map(pc => pc.id))
  const orphanPettyCash = requests.filter(
    r => r.entityType === "PETTY_CASH" && !allPcIds.has(r.entityId)
  )

  // Users with COSIGN_REQUIRED but zero cosigners
  const usersNoCosigners = users.filter(
    u => u.authorityPolicy === "COSIGN_REQUIRED" && (!u.cosignPolicy || u.cosignPolicy.allowedCosigners.length === 0)
  )

  // Users with missing/blank policy (configuration error — null or "")
  const usersMissingPolicy = users.filter(u => !u.authorityPolicy || u.authorityPolicy === "")

  // ── Serialize ────────────────────────────────────────────
  function serializeRequest(r: (typeof requests)[number]) {
    return {
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      relatedId: r.relatedId,
      title: r.title,
      amount: r.amount,
      status: r.status,
      notes: r.notes,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? null,
      rejectedAt: r.rejectedAt?.toISOString() ?? null,
      cosignedAt: r.cosignedAt?.toISOString() ?? null,
      requestedBy: r.requestedBy,
      cosigner: r.cosigner,
      approvedBy: r.approvedBy,
      rejectedBy: r.rejectedBy,
    }
  }

  function serializeUser(u: (typeof users)[number]) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      authorityPolicy: u.authorityPolicy,
      isActive: u.isActive,
      cosignPolicy: u.cosignPolicy
        ? { id: u.cosignPolicy.id, allowedCosigners: u.cosignPolicy.allowedCosigners }
        : null,
      cosignAllowedIn: u.cosignAllowedIn.map(cp => ({ user: cp.user })),
    }
  }

  return (
    <AuditClient
      requests={requests.map(serializeRequest)}
      users={users.map(serializeUser)}
      stats={{
        total: requests.length,
        byStatus,
        avgApprovalMs,
        stuckCount: stuckIds.size,
        byEntityType,
      }}
      diagnostics={{
        stuckIds: Array.from(stuckIds),
        usersNoCosigners: usersNoCosigners.map(serializeUser),
        usersMissingPolicy: usersMissingPolicy.map(serializeUser),
        orphanPettyCash: orphanPettyCash.map(serializeRequest),
        pettyCashesNoApproval: pettyCashesNoApproval.map(pc => ({
          id: pc.id,
          propertyId: pc.property.id,
          propertyName: pc.property.name,
          replenishmentCount: pc.movements.length,
        })),
      }}
    />
  )
}

import { prisma } from "@/lib/prisma"

export interface ActivityEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  actorName: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export async function getProjectActivityTrail(projectId: string, orgId: string): Promise<ActivityEntry[]> {
  const logs = await prisma.activityLog.findMany({
    where: { organizationId: orgId, projectId },
    orderBy: { createdAt: "desc" },
  })

  return logs.map(l => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    actorName: l.actorName,
    metadata: l.metadata ? (() => { try { return JSON.parse(l.metadata!) } catch { return null } })() : null,
    createdAt: l.createdAt.toISOString(),
  }))
}

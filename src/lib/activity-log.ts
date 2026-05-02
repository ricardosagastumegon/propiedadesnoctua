import { prisma } from "@/lib/prisma"

export interface LogActivityParams {
  orgId: string
  entityType: string
  entityId: string
  projectId?: string | null
  action: string
  actorId?: string | null
  actorName?: string | null
  metadata?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        organizationId: params.orgId,
        entityType: params.entityType,
        entityId: params.entityId,
        projectId: params.projectId ?? null,
        action: params.action,
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (e) {
    // Non-blocking: log errors without breaking the main operation
    console.error("[ActivityLog] Failed to write:", e)
  }
}

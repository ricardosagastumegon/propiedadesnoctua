"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatGTQ, formatDate } from "@/lib/format"
import { APPROVAL_STATUSES, APPROVAL_STATUS_COLORS } from "@/lib/schemas/authorization"
import { approveRequest, rejectRequest } from "@/app/(app)/autorizaciones/actions"
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react"

interface ApprovalRequest {
  id: string
  entityType: string
  entityId: string
  relatedId: string | null
  status: string
  title: string | null
  amount: number | null
  notes: string | null
  createdAt: Date
  requestedBy: { name: string | null }
  approvedBy: { name: string | null } | null
}

interface Partida {
  id: string
  name: string
}

interface Props {
  projectId: string
  approvalRequests: ApprovalRequest[]
  partidas: Partida[]
  orgId: string
  currentUserId: string
}

export function ProjectApprovals({ projectId, approvalRequests, partidas }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const pending = approvalRequests.filter(a => a.status === "PENDING" || a.status === "PENDING_COSIGN")
  const resolved = approvalRequests.filter(a => a.status === "APPROVED" || a.status === "REJECTED")

  const partidaMap = Object.fromEntries(partidas.map(p => [p.id, p.name]))

  if (approvalRequests.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Sin autorizaciones"
        description="Las solicitudes de aprobacion de cotizaciones apareceran aqui."
      />
    )
  }

  async function handleApprove(id: string) {
    setLoading(id)
    await approveRequest(id)
    setLoading(null)
  }

  async function handleReject(id: string) {
    setLoading(id)
    await rejectRequest(id, "")
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Pendientes</p>
          <p className="font-display text-xl">{pending.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Aprobadas</p>
          <p className="font-display text-xl text-emerald-600">{approvalRequests.filter(a => a.status === "APPROVED").length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Monto total</p>
          <p className="font-display text-xl tabular-nums">
            {formatGTQ(approvalRequests.filter(a => a.status === "APPROVED").reduce((s, a) => s + (a.amount ?? 0), 0))}
          </p>
        </Card>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pendientes</p>
          <div className="space-y-2">
            {pending.map(a => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{a.title ?? `Solicitud ${a.id.slice(-6)}`}</p>
                    {a.entityId && partidaMap[a.entityId] && (
                      <p className="text-xs text-muted-foreground">Partida: {partidaMap[a.entityId]}</p>
                    )}
                    {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${APPROVAL_STATUS_COLORS[a.status]}`}>
                        {APPROVAL_STATUSES[a.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">por {a.requestedBy.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {a.amount != null && (
                      <p className="font-display text-lg tabular-nums mb-2">{formatGTQ(a.amount)}</p>
                    )}
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" className="h-7 text-xs"
                        onClick={() => handleApprove(a.id)}
                        disabled={loading === a.id}>
                        <CheckCircle2 className="size-3.5 mr-1" />Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => handleReject(a.id)}
                        disabled={loading === a.id}>
                        <XCircle className="size-3.5 mr-1" />Rechazar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Historial</p>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Solicitud</th>
                  <th className="text-left p-3 font-medium">Partida</th>
                  <th className="text-right p-3 font-medium">Monto</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Aprobado por</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3">{a.title ?? `Solicitud ${a.id.slice(-6)}`}</td>
                    <td className="p-3 text-muted-foreground">{a.entityId ? (partidaMap[a.entityId] ?? "—") : "—"}</td>
                    <td className="p-3 text-right tabular-nums">{a.amount != null ? formatGTQ(a.amount) : "—"}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${APPROVAL_STATUS_COLORS[a.status]}`}>
                        {APPROVAL_STATUSES[a.status]}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.approvedBy?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  )
}

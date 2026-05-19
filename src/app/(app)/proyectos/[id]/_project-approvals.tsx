"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { formatGTQ, formatDate } from "@/lib/format"
import { APPROVAL_STATUSES, APPROVAL_STATUS_COLORS } from "@/lib/schemas/authorization"
import { approveRequest, rejectRequest, cosignRequest } from "@/app/(app)/autorizaciones/actions"
import { CheckCircle2, XCircle, ShieldCheck, GitMerge } from "lucide-react"

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
  requestedById: string
  requestedBy: { name: string | null }
  approvedBy: { name: string | null } | null
  cosigner: { name: string | null } | null
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
  authorityPolicy: string
}

export function ProjectApprovals({ approvalRequests, partidas, currentUserId, authorityPolicy }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectState, setRejectState] = useState<{ id: string; reason: string } | null>(null)

  const pending = approvalRequests.filter(a => a.status === "PENDING" || a.status === "PENDING_COSIGN")
  const resolved = approvalRequests.filter(a => a.status === "APPROVED" || a.status === "REJECTED")
  const partidaMap = Object.fromEntries(partidas.map(p => [p.id, p.name]))

  const canActOnApproval = authorityPolicy === "ALONE"

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

  async function handleCosign(id: string) {
    setLoading(id)
    await cosignRequest(id)
    setLoading(null)
  }

  async function handleReject(id: string, reason: string) {
    if (!reason.trim()) return
    setLoading(id)
    await rejectRequest(id, reason.trim())
    setLoading(null)
    setRejectState(null)
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
            {pending.map(a => {
              const isPendingCosign = a.status === "PENDING_COSIGN"
              const isOwnRequest = a.requestedById === currentUserId
              const isRejecting = rejectState?.id === a.id

              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{a.title ?? `Solicitud ${a.id.slice(-6)}`}</p>
                      {a.entityId && partidaMap[a.entityId] && (
                        <p className="text-xs text-muted-foreground">Partida: {partidaMap[a.entityId]}</p>
                      )}
                      {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${APPROVAL_STATUS_COLORS[a.status]}`}>
                          {APPROVAL_STATUSES[a.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">por {a.requestedBy.name}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                      </div>
                      {isPendingCosign && (
                        <p className="text-xs text-amber-600 mt-1">
                          {a.cosigner
                            ? <>Esperando co-firma de: <span className="font-medium">{a.cosigner.name}</span></>
                            : "Requiere co-firma de un autorizador"
                          }
                        </p>
                      )}

                      {/* Reject reason input */}
                      {isRejecting && (
                        <div className="mt-3 flex gap-2 items-center">
                          <input
                            autoFocus
                            placeholder="Motivo del rechazo..."
                            value={rejectState.reason}
                            onChange={e => setRejectState({ id: a.id, reason: e.target.value })}
                            className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            onKeyDown={e => {
                              if (e.key === "Enter") handleReject(a.id, rejectState.reason)
                              if (e.key === "Escape") setRejectState(null)
                            }}
                          />
                          <Button size="sm" variant="destructive" className="h-6 text-xs px-2"
                            onClick={() => handleReject(a.id, rejectState.reason)}
                            disabled={!rejectState.reason.trim() || loading === a.id}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                            onClick={() => setRejectState(null)}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {a.amount != null && (
                        <p className="font-display text-lg tabular-nums mb-2">{formatGTQ(a.amount)}</p>
                      )}
                      {canActOnApproval && !isOwnRequest && !isRejecting && (
                        <div className="flex gap-1.5 justify-end">
                          {isPendingCosign ? (
                            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                              onClick={() => handleCosign(a.id)}
                              disabled={loading === a.id}>
                              <GitMerge className="size-3.5 mr-1" />Co-firmar
                            </Button>
                          ) : (
                            <Button size="sm" className="h-7 text-xs"
                              onClick={() => handleApprove(a.id)}
                              disabled={loading === a.id}>
                              <CheckCircle2 className="size-3.5 mr-1" />Aprobar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => setRejectState({ id: a.id, reason: "" })}
                            disabled={loading === a.id}>
                            <XCircle className="size-3.5 mr-1" />Rechazar
                          </Button>
                        </div>
                      )}
                      {canActOnApproval && isOwnRequest && (
                        <p className="text-xs text-muted-foreground italic">Tu solicitud</p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
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

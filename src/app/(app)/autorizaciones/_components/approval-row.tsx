"use client"
import { ApprovalBadge } from "@/components/shared/approval-badge"
import { formatDate } from "@/lib/format"
import { ENTITY_TYPES } from "@/lib/schemas/authorization"
import { approveRequest, rejectRequest, cosignRequest } from "../actions"
import { Button } from "@/components/ui/button"
import { Check, X, PenLine } from "lucide-react"
import { useState } from "react"

interface ApprovalRequestRow {
  id: string
  entityType: string
  entityId: string
  status: string
  notes: string | null
  rejectionReason: string | null
  createdAt: Date
  requestedById: string
  requestedBy: { id: string; name: string }
  cosigner: { id: string; name: string } | null
  approvedBy: { id: string; name: string } | null
  rejectedBy: { id: string; name: string } | null
}

interface Props {
  request: ApprovalRequestRow
  currentUserId: string
}

export function ApprovalRow({ request: r, currentUserId }: Props) {
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const isRequester = currentUserId === r.requestedBy.id
  const isCosigner = r.cosigner && currentUserId === r.cosigner.id

  async function handle(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <p className="text-sm font-medium">{ENTITY_TYPES[r.entityType] ?? r.entityType}</p>
        <p className="text-xs text-muted-foreground font-mono">{r.entityId.slice(-8)}</p>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{r.requestedBy.name}</td>
      <td className="py-3 px-4">
        <ApprovalBadge status={r.status} />
        {r.cosigner && r.status === "PENDING_COSIGN" && (
          <p className="text-xs text-muted-foreground mt-0.5">Espera: {r.cosigner.name}</p>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(r.createdAt)}</td>
      <td className="py-3 px-4">
        {r.status === "APPROVED" && r.approvedBy && (
          <p className="text-xs text-emerald-600">Aprobado por {r.approvedBy.name}</p>
        )}
        {r.status === "REJECTED" && (
          <p className="text-xs text-destructive">{r.rejectionReason ?? "Rechazado"}</p>
        )}
        {(r.status === "PENDING" || r.status === "PENDING_COSIGN") && !rejectMode && (
          <div className="flex items-center gap-1.5">
            {r.status === "PENDING_COSIGN" && isCosigner && (
              <Button size="sm" variant="outline" disabled={loading}
                onClick={() => handle(() => cosignRequest(r.id))}>
                <PenLine className="size-3.5 mr-1" />Co-firmar
              </Button>
            )}
            {r.status === "PENDING" && !isRequester && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}
                onClick={() => handle(() => approveRequest(r.id))}>
                <Check className="size-3.5 mr-1" />Aprobar
              </Button>
            )}
            {!isRequester && (
              <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5"
                disabled={loading} onClick={() => setRejectMode(true)}>
                <X className="size-3.5 mr-1" />Rechazar
              </Button>
            )}
          </div>
        )}
        {rejectMode && (
          <div className="flex items-center gap-2">
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Motivo..." className="text-xs border rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-ring" />
            <Button size="sm" variant="destructive" disabled={!reason.trim() || loading}
              onClick={() => handle(() => rejectRequest(r.id, reason))}>
              OK
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejectMode(false)}>No</Button>
          </div>
        )}
      </td>
    </tr>
  )
}

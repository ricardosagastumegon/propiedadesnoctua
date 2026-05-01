"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, PenLine } from "lucide-react"

interface Props {
  requestId: string
  status: string
  currentUserId: string
  requestedById: string
  cosignerId?: string | null
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  onCosign: (id: string) => Promise<void>
}

export function ApprovalActions({
  requestId,
  status,
  currentUserId,
  requestedById,
  cosignerId,
  onApprove,
  onReject,
  onCosign,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState("")

  if (status === "APPROVED" || status === "REJECTED") return null

  const isRequester = currentUserId === requestedById
  const isCosigner = currentUserId === cosignerId

  async function handle(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  if (rejectMode) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motivo del rechazo"
          className="text-sm border rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          size="sm"
          variant="destructive"
          disabled={!reason.trim() || loading}
          onClick={() => handle(() => onReject(requestId, reason))}
        >
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejectMode(false)}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {status === "PENDING_COSIGN" && isCosigner && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handle(() => onCosign(requestId))}
        >
          <PenLine className="size-3.5 mr-1.5" />
          Co-firmar
        </Button>
      )}
      {status === "PENDING" && !isRequester && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={loading}
          onClick={() => handle(() => onApprove(requestId))}
        >
          <Check className="size-3.5 mr-1.5" />
          Aprobar
        </Button>
      )}
      {!isRequester && (
        <Button
          size="sm"
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/5"
          disabled={loading}
          onClick={() => setRejectMode(true)}
        >
          <X className="size-3.5 mr-1.5" />
          Rechazar
        </Button>
      )}
    </div>
  )
}

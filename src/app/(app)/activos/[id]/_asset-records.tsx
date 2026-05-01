"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { createAssetRecord, deleteAssetRecord } from "../actions"
import { Plus, Trash2, AlertTriangle, FileText } from "lucide-react"
import { differenceInDays } from "date-fns"

interface RecordType {
  id: string
  name: string
  code: string
}

interface AssetRecord {
  id: string
  title: string
  recordType: RecordType
  issueDate: Date | null
  expiryDate: Date | null
  notifyDaysBefore: number
  notes: string | null
}

interface Props {
  assetId: string
  records: AssetRecord[]
  recordTypes: RecordType[]
}

export function AssetRecords({ assetId, records, recordTypes }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const now = new Date()

  function getExpiryStatus(r: AssetRecord) {
    if (!r.expiryDate) return null
    const days = differenceInDays(new Date(r.expiryDate), now)
    if (days < 0) return { label: "Vencido", color: "text-destructive" }
    if (days <= r.notifyDaysBefore) return { label: `Vence en ${days} dias`, color: "text-amber-600" }
    return { label: `Vigente (${days} dias)`, color: "text-emerald-600" }
  }

  return (
    <div className="space-y-3">
      {records.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-6">Sin documentos registrados.</p>
      )}

      {records.map(r => {
        const status = getExpiryStatus(r)
        return (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.recordType.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    {r.issueDate && <span className="text-muted-foreground">Emitido: {formatDate(r.issueDate)}</span>}
                    {r.expiryDate && <span className="text-muted-foreground">Vence: {formatDate(r.expiryDate)}</span>}
                    {status && (
                      <span className={`flex items-center gap-1 font-medium ${status.color}`}>
                        {status.color === "text-destructive" || status.color === "text-amber-600"
                          ? <AlertTriangle className="size-3" />
                          : null}
                        {status.label}
                      </span>
                    )}
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                </div>
              </div>
              <button
                onClick={() => deleteAssetRecord(r.id, assetId)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        )
      })}

      {showForm ? (
        <Card className="p-4">
          <form
            action={async (fd) => {
              setLoading(true)
              await createAssetRecord(assetId, fd)
              setShowForm(false)
              setLoading(false)
            }}
            className="space-y-3"
          >
            <p className="text-sm font-medium">Nuevo documento</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Tipo *</label>
                <select name="recordTypeId" required
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Seleccionar...</option>
                  {recordTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Titulo *</label>
                <input name="title" required placeholder="Ej. Poliza 2025"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fecha emision</label>
                <input name="issueDate" type="date"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fecha vencimiento</label>
                <input name="expiryDate" type="date"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Avisar (dias antes)</label>
                <input name="notifyDaysBefore" type="number" defaultValue="30" min="1"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notas</label>
                <input name="notes" placeholder="Opcional"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>Guardar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-1.5" />Agregar documento
        </Button>
      )}
    </div>
  )
}

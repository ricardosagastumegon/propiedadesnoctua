"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Target, Check } from "lucide-react"
import { updateAcquisitionBrief } from "./actions"

export function BriefCard({ initialBrief, canEdit }: { initialBrief: string | null; canEdit: boolean }) {
  const [brief, setBrief] = useState(initialBrief ?? "")
  const [saved, setSaved] = useState(initialBrief ?? "")
  const [busy, setBusy] = useState(false)
  const dirty = brief.trim() !== saved.trim()

  async function save() {
    setBusy(true)
    const res = await updateAcquisitionBrief(brief)
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    setSaved(brief)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="size-4 text-[#8A6A2E]" />
        <h3 className="font-medium text-sm">¿Qué estás buscando ahora?</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Este texto se muestra a los agentes en tu link. Cambialo cuando cambie tu búsqueda
        (ej. hoy gasolineras, mañana edificios). El link es el mismo siempre.
      </p>

      {canEdit ? (
        <>
          <Textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={3}
            placeholder="Ej: Busco GASOLINERAS sobre carretera principal, mínimo 2 islas, hasta $500,000. Zona: Escuintla / Santa Rosa."
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{brief.length}/1000</span>
            <Button size="sm" onClick={save} disabled={busy || !dirty}>
              {busy ? "Guardando…" : saved && !dirty ? <><Check className="size-3.5 mr-1" />Guardado</> : "Guardar requerimiento"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{saved || <span className="text-muted-foreground">Sin requerimiento definido.</span>}</p>
      )}
    </Card>
  )
}

"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link2, Copy, RefreshCw, Check } from "lucide-react"
import { getOrCreateAcquisitionToken, regenerateAcquisitionToken } from "./actions"

export function LinkCard({ initialToken, canEdit }: { initialToken: string | null; canEdit: boolean }) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const link = token && typeof window !== "undefined" ? `${window.location.origin}/enviar/${token}` : ""

  async function generate() {
    setBusy(true)
    const res = await getOrCreateAcquisitionToken()
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    setToken(res.token)
  }
  async function regenerate() {
    if (!confirm("¿Generar un link nuevo? El link anterior dejará de funcionar.")) return
    setBusy(true)
    const res = await regenerateAcquisitionToken()
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    setToken(res.token)
  }
  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="size-4 text-[#8A6A2E]" />
        <h3 className="font-medium text-sm">Link para agentes</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Compartí este link con los agentes. Cuando suban una propiedad, te llega acá y te avisamos.
      </p>

      {token ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input readOnly value={link} onFocus={e => e.currentTarget.select()}
            className="flex-1 text-sm rounded-lg border px-3 py-2 bg-muted/30 font-mono truncate" />
          <Button size="sm" onClick={copy} className="shrink-0">
            {copied ? <><Check className="size-3.5 mr-1" />Copiado</> : <><Copy className="size-3.5 mr-1" />Copiar</>}
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={regenerate} disabled={busy} className="shrink-0">
              <RefreshCw className="size-3.5 mr-1" /> Nuevo link
            </Button>
          )}
        </div>
      ) : canEdit ? (
        <Button size="sm" onClick={generate} disabled={busy}>
          <Link2 className="size-3.5 mr-1" /> {busy ? "Generando…" : "Generar link"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">El administrador todavía no generó el link.</p>
      )}
    </Card>
  )
}

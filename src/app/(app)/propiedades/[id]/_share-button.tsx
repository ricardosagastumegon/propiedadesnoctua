"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { enablePublicShare, disablePublicShare } from "../actions"
import { Share2, Copy, CheckCheck, Link2Off, MessageCircle } from "lucide-react"

export function ShareButton({ propertyId, propertyName, initialToken }: {
  propertyId: string
  propertyName: string
  initialToken: string | null
}) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(initialToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${token}` : ""
  const waText = encodeURIComponent(`Mirá esta propiedad: ${propertyName}\n${url}`)
  const waLink = `https://wa.me/?text=${waText}`

  async function enable() {
    setLoading(true)
    const res = await enablePublicShare(propertyId)
    setLoading(false)
    if (res?.error) { alert(res.error); return }
    if (res?.token) setToken(res.token)
  }

  async function disable() {
    if (!confirm("¿Desactivar el link público? El enlace dejará de funcionar para quien lo tenga.")) return
    setLoading(true)
    const res = await disablePublicShare(propertyId)
    setLoading(false)
    if (res?.error) { alert(res.error); return }
    setToken(null)
  }

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="size-4 mr-1" />Compartir
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compartir propiedad</DialogTitle></DialogHeader>

          {!token ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generá un link público de solo lectura para enviar por WhatsApp. Quien lo abra verá
                la información, fotos y mapa de esta propiedad <strong>sin necesidad de cuenta</strong>.
                No se muestra ningún dato de tu organización ni de tus inquilinos.
              </p>
              <Button onClick={enable} disabled={loading} className="w-full">
                {loading ? "Generando…" : "Activar link público"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Link público</label>
                <div className="flex gap-2">
                  <input readOnly value={url}
                    className="flex-1 text-sm border rounded-md px-3 py-2 bg-muted/30 font-mono truncate"
                    onFocus={e => e.currentTarget.select()} />
                  <Button size="sm" variant="outline" onClick={copy}>
                    {copied ? <CheckCheck className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-medium py-2.5 rounded-md hover:bg-[#1fae57] transition-colors">
                <MessageCircle className="size-4" /> Compartir por WhatsApp
              </a>

              <button onClick={disable} disabled={loading}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-destructive hover:underline py-1">
                <Link2Off className="size-3.5" /> Desactivar link público
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

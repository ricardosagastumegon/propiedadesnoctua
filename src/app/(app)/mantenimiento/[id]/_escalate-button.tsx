"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { escalateToProject } from "../actions"
import { FolderKanban } from "lucide-react"

export function EscalateButton({ ticketId, defaultName }: { ticketId: string; defaultName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`Proyecto: ${defaultName}`)
  const [loading, setLoading] = useState(false)

  async function handleEscalate() {
    setLoading(true)
    const res = await escalateToProject(ticketId, name)
    setLoading(false)
    setOpen(false)
    if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FolderKanban className="size-4 mr-1.5" />
        Convertir a proyecto
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convertir ticket a proyecto</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Se creará un proyecto nuevo con la información de este ticket.
            </p>
            <div className="space-y-1.5">
              <Label>Nombre del proyecto</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleEscalate} disabled={loading || !name.trim()}>
              {loading ? "Creando..." : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

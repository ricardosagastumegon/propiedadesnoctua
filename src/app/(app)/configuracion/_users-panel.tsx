"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { createUser, toggleUserActive, updateUserRole, updateUserAuthorityPolicy, updateUserCanAcceptServices } from "./actions"
import { Plus, ChevronDown, ChevronRight, BadgeCheck } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  authorityPolicy: string
  isActive: boolean
  canAcceptServices?: boolean
}

const ROLES: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SUPERVISOR: "Supervisor",
  ASSISTANT: "Asistente",
  VIEWER: "Visualizador",
}

const AUTHORITY_POLICIES: Record<string, string> = {
  NONE: "Sin autoridad de firma",
  ALONE: "Puede actuar solo",
  COSIGN_REQUIRED: "Requiere co-firma",
}

export function UsersPanel({ users, currentUserId, currentUserRole = "VIEWER" }: { users: User[]; currentUserId: string; currentUserRole?: string }) {
  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "OWNER"
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState("VIEWER")
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const ref = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(ref.current!)
    fd.set("role", role)
    const res = await createUser(fd)
    setLoading(false)
    if (res?.error) setError(typeof res.error === "string" ? res.error : "Error al crear usuario")
    else { setOpen(false); setError(null) }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">Usuarios de la organizacion</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-3 mr-1" />Invitar
        </Button>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="border rounded-lg">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button onClick={() => setExpanded(e => e === u.id ? null : u.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                  {expanded === u.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} — {ROLES[u.role] ?? u.role} — {AUTHORITY_POLICIES[u.authorityPolicy] ?? u.authorityPolicy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {u.id === currentUserId ? (
                  <span className="text-xs text-muted-foreground">(yo)</span>
                ) : (
                  <Switch checked={u.isActive} onCheckedChange={v => toggleUserActive(u.id, v)} />
                )}
              </div>
            </div>

            {expanded === u.id && (
              <div className="px-3 pb-3 border-t pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Rol</label>
                    <Select defaultValue={u.role} onValueChange={v => updateUserRole(u.id, v)}>
                      <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Politica de autoridad</label>
                    <Select defaultValue={u.authorityPolicy} onValueChange={v => updateUserAuthorityPolicy(u.id, v)}>
                      <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(AUTHORITY_POLICIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/40 rounded">
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1">
                      <BadgeCheck className="size-3.5" />Puede aceptar servicios
                    </div>
                    <p className="text-xs text-muted-foreground">Habilita resolver aceptaciones antes del pago final.</p>
                  </div>
                  <Switch
                    checked={!!u.canAcceptServices}
                    onCheckedChange={v => updateUserCanAcceptServices(u.id, v)}
                    disabled={!isAdmin}
                  />
                </div>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground italic">Sólo administradores pueden modificar el permiso de aceptación.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
          <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Correo electronico *</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña temporal *</Label>
              <Input name="password" type="password" required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear usuario"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

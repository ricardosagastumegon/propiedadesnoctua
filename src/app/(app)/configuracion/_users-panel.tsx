"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { createUser, toggleUserActive } from "./actions"
import { Plus } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

const ROLES: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  VIEWER: "Lectura",
}

export function UsersPanel({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState("VIEWER")
  const [error, setError] = useState<string | null>(null)
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

  async function handleToggle(userId: string, active: boolean) {
    await toggleUserActive(userId, active)
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
          <div key={u.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email} — {ROLES[u.role] ?? u.role}</p>
            </div>
            {u.id !== currentUserId && (
              <Switch
                checked={u.isActive}
                onCheckedChange={v => handleToggle(u.id, v)}
              />
            )}
            {u.id === currentUserId && (
              <span className="text-xs text-muted-foreground">(yo)</span>
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

"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { TOGGLEABLE_MODULES } from "@/lib/permissions"
import { adminCreateTenant, adminSetModules, adminResetUserPassword, adminToggleUserActive, adminSetUserPassword } from "./actions"
import { Plus, Building2, Users, ChevronDown, ChevronRight, KeyRound, Power, PowerOff, Clock, Lock } from "lucide-react"

function fmtDate(iso: string | null): string {
  if (!iso) return "Nunca ingresó"
  const d = new Date(iso)
  return d.toLocaleString("es-GT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propietario", ADMIN: "Administrador", MANAGER: "Gerente", ACCOUNTANT: "Contador",
  SUPERVISOR: "Encargado", ASSISTANT: "Asistente", TECHNICIAN: "Técnico", VIEWER: "Solo lectura",
}

const MODULE_LABELS: Record<string, string> = {
  propiedades: "Propiedades + Mapa", inquilinos: "Inquilinos", contratos: "Contratos",
  pagos: "Pagos y Facturas", cajaChica: "Caja Chica", mantenimiento: "Mantenimiento",
  activos: "Activos", proyectos: "Proyectos", proveedores: "Proveedores", adquisiciones: "Adquisiciones (compra)",
  cotizaciones: "Cotizaciones", empleados: "Empleados", autorizaciones: "Autorizaciones",
  aceptaciones: "Aceptaciones", reportes: "Reportes",
}

export interface TenantRow {
  id: string
  name: string
  slug: string
  createdAt: string
  users: number
  properties: number
  enabledModules: string[] | null
  userList: TenantUser[]
}

export function AdminTenants({ tenants }: { tenants: TenantRow[] }) {
  const [showCreate, setShowCreate] = useState(false)
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1" />Crear tenant
        </Button>
      </div>

      <div className="space-y-2">
        {tenants.map(t => <TenantItem key={t.id} tenant={t} onCreds={setCreds} />)}
      </div>

      <CreateTenantDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(c) => { setShowCreate(false); if (c) setCreds(c) }}
      />

      <Dialog open={!!creds} onOpenChange={(v) => !v && setCreds(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Credenciales</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Compartí estas credenciales de forma segura. El usuario puede entrar directo y cambiarlas luego.</p>
          <pre className="text-xs bg-muted p-3 rounded-md font-mono whitespace-pre-wrap break-all">
            Email: {creds?.email}{"\n"}Contraseña: {creds?.password}
          </pre>
          <DialogFooter><Button size="sm" onClick={() => setCreds(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TenantItem({ tenant, onCreds }: { tenant: TenantRow; onCreds: (c: { email: string; password: string }) => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyUser, setBusyUser] = useState<string | null>(null)

  async function resetPwd(userId: string) {
    if (!confirm("¿Generar una contraseña nueva para este usuario? La actual dejará de funcionar.")) return
    setBusyUser(userId)
    const res = await adminResetUserPassword(userId)
    setBusyUser(null)
    if ("error" in res) { alert(res.error); return }
    onCreds({ email: res.email, password: res.password })
    router.refresh()
  }

  async function toggleActive(userId: string, isActive: boolean) {
    setBusyUser(userId)
    const res = await adminToggleUserActive(userId, isActive)
    setBusyUser(null)
    if ("error" in res) { alert(res.error); return }
    router.refresh()
  }

  async function setPwd(userId: string) {
    const pwd = prompt("Escribí la nueva contraseña para este usuario (mínimo 8 caracteres). Vos la elegís, así la conocés:")
    if (pwd == null) return
    if (pwd.length < 8) { alert("Mínimo 8 caracteres"); return }
    setBusyUser(userId)
    const res = await adminSetUserPassword(userId, pwd)
    setBusyUser(null)
    if ("error" in res) { alert(res.error); return }
    onCreds({ email: res.email, password: pwd })
    router.refresh()
  }
  // null = todos habilitados → marcamos todos
  const [selected, setSelected] = useState<Set<string>>(
    new Set(tenant.enabledModules ?? TOGGLEABLE_MODULES),
  )

  function toggle(m: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m); else next.add(m)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const res = await adminSetModules(tenant.id, Array.from(selected))
    setSaving(false)
    if ("error" in res) { alert(res.error); return }
    router.refresh()
    setOpen(false)
  }

  const moduleCount = tenant.enabledModules === null ? "todos" : `${tenant.enabledModules.length} módulos`

  return (
    <Card className="p-0 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <div className="min-w-0">
            <div className="font-medium text-sm">{tenant.name}</div>
            <div className="text-xs text-muted-foreground">/{tenant.slug} · {moduleCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><Building2 className="size-3.5" />{tenant.properties}</span>
          <span className="flex items-center gap-1"><Users className="size-3.5" />{tenant.users}</span>
        </div>
      </button>

      {open && (
        <div className="border-t p-4 bg-muted/20 space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Módulos habilitados</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOGGLEABLE_MODULES.map(m => (
              <label key={m} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-background">
                <input type="checkbox" checked={selected.has(m)} onChange={() => toggle(m)} />
                <span>{MODULE_LABELS[m] ?? m}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Dashboard y Configuración siempre están disponibles.</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set(["propiedades", "inquilinos", "contratos", "pagos", "reportes"]))}>
              Modo inmobiliario
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set(TOGGLEABLE_MODULES))}>
              Todos
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar módulos"}</Button>
          </div>

          {/* Usuarios del tenant */}
          <div className="pt-3 border-t">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Usuarios ({tenant.userList.length})
            </div>
            <div className="space-y-1.5">
              {tenant.userList.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-2 bg-background rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      {u.name}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</span>
                      {!u.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">Inactivo</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" /> Último ingreso: {fmtDate(u.lastLoginAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busyUser === u.id} onClick={() => setPwd(u.id)} title="Definir una clave que vos elegís">
                      <Lock className="size-3 mr-1" />Definir clave
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busyUser === u.id} onClick={() => resetPwd(u.id)} title="Generar una clave aleatoria">
                      <KeyRound className="size-3 mr-1" />Reset
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isActive ? "outline" : "default"}
                      className={`h-7 text-xs ${u.isActive ? "text-destructive" : ""}`}
                      disabled={busyUser === u.id}
                      onClick={() => toggleActive(u.id, !u.isActive)}
                    >
                      {u.isActive ? <PowerOff className="size-3" /> : <Power className="size-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function CreateTenantDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (creds: { email: string; password: string } | null) => void
}) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(ref.current!)
    const email = fd.get("adminEmail") as string
    const password = fd.get("adminPassword") as string
    const res = await adminCreateTenant(fd)
    setLoading(false)
    if (res?.error) { setError(res.error); return }
    router.refresh()
    onCreated({ email, password })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Crear nuevo tenant</DialogTitle></DialogHeader>
        <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tname">Nombre de la organización *</Label>
            <Input id="tname" name="name" required placeholder="Ej: Inmobiliaria López" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="aname">Nombre del admin *</Label>
              <Input id="aname" name="adminName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aemail">Email del admin *</Label>
              <Input id="aemail" name="adminEmail" type="email" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apass">Contraseña inicial *</Label>
            <Input id="apass" name="adminPassword" type="text" required minLength={8} placeholder="Mínimo 8 caracteres" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="realEstateMode" />
            <span>Modo inmobiliario (solo propiedades, inquilinos, contratos, pagos, reportes)</span>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creando…" : "Crear tenant"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { ROLE_PERMISSIONS, MODULES, type Module, type ModulePermission } from "@/lib/permissions"
import {
  inviteUser, updateUserAdmin, deactivateUser, reactivateUser, resetUserPassword, setUserPasswordManual,
} from "./actions"
import {
  Plus, ChevronDown, ChevronRight, KeyRound, PowerOff, Power,
  Shield, BadgeCheck, Copy, CheckCheck, Pencil, Check, Minus,
} from "lucide-react"

const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  propiedades: "Propiedades",
  inquilinos: "Inquilinos",
  contratos: "Contratos",
  pagos: "Pagos",
  cajaChica: "Caja chica",
  mantenimiento: "Mantenimiento",
  activos: "Activos",
  proyectos: "Proyectos",
  proveedores: "Proveedores",
  cotizaciones: "Cotizaciones",
  empleados: "Empleados",
  autorizaciones: "Autorizaciones",
  aceptaciones: "Aceptaciones",
  adquisiciones: "Adquisiciones",
  reportes: "Reportes",
  configuracion: "Configuración",
}

export const ROLES: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  ACCOUNTANT: "Contador",
  SUPERVISOR: "Encargado",
  ASSISTANT: "Asistente",
  TECHNICIAN: "Técnico",
  VIEWER: "Solo lectura",
}

export const AUTHORITY_POLICIES: Record<string, string> = {
  NONE: "Sin autoridad de firma",
  ALONE: "Puede firmar solo",
  COSIGN_REQUIRED: "Requiere co-firma",
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800",
  ADMIN: "bg-indigo-100 text-indigo-800",
  MANAGER: "bg-blue-100 text-blue-800",
  ACCOUNTANT: "bg-emerald-100 text-emerald-800",
  SUPERVISOR: "bg-amber-100 text-amber-800",
  ASSISTANT: "bg-cyan-100 text-cyan-800",
  TECHNICIAN: "bg-orange-100 text-orange-800",
  VIEWER: "bg-gray-100 text-gray-700",
}

export interface UserRow {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  authorityPolicy: string
  canAcceptServices: boolean
  isActive: boolean
  lastLoginAt: Date | null
  mustChangePassword: boolean
  cosignAllowedIds: string[]
  propertyIds: string[]
}

export interface PropertyOption {
  id: string
  name: string
}

interface Props {
  users: UserRow[]
  properties: PropertyOption[]
  currentUserId: string
  currentUserRole: string
}

export function UsersManager({ users, properties, currentUserId, currentUserRole }: Props) {
  const isAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  const [showInvite, setShowInvite] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [credsDialog, setCredsDialog] = useState<{ email: string; password: string; name: string } | null>(null)

  const filtered = users.filter(u => {
    if (filterRole !== "ALL" && u.role !== filterRole) return false
    if (filterStatus === "ACTIVE" && !u.isActive) return false
    if (filterStatus === "INACTIVE" && u.isActive) return false
    return true
  })

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Solo administradores pueden gestionar usuarios. Tu rol actual ({ROLES[currentUserRole] ?? currentUserRole}) tiene acceso de lectura limitado.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-sm">Usuarios de la organización</h3>
          <p className="text-xs text-muted-foreground">{users.filter(u => u.isActive).length} activos · {users.length} total</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="size-3 mr-1" />Invitar usuario
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los roles</SelectItem>
            {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v: "ALL" | "ACTIVE" | "INACTIVE") => setFilterStatus(v)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="INACTIVE">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin usuarios que coincidan con los filtros.</p>
        ) : (
          filtered.map(u => (
            <UserRowItem
              key={u.id}
              user={u}
              users={users}
              properties={properties}
              currentUserId={currentUserId}
              isExpanded={editingId === u.id}
              onToggleExpand={() => setEditingId(editingId === u.id ? null : u.id)}
              onCredsGenerated={setCredsDialog}
            />
          ))
        )}
      </div>

      {/* Invitar */}
      <InviteUserDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        users={users}
        properties={properties}
        onCredsGenerated={creds => {
          setShowInvite(false)
          setCredsDialog(creds)
        }}
      />

      {/* Credenciales temporales */}
      <CredentialsDialog creds={credsDialog} onClose={() => setCredsDialog(null)} />
    </Card>
  )
}

function UserRowItem({
  user, users, properties, currentUserId, isExpanded, onToggleExpand, onCredsGenerated,
}: {
  user: UserRow
  users: UserRow[]
  properties: PropertyOption[]
  currentUserId: string
  isExpanded: boolean
  onToggleExpand: () => void
  onCredsGenerated: (creds: { email: string; password: string; name: string }) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const isSelf = user.id === currentUserId
  const propertiesText = user.propertyIds.length === 0
    ? "Todas las propiedades"
    : `${user.propertyIds.length} propiedad${user.propertyIds.length !== 1 ? "es" : ""}`

  async function handleToggleActive(v: boolean) {
    setLoading("toggle")
    const res = v ? await reactivateUser(user.id) : await deactivateUser(user.id)
    setLoading(null)
    if (res?.error) alert(res.error)
  }

  return (
    <div className={`border rounded-lg ${!user.isActive ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between p-3 gap-3">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/40 -m-1 p-1 rounded transition-colors"
        >
          <span className="text-muted-foreground shrink-0">
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{user.name}</p>
              <Badge className={`text-[10px] ${ROLE_COLORS[user.role]}`}>{ROLES[user.role] ?? user.role}</Badge>
              {user.canAcceptServices && (
                <span title="Puede aceptar servicios">
                  <BadgeCheck className="size-3.5 text-emerald-600" />
                </span>
              )}
              {!user.isActive && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
              {user.mustChangePassword && <Badge variant="secondary" className="text-[10px]">Debe cambiar password</Badge>}
              {isSelf && <span className="text-xs text-muted-foreground italic">(yo)</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.email}
              {" · "}{AUTHORITY_POLICIES[user.authorityPolicy] ?? user.authorityPolicy}
              {" · "}{propertiesText}
              {user.lastLoginAt && <span> · Último ingreso: {formatDate(user.lastLoginAt)}</span>}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleExpand}
            className="h-7 text-xs"
          >
            <Pencil className="size-3 mr-1" />
            {isExpanded ? "Cerrar" : "Editar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPasswordDialog(true)}
            disabled={loading !== null}
            className="h-7 text-xs"
            title="Cambiar contraseña del usuario"
          >
            <KeyRound className="size-3 mr-1" />
            Contraseña
          </Button>
          {!isSelf && (
            <Button
              size="sm"
              variant={user.isActive ? "outline" : "default"}
              onClick={() => handleToggleActive(!user.isActive)}
              disabled={loading !== null}
              className={`h-7 text-xs ${user.isActive ? "text-destructive hover:text-destructive" : ""}`}
            >
              {user.isActive ? (
                <><PowerOff className="size-3 mr-1" />Suspender</>
              ) : (
                <><Power className="size-3 mr-1" />Reactivar</>
              )}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <EditUserPanel
          user={user}
          users={users}
          properties={properties}
          currentUserId={currentUserId}
          onSaved={() => onToggleExpand()}
        />
      )}

      <PasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        user={user}
        onCredsGenerated={(c) => {
          setShowPasswordDialog(false)
          onCredsGenerated(c)
        }}
      />
    </div>
  )
}

function PasswordDialog({
  open, onOpenChange, user, onCredsGenerated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: UserRow
  onCredsGenerated: (creds: { email: string; password: string; name: string }) => void
}) {
  const [mode, setMode] = useState<"temp" | "manual">("temp")
  const [manualPassword, setManualPassword] = useState("")
  const [forceChange, setForceChange] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successManual, setSuccessManual] = useState<{ password: string; forceChange: boolean } | null>(null)

  function reset() {
    setMode("temp")
    setManualPassword("")
    setForceChange(false)
    setError(null)
    setSuccessManual(null)
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    if (mode === "temp") {
      const res = await resetUserPassword(user.id)
      setLoading(false)
      if (res?.ok) {
        reset()
        onCredsGenerated({ email: res.userEmail!, password: res.tempPassword!, name: res.userName! })
      } else {
        setError(res?.error ?? "Error al generar contraseña")
      }
    } else {
      if (manualPassword.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres")
        setLoading(false)
        return
      }
      const res = await setUserPasswordManual(user.id, manualPassword, forceChange)
      setLoading(false)
      if (res?.ok) {
        setSuccessManual({ password: manualPassword, forceChange })
      } else {
        setError(res?.error ?? "Error al establecer contraseña")
      }
    }
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contraseña de {user.name}</DialogTitle>
        </DialogHeader>

        {successManual ? (
          <div className="space-y-3">
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
              Contraseña actualizada para <strong>{user.email}</strong>.
              {successManual.forceChange
                ? " Le pediremos cambiarla en su próximo login."
                : " Puede entrar directo con esta contraseña."}
            </div>
            <pre className="text-xs bg-muted p-3 rounded-md font-mono whitespace-pre-wrap break-all">
              Email: {user.email}{"\n"}Contraseña: {successManual.password}
            </pre>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">¿Cómo querés cambiar la contraseña?</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "temp"}
                    onChange={() => setMode("temp")}
                    className="mt-0.5"
                  />
                  <div className="text-sm">
                    <div className="font-medium">Generar temporal</div>
                    <div className="text-xs text-muted-foreground">
                      Crea una contraseña aleatoria segura. El usuario será obligado a cambiarla en su próximo login.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                    className="mt-0.5"
                  />
                  <div className="text-sm flex-1">
                    <div className="font-medium">Establecer manualmente</div>
                    <div className="text-xs text-muted-foreground">
                      Vos elegís la contraseña. Por defecto, el usuario entra directo sin tener que cambiarla.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {mode === "manual" && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                <div className="space-y-1.5">
                  <Label htmlFor="manualPass" className="text-xs">Nueva contraseña</Label>
                  <Input
                    id="manualPass"
                    type="text"
                    value={manualPassword}
                    onChange={e => setManualPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Si la querés generar segura, copiá algo como: <code className="bg-background px-1 rounded">{generateRandomPasswordHint()}</code>
                  </p>
                </div>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceChange}
                    onChange={e => setForceChange(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Forzar al usuario a cambiarla en su próximo login (más seguro)
                  </span>
                </label>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Guardando…" : mode === "temp" ? "Generar y mostrar" : "Establecer contraseña"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Solo para hint visual — el usuario puede copiar y modificar
function generateRandomPasswordHint(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  let r = ""
  for (let i = 0; i < 10; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}

function EditUserPanel({
  user, users, properties, currentUserId, onSaved,
}: {
  user: UserRow
  users: UserRow[]
  properties: PropertyOption[]
  currentUserId: string
  onSaved: () => void
}) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? "")
  const [role, setRole] = useState(user.role)
  const [authorityPolicy, setAuthorityPolicy] = useState(user.authorityPolicy)
  const [canAcceptServices, setCanAcceptServices] = useState(user.canAcceptServices)
  const [cosignerIds, setCosignerIds] = useState<string[]>(user.cosignAllowedIds)
  const [allProperties, setAllProperties] = useState<boolean>(user.propertyIds.length === 0)
  const [propertyIds, setPropertyIds] = useState<string[]>(user.propertyIds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eligibleCosigners = users.filter(u => u.id !== user.id && u.isActive)

  async function handleSave() {
    setLoading(true)
    setError(null)
    const res = await updateUserAdmin({
      userId: user.id,
      name, phone: phone || null, role, authorityPolicy, canAcceptServices,
      cosignerIds: authorityPolicy === "COSIGN_REQUIRED" ? cosignerIds : [],
      propertyIds: allProperties ? [] : propertyIds,
    })
    setLoading(false)
    if (res?.error) setError(res.error)
    else onSaved()
  }

  function togglePropertyId(id: string) {
    setPropertyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleCosignerId(id: string) {
    setCosignerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="border-t p-4 space-y-4 bg-muted/20">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Teléfono</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rol</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Política de autorización</Label>
          <Select value={authorityPolicy} onValueChange={setAuthorityPolicy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(AUTHORITY_POLICIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {authorityPolicy === "COSIGN_REQUIRED" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Co-firmantes elegibles ({cosignerIds.length} seleccionados)</Label>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
            {eligibleCosigners.map(u => (
              <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-muted/50 rounded">
                <input
                  type="checkbox"
                  checked={cosignerIds.includes(u.id)}
                  onChange={() => toggleCosignerId(u.id)}
                  className="rounded"
                />
                <span>{u.name} ({ROLES[u.role]})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-2 bg-background rounded">
        <div className="flex items-center gap-2 text-sm">
          <BadgeCheck className="size-4 text-emerald-600" />
          <span>Puede aceptar servicios</span>
        </div>
        <Switch checked={canAcceptServices} onCheckedChange={setCanAcceptServices} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-2">
          <Shield className="size-3" />Acceso a propiedades
        </Label>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={allProperties}
              onChange={() => setAllProperties(true)}
            />
            <span>Todas las propiedades</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={!allProperties}
              onChange={() => setAllProperties(false)}
            />
            <span>Propiedades específicas</span>
          </label>
        </div>
        {!allProperties && (
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2 bg-background">
            {properties.length === 0 ? (
              <p className="col-span-2 text-xs text-muted-foreground p-2">Sin propiedades en la organización.</p>
            ) : properties.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-muted/50 rounded">
                <input
                  type="checkbox"
                  checked={propertyIds.includes(p.id)}
                  onChange={() => togglePropertyId(p.id)}
                  className="rounded"
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <RolePermissionsPreview role={role} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onSaved}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  )
}

/**
 * Muestra qué módulos y acciones puede hacer el rol seleccionado.
 * Read-only — el rol define los permisos; para cambiar acceso a un usuario
 * específico, cambiar su rol.
 */
function RolePermissionsPreview({ role }: { role: string }) {
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.VIEWER
  const accessibleModules = MODULES.filter(m => perms[m].view)
  const noAccessModules = MODULES.filter(m => !perms[m].view)

  return (
    <div className="space-y-2 border rounded-md p-3 bg-background">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-2">
          <Shield className="size-3" />
          Módulos accesibles para {ROLES[role] ?? role}
        </Label>
        <span className="text-[10px] text-muted-foreground">
          {accessibleModules.length} de {MODULES.length} módulos
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Para darle acceso distinto a este usuario, cambiá su <strong>Rol</strong> arriba.
        Los módulos están determinados por el rol — no se pueden activar individualmente.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
        {MODULES.map(m => {
          const p: ModulePermission = perms[m]
          const can = p.view
          return (
            <div
              key={m}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${can ? "bg-emerald-50 text-emerald-900" : "bg-muted text-muted-foreground"}`}
              title={can ? actionsList(p) : "Sin acceso"}
            >
              {can ? <Check className="size-3 text-emerald-600 shrink-0" /> : <Minus className="size-3 shrink-0" />}
              <span className="truncate">{MODULE_LABELS[m]}</span>
              {can && <ActionDots perms={p} />}
            </div>
          )
        })}
      </div>
      {noAccessModules.length > 0 && (
        <p className="text-[10px] text-muted-foreground pt-1">
          Sin acceso a: {noAccessModules.map(m => MODULE_LABELS[m]).join(", ")}
        </p>
      )}
    </div>
  )
}

function ActionDots({ perms }: { perms: ModulePermission }) {
  // V = view, C = create, E = edit, D = delete
  const flags = [
    { key: "V", on: perms.view },
    { key: "C", on: perms.create },
    { key: "E", on: perms.edit },
    { key: "D", on: perms.delete },
  ]
  return (
    <span className="ml-auto flex gap-0.5">
      {flags.map(f => (
        <span
          key={f.key}
          className={`text-[9px] font-mono w-3 h-3 flex items-center justify-center rounded ${f.on ? "bg-emerald-200 text-emerald-900" : "bg-muted-foreground/20 text-muted-foreground/50"}`}
          title={`${f.key === "V" ? "Ver" : f.key === "C" ? "Crear" : f.key === "E" ? "Editar" : "Eliminar"}: ${f.on ? "sí" : "no"}`}
        >
          {f.key}
        </span>
      ))}
    </span>
  )
}

function actionsList(p: ModulePermission): string {
  const a = []
  if (p.view) a.push("ver")
  if (p.create) a.push("crear")
  if (p.edit) a.push("editar")
  if (p.delete) a.push("eliminar")
  return `Puede: ${a.join(", ")}`
}

function InviteUserDialog({
  open, onOpenChange, users, properties, onCredsGenerated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  users: UserRow[]
  properties: PropertyOption[]
  onCredsGenerated: (creds: { email: string; password: string; name: string }) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("ASSISTANT")
  const [authorityPolicy, setAuthorityPolicy] = useState("NONE")
  const [canAcceptServices, setCanAcceptServices] = useState(false)
  const [cosignerIds, setCosignerIds] = useState<string[]>([])
  const [allProperties, setAllProperties] = useState(true)
  const [propertyIds, setPropertyIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(""); setEmail(""); setPhone(""); setRole("ASSISTANT")
    setAuthorityPolicy("NONE"); setCanAcceptServices(false); setCosignerIds([])
    setAllProperties(true); setPropertyIds([]); setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await inviteUser({
      name, email, phone: phone || null, role, authorityPolicy, canAcceptServices,
      cosignerIds: authorityPolicy === "COSIGN_REQUIRED" ? cosignerIds : undefined,
      propertyIds: allProperties ? [] : propertyIds,
    })
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else if (res?.ok) {
      reset()
      onCredsGenerated({ email: res.userEmail!, password: res.tempPassword!, name: res.userName! })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Invitar nuevo usuario</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre completo *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1">
              <Label>Rol *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Política de autorización</Label>
              <Select value={authorityPolicy} onValueChange={setAuthorityPolicy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUTHORITY_POLICIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-sm">
                <Switch checked={canAcceptServices} onCheckedChange={setCanAcceptServices} />
                <span>Puede aceptar servicios</span>
              </Label>
            </div>
          </div>

          {authorityPolicy === "COSIGN_REQUIRED" && (
            <div className="space-y-1">
              <Label className="text-xs">Co-firmantes elegibles</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto border rounded-md p-2">
                {users.filter(u => u.isActive).map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cosignerIds.includes(u.id)}
                      onChange={() => setCosignerIds(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])}
                    />
                    <span>{u.name} ({ROLES[u.role]})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <RolePermissionsPreview role={role} />

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-2">
              <Shield className="size-3" />Acceso a propiedades
            </Label>
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={allProperties} onChange={() => setAllProperties(true)} />
                Todas
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={!allProperties} onChange={() => setAllProperties(false)} />
                Específicas
              </label>
            </div>
            {!allProperties && properties.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto border rounded-md p-2">
                {properties.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertyIds.includes(p.id)}
                      onChange={() => setPropertyIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando…" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CredentialsDialog({
  creds, onClose,
}: {
  creds: { email: string; password: string; name: string } | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const text = creds ? `Email: ${creds.email}\nContraseña temporal: ${creds.password}` : ""

  async function copy() {
    if (!creds) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={!!creds} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Credenciales temporales — {creds?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Comparte estas credenciales con el usuario de forma segura. <strong>Deberá cambiar la contraseña en su primer ingreso.</strong>
          </p>
          <pre className="text-xs bg-muted p-3 rounded-md font-mono whitespace-pre-wrap break-all">
            {text}
          </pre>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            ⚠️ Esta contraseña <strong>NO se mostrará otra vez</strong>. Copiala ahora.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Cerrar</Button>
            <Button size="sm" onClick={copy}>
              {copied ? <><CheckCheck className="size-3 mr-1" />Copiado</> : <><Copy className="size-3 mr-1" />Copiar credenciales</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
import {
  inviteUser, updateUserAdmin, deactivateUser, reactivateUser, resetUserPassword,
} from "./actions"
import {
  Plus, ChevronDown, ChevronRight, Power, PowerOff, KeyRound,
  Shield, BadgeCheck, Copy, CheckCheck,
} from "lucide-react"

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
  const isSelf = user.id === currentUserId
  const propertiesText = user.propertyIds.length === 0
    ? "Todas las propiedades"
    : `${user.propertyIds.length} propiedad${user.propertyIds.length !== 1 ? "es" : ""}`

  async function handleResetPassword() {
    if (!confirm(`¿Generar una nueva contraseña temporal para ${user.name}?`)) return
    setLoading("reset")
    const res = await resetUserPassword(user.id)
    setLoading(null)
    if (res?.ok) {
      onCredsGenerated({ email: res.userEmail!, password: res.tempPassword!, name: res.userName! })
    } else {
      alert(res?.error)
    }
  }

  async function handleToggleActive(v: boolean) {
    setLoading("toggle")
    const res = v ? await reactivateUser(user.id) : await deactivateUser(user.id)
    setLoading(null)
    if (res?.error) alert(res.error)
  }

  return (
    <div className={`border rounded-lg ${!user.isActive ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={onToggleExpand} className="text-muted-foreground hover:text-foreground shrink-0">
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
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
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetPassword}
            disabled={loading !== null}
            title="Resetear contraseña"
            className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            <KeyRound className="size-3.5" />
          </button>
          {isSelf ? (
            <span className="text-[10px] text-muted-foreground italic">activo</span>
          ) : (
            <Switch
              checked={user.isActive}
              onCheckedChange={handleToggleActive}
              disabled={loading !== null}
            />
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
    </div>
  )
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

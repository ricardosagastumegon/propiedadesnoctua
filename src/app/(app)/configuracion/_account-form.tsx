"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, BadgeCheck } from "lucide-react"
import { updateMyAccount, changePassword } from "./actions"
import { ROLES, AUTHORITY_POLICIES } from "./users/_users-manager"

interface Props {
  me: {
    id: string; name: string; email: string; phone: string | null
    role: string; authorityPolicy: string; canAcceptServices: boolean
  }
  cosigners: { id: string; name: string }[]
  propertyAccess: { id: string; name: string }[]
}

export function AccountForm({ me, cosigners, propertyAccess }: Props) {
  const accRef = useRef<HTMLFormElement>(null)
  const pwdRef = useRef<HTMLFormElement>(null)
  const [accLoading, setAccLoading] = useState(false)
  const [accSaved, setAccSaved] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleAcc(e: React.FormEvent) {
    e.preventDefault()
    setAccLoading(true)
    const fd = new FormData(accRef.current!)
    await updateMyAccount(fd)
    setAccLoading(false)
    setAccSaved(true)
    setTimeout(() => setAccSaved(false), 2000)
  }

  async function handlePwd(e: React.FormEvent) {
    e.preventDefault()
    setPwdLoading(true)
    const fd = new FormData(pwdRef.current!)
    const res = await changePassword(fd)
    setPwdLoading(false)
    if (res?.error) setPwdMsg({ type: "err", text: res.error })
    else { setPwdMsg({ type: "ok", text: "Contraseña actualizada" }); pwdRef.current?.reset() }
    setTimeout(() => setPwdMsg(null), 3000)
  }

  return (
    <div className="space-y-6">
      <form ref={accRef} onSubmit={handleAcc}>
        <Card className="p-6 space-y-4">
          <h3 className="font-medium text-sm">Datos personales</h3>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input name="name" defaultValue={me.name} />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input name="email" type="email" defaultValue={me.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">El correo no se puede cambiar.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input name="phone" defaultValue={me.phone ?? ""} placeholder="Opcional" />
          </div>
          <Button type="submit" disabled={accLoading}>
            {accSaved ? "Guardado" : accLoading ? "Guardando..." : "Guardar"}
          </Button>
        </Card>
      </form>

      {/* Permisos asignados (solo lectura) */}
      <Card className="p-6 space-y-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Shield className="size-4" />Mis permisos
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Rol</p>
            <Badge>{ROLES[me.role] ?? me.role}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Política de autorización</p>
            <p>{AUTHORITY_POLICIES[me.authorityPolicy] ?? me.authorityPolicy}</p>
          </div>
        </div>
        {me.canAcceptServices && (
          <p className="text-sm flex items-center gap-2 text-emerald-700">
            <BadgeCheck className="size-4" /> Tenés permiso para aceptar servicios
          </p>
        )}
        {me.authorityPolicy === "COSIGN_REQUIRED" && cosigners.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Co-firmantes habilitados</p>
            <div className="flex flex-wrap gap-1">
              {cosigners.map(c => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Acceso a propiedades</p>
          {propertyAccess.length === 0 ? (
            <p className="text-sm">Todas las propiedades de la organización</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {propertyAccess.map(p => <Badge key={p.id} variant="secondary">{p.name}</Badge>)}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground italic pt-1 border-t">
          Para cambiar tus permisos, contactá a un administrador.
        </p>
      </Card>

      <form ref={pwdRef} onSubmit={handlePwd}>
        <Card className="p-6 space-y-4">
          <h3 className="font-medium text-sm">Cambiar contraseña</h3>
          <div className="space-y-1.5">
            <Label>Contraseña actual</Label>
            <Input name="current" type="password" autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label>Nueva contraseña (mínimo 10 caracteres)</Label>
            <Input name="newPass" type="password" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <Input name="confirm" type="password" autoComplete="new-password" />
          </div>
          {pwdMsg && (
            <p className={`text-sm ${pwdMsg.type === "ok" ? "text-emerald-600" : "text-destructive"}`}>{pwdMsg.text}</p>
          )}
          <Button type="submit" disabled={pwdLoading}>
            {pwdLoading ? "Cambiando..." : "Cambiar contraseña"}
          </Button>
        </Card>
      </form>
    </div>
  )
}

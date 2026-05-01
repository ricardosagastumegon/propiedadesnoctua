"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { updateMyAccount, changePassword } from "./actions"

export function AccountForm({ me }: { me: { id: string; name: string; email: string } }) {
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
          <h3 className="font-medium text-sm">Mi cuenta</h3>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input name="name" defaultValue={me.name} />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electronico</Label>
            <Input name="email" type="email" defaultValue={me.email} />
          </div>
          <Button type="submit" disabled={accLoading}>
            {accSaved ? "Guardado" : accLoading ? "Guardando..." : "Guardar"}
          </Button>
        </Card>
      </form>

      <form ref={pwdRef} onSubmit={handlePwd}>
        <Card className="p-6 space-y-4">
          <h3 className="font-medium text-sm">Cambiar contraseña</h3>
          <div className="space-y-1.5">
            <Label>Contraseña actual</Label>
            <Input name="current" type="password" />
          </div>
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <Input name="newPass" type="password" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <Input name="confirm" type="password" />
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

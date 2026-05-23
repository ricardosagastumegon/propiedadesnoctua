"use client"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// Only inlined into the page when NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true"
// (no se setea en Vercel production → falsy → campos vacíos)
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get("reset") === "ok") {
      toast.success("Contraseña actualizada. Iniciá sesión con la nueva.")
    }
  }, [searchParams])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    })
    setLoading(false)
    if (res?.error) toast.error("Credenciales invalidas o demasiados intentos")
    else router.push("/dashboard")
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div>
          <div className="font-display text-3xl tracking-tight">Inmobiliaria Pro</div>
          <div className="text-sm text-primary-foreground/60 mt-1">Gestion integral de propiedades</div>
        </div>
        <div>
          <p className="font-display text-2xl leading-snug max-w-md">
            "Operar 30 propiedades dejo de ser un caos de hojas de calculo."
          </p>
          <p className="text-sm text-primary-foreground/60 mt-3">- Cliente piloto, ciudad de Guatemala</p>
        </div>
        <div className="text-xs text-primary-foreground/40">(c) 2026 Inmobiliaria Pro</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="font-display text-2xl tracking-tight">Iniciar sesion</div>
          <p className="text-sm text-muted-foreground mt-1 mb-8">Accede a tu panel de gestion.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email" name="email" type="email" required
                defaultValue={SHOW_DEMO ? "demo@inmobiliaria.gt" : ""}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password" name="password" type="password" required
                defaultValue={SHOW_DEMO ? "demo1234" : ""}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
            <p className="text-xs text-right">
              <Link href="/recuperar-password" className="text-muted-foreground hover:text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">Registrate</Link>
          </p>
          {SHOW_DEMO && (
            <p className="text-xs text-muted-foreground mt-6">
              Demo: demo@inmobiliaria.gt / demo1234
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
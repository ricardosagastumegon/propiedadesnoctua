import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SignupForm } from "./_form"

export const dynamic = "force-dynamic"

export default async function SignupPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div>
          <div className="font-display text-3xl tracking-tight">Noctua Propiedades</div>
          <div className="text-sm text-primary-foreground/60 mt-1">Gestión integral de propiedades</div>
        </div>
        <div className="max-w-md">
          <p className="font-display text-2xl leading-snug">
            Empezá en 60 segundos.
          </p>
          <p className="text-sm text-primary-foreground/70 mt-4">
            Creá tu empresa, registrá propiedades, gestioná contratos, mantenimiento y pagos desde un solo lugar.
          </p>
          <ul className="text-sm text-primary-foreground/60 mt-6 space-y-1.5">
            <li>• Multi-tenant: tus datos solo los ves vos.</li>
            <li>• Roles y permisos por usuario.</li>
            <li>• Aceptación de servicios y cap del 80% antes de pagar.</li>
            <li>• Auditoría completa de cada acción.</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/40">© 2026 Noctua Propiedades</div>
      </div>

      <div className="flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-10">
          <div className="font-display text-2xl tracking-tight">Crear cuenta</div>
          <p className="text-sm text-muted-foreground mt-1 mb-8">Empezá a usar Noctua para tu organización.</p>
          <SignupForm />
          <p className="text-sm text-muted-foreground mt-6 text-center">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { RecuperarForm } from "./_form"

export const dynamic = "force-dynamic"

export default async function RecuperarPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8">
        <PageHeader
          title="Recuperar contraseña"
          description="Te enviaremos un enlace por email para crear una nueva."
        />
        <div className="mt-6">
          <RecuperarForm />
        </div>
        <p className="text-sm text-muted-foreground mt-6 text-center">
          <Link href="/login" className="hover:underline">Volver al inicio de sesión</Link>
        </p>
      </Card>
    </div>
  )
}

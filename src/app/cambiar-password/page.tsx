import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { ChangePasswordForm } from "./_form"

export const dynamic = "force-dynamic"

export default async function CambiarPasswordPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8">
        <PageHeader
          title="Cambiar contraseña"
          description="Para tu seguridad, debés cambiar tu contraseña antes de continuar usando el sistema."
        />
        <ChangePasswordForm forced />
      </Card>
    </div>
  )
}

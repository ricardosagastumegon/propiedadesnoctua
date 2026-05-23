import Link from "next/link"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { prisma } from "@/lib/prisma"
import { RestablecerForm } from "./_form"

export const dynamic = "force-dynamic"

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams
  const token = sp.token?.trim() || ""

  let state: "valid" | "missing" | "invalid" | "expired" | "used" = "missing"
  if (token) {
    const row = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { expiresAt: true, usedAt: true },
    })
    if (!row) state = "invalid"
    else if (row.usedAt) state = "used"
    else if (row.expiresAt < new Date()) state = "expired"
    else state = "valid"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8">
        <PageHeader
          title="Nueva contraseña"
          description="Creá una contraseña nueva para tu cuenta."
        />
        <div className="mt-6">
          {state === "valid" ? (
            <RestablecerForm token={token} />
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-4">
                {state === "missing" && "Faltó el token en el enlace. Pedí uno nuevo."}
                {state === "invalid" && "Enlace inválido. Pedí uno nuevo."}
                {state === "expired" && "Este enlace expiró. Pedí uno nuevo."}
                {state === "used" && "Este enlace ya fue usado. Si necesitás cambiar la contraseña de nuevo, pedí otro."}
              </div>
              <p className="text-sm text-center">
                <Link href="/recuperar-password" className="text-primary hover:underline font-medium">
                  Solicitar un enlace nuevo
                </Link>
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

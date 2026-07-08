import { prisma } from "@/lib/prisma"
import { SubmitForm } from "./_form"

export const dynamic = "force-dynamic"

export default async function EnviarPropiedadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const settings = await prisma.organizationSettings.findUnique({
    where: { acquisitionToken: token },
    select: { acquisitionBrief: true, organization: { select: { name: true } } },
  })

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] p-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl text-[#12182A]">Link no válido</h1>
          <p className="text-sm text-[#6B7280] mt-2">Este enlace no existe o fue desactivado. Pedile al cliente su link actualizado.</p>
        </div>
      </div>
    )
  }

  return <SubmitForm token={token} orgName={settings.organization.name} brief={settings.acquisitionBrief} />
}

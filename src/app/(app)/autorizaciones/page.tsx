import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { ApprovalRow } from "./_components/approval-row"

export default async function AutorizacionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const userId = session.user!.id!
  const orgId = (session.user as any).organizationId as string

  const [pending, history] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId, status: { in: ["PENDING", "PENDING_COSIGN"] } },
      include: {
        requestedBy: { select: { id: true, name: true } },
        cosigner: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId, status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        requestedBy: { select: { id: true, name: true } },
        cosigner: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Autorizaciones"
        description="Solicitudes de aprobación pendientes y historial."
      />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="font-medium text-sm mb-4">
            Pendientes
            {pending.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 px-4">Entidad</th>
                    <th className="text-left py-2 px-4">Solicitado por</th>
                    <th className="text-left py-2 px-4">Estado</th>
                    <th className="text-left py-2 px-4">Fecha</th>
                    <th className="text-left py-2 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(r => (
                    <ApprovalRow key={r.id} request={r} currentUserId={userId} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {history.length > 0 && (
          <Card className="p-6">
            <h2 className="font-medium text-sm mb-4 text-muted-foreground">Historial reciente</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 px-4">Entidad</th>
                    <th className="text-left py-2 px-4">Solicitado por</th>
                    <th className="text-left py-2 px-4">Estado</th>
                    <th className="text-left py-2 px-4">Fecha</th>
                    <th className="text-left py-2 px-4">Resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <ApprovalRow key={r.id} request={r} currentUserId={userId} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

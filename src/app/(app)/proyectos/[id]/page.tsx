import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatGTQ } from "@/lib/format"
import { PROJECT_TYPES, PROJECT_STATUSES, PROJECT_STATUS_COLORS } from "@/lib/schemas/project"
import { TaskList } from "./_task-list"
import { CostList } from "./_cost-list"
import { PartidaList } from "./_partida-list"
import { ProjectApprovals } from "./_project-approvals"
import { PagosTab } from "./_pagos-tab"
import { ActivityTrail } from "./_activity-trail"
import { DeleteProjectButton } from "./_delete-button"
import { getProjectActivityTrail } from "@/lib/project-activity-trail"
import { getPrepaymentCap } from "@/lib/service-acceptance"
import { Building2, Calendar, CheckSquare2, Download } from "lucide-react"

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ expandPartida?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const userId = session.user!.id!
  const authorityPolicy = (session.user as any).authorityPolicy as string | undefined
  const { id } = await params
  const sp = await searchParams
  const expandPartida = sp.expandPartida

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      tasks: { orderBy: { orderIndex: "asc" } },
      costs: { orderBy: { date: "desc" } },
      partidas: {
        orderBy: { orderIndex: "asc" },
        include: {
          vendor: { select: { name: true } },
          approvedQuote: { include: { vendor: { select: { name: true, id: true } } } },
          payments: { orderBy: { date: "desc" } },
          quotes: {
            orderBy: { createdAt: "desc" },
            include: {
              vendor: { select: { name: true, id: true, rating: true, phone: true, email: true } },
              items: true,
            },
          },
        },
      },
    },
  })
  if (!project) notFound()

  // Fetch approval requests for this project's partidas + activity trail
  const partidaIds = project.partidas.map(p => p.id)
  const [approvalRequests, activityTrail, acceptances, cap, vendors] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId, entityType: "PROJECT_PARTIDA", entityId: { in: partidaIds } },
      include: {
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        cosigner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getProjectActivityTrail(id, orgId),
    partidaIds.length > 0
      ? prisma.serviceAcceptance.findMany({
          where: { organizationId: orgId, entityType: "PARTIDA", entityId: { in: partidaIds }, status: { in: ["PENDING", "ACCEPTED"] } },
          include: { acceptedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    getPrepaymentCap(orgId),
    prisma.vendor.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, contactName: true, phone: true, email: true, rating: true },
    }),
  ])
  const acceptanceByPartidaId: Record<string, {
    cap: number; hasAcceptance: boolean
    acceptanceStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED" | null
    acceptedByName: string | null; acceptedAt: string | null; acceptanceId: string | null
  }> = {}
  for (const p of project.partidas) {
    const a = acceptances.find(x => x.entityId === p.id)
    acceptanceByPartidaId[p.id] = {
      cap,
      hasAcceptance: a?.status === "ACCEPTED",
      acceptanceStatus: (a?.status as any) ?? null,
      acceptedByName: a?.acceptedBy?.name ?? null,
      acceptedAt: a?.acceptedAt?.toISOString() ?? null,
      acceptanceId: a?.id ?? null,
    }
  }

  // KPI computations
  const totalApproved = project.partidas.reduce((s, p) => s + (p.amountApproved ?? 0), 0)
  const totalPaid = project.partidas.reduce((s, p) => s + p.amountPaid, 0)
  const saldo = totalApproved - totalPaid
  const deliveredOrPaid = project.partidas.filter(p => {
    const approved = p.amountApproved ?? 0
    return p.deliveredAt != null || (approved > 0 && p.amountPaid >= approved)
  }).length
  const avance = project.partidas.length > 0
    ? Math.round((deliveredOrPaid / project.partidas.length) * 100)
    : 0
  const pendingApprovals = approvalRequests.filter(a => a.status === "PENDING" || a.status === "PENDING_COSIGN").length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={project.name}
        description={`${PROJECT_TYPES[project.type] ?? project.type ?? "Proyecto"} — ${PROJECT_STATUSES[project.status] ?? project.status}`}
      >
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/proyectos/${id}/pdf`} target="_blank">
              <Download className="size-3.5 mr-1.5" />PDF
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/proyectos/${id}/editar`}>Editar</Link>
          </Button>
          <DeleteProjectButton id={id} />
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avance</p>
          <p className="font-display text-2xl tabular-nums">{avance}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Partidas</p>
          <p className="font-display text-2xl tabular-nums">{project.partidas.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total aprobado</p>
          <p className="font-display text-xl tabular-nums">{totalApproved > 0 ? formatGTQ(totalApproved) : "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total pagado</p>
          <p className="font-display text-xl tabular-nums text-emerald-600">{totalPaid > 0 ? formatGTQ(totalPaid) : "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo</p>
          <p className={`font-display text-xl tabular-nums ${saldo > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {totalApproved > 0 ? formatGTQ(saldo) : "—"}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="partidas">
        <TabsList className="mb-4">
          <TabsTrigger value="partidas">
            Partidas ({project.partidas.length})
          </TabsTrigger>
          <TabsTrigger value="autorizaciones" className="relative">
            Autorizaciones
            {pendingApprovals > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 text-[10px] px-1">{pendingApprovals}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline
            {activityTrail.length > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 text-[10px] px-1" variant="secondary">{activityTrail.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tareas">Tareas ({project.tasks.length})</TabsTrigger>
          <TabsTrigger value="costos">Costos ({project.costs.length})</TabsTrigger>
          <TabsTrigger value="info">Informacion</TabsTrigger>
        </TabsList>

        <TabsContent value="partidas">
          <PartidaList
            projectId={id}
            partidas={project.partidas as any}
            authorityPolicy={authorityPolicy ?? "NONE"}
            expandPartidaId={expandPartida}
            acceptanceByPartidaId={acceptanceByPartidaId}
            vendors={vendors}
          />
        </TabsContent>

        <TabsContent value="autorizaciones">
          <ProjectApprovals
            projectId={id}
            approvalRequests={approvalRequests as any}
            partidas={project.partidas as any}
            orgId={orgId}
            currentUserId={userId}
            authorityPolicy={authorityPolicy ?? "NONE"}
          />
        </TabsContent>

        <TabsContent value="pagos">
          <Card className="p-6">
            <PagosTab partidas={project.partidas as any} trail={activityTrail} />
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Timeline cronológico del proyecto</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Todos los eventos: creación, partidas, cotizaciones, autorizaciones, pagos, aceptaciones — ordenados cronológicamente.
            </p>
            <ActivityTrail trail={activityTrail} />
          </Card>
        </TabsContent>

        <TabsContent value="tareas">
          <TaskList projectId={id} tasks={project.tasks} />
        </TabsContent>

        <TabsContent value="costos">
          <CostList projectId={id} costs={project.costs} />
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Estado</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${PROJECT_STATUS_COLORS[project.status]}`}>
                  {PROJECT_STATUSES[project.status]}
                </span>
              </div>
              {project.property && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Propiedad</p>
                  <Link href={`/propiedades/${project.propertyId}`} className="hover:underline flex items-center gap-1">
                    <Building2 className="size-3" />{project.property.name}
                  </Link>
                </div>
              )}
              {project.startDate && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Inicio</p>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(project.startDate)}</span>
                </div>
              )}
              {project.endDate && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Objetivo</p>
                  <span>{formatDate(project.endDate)}</span>
                </div>
              )}
              {project.budgetEstimate && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Presupuesto estimado</p>
                  <span className="tabular-nums">{formatGTQ(project.budgetEstimate)}</span>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Progreso general</p>
                <span className="flex items-center gap-1"><CheckSquare2 className="size-3" />{project.progressPercent}%</span>
              </div>
            </div>
            {project.description && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Descripcion</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}
            {project.notes && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Notas</p>
                <p className="text-sm">{project.notes}</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

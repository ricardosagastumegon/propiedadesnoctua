import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatGTQ } from "@/lib/format"
import { PROJECT_TYPES, PROJECT_STATUSES, PROJECT_STATUS_COLORS, COST_TYPES } from "@/lib/schemas/project"
import { TaskList } from "./_task-list"
import { CostList } from "./_cost-list"
import { DeleteProjectButton } from "./_delete-button"
import { Building2, Calendar } from "lucide-react"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      tasks: { orderBy: { orderIndex: "asc" } },
      costs: { orderBy: { date: "desc" } },
    },
  })
  if (!project) notFound()

  const budgetUsedPct = project.budgetTotal > 0 ? Math.min(100, (project.budgetSpent / project.budgetTotal) * 100) : 0
  const doneTasks = project.tasks.filter(t => t.status === "DONE").length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={project.name}
        description={`${PROJECT_TYPES[project.type]} — ${PROJECT_STATUSES[project.status]}`}
      >
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/proyectos/${id}/editar`}>Editar</Link>
          </Button>
          <DeleteProjectButton id={id} />
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avance</p>
          <p className="font-display text-2xl tabular-nums">{project.progressPercent}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tareas</p>
          <p className="font-display text-2xl tabular-nums">{doneTasks}/{project.tasks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gastado</p>
          <p className="font-display text-2xl tabular-nums">{formatGTQ(project.budgetSpent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Presupuesto</p>
          <p className={`font-display text-2xl tabular-nums ${budgetUsedPct > 90 ? "text-destructive" : ""}`}>
            {formatGTQ(project.budgetTotal)}
          </p>
        </Card>
      </div>

      {/* Budget progress */}
      <Card className="p-4 mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Uso del presupuesto</span>
          <span>{budgetUsedPct.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`rounded-full h-2 transition-all ${budgetUsedPct > 90 ? "bg-destructive" : "bg-foreground"}`}
            style={{ width: `${budgetUsedPct}%` }}
          />
        </div>
      </Card>

      <Tabs defaultValue="tareas">
        <TabsList className="mb-4">
          <TabsTrigger value="tareas">Tareas ({project.tasks.length})</TabsTrigger>
          <TabsTrigger value="costos">Costos ({project.costs.length})</TabsTrigger>
          <TabsTrigger value="info">Informacion</TabsTrigger>
        </TabsList>

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

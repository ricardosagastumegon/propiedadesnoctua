import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { formatDate, formatGTQ } from "@/lib/format"
import { EMPLOYEE_STATUSES, EMPLOYEE_STATUS_COLORS, PAY_PERIODS } from "@/lib/schemas/employee"
import { DeleteEmployeeButton } from "./_delete-button"
import { Mail, Phone, Hash, Briefcase, Calendar } from "lucide-react"

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: orgId },
    include: {
      assignments: {
        include: { project: true },
        orderBy: { startDate: "desc" },
      },
    },
  })
  if (!employee) notFound()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title={employee.fullName} description={employee.position}>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/empleados/${id}/editar`}>Editar</Link>
          </Button>
          <DeleteEmployeeButton id={id} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Asignaciones</h3>
            {employee.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin asignaciones.</p>
            ) : (
              <div className="space-y-2">
                {employee.assignments.map(a => (
                  <div key={a.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        {a.project && (
                          <Link href={`/proyectos/${a.projectId}`} className="text-sm font-medium hover:underline">
                            {a.project.name}
                          </Link>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(a.startDate)} {a.endDate ? `— ${formatDate(a.endDate)}` : "(en curso)"}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        {a.hoursWorked != null && <p>{a.hoursWorked} hrs</p>}
                        {a.amountPaid != null && <p className="font-medium">{formatGTQ(a.amountPaid)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Informacion</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground shrink-0" />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EMPLOYEE_STATUS_COLORS[employee.status]}`}>
                  {EMPLOYEE_STATUSES[employee.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="size-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs">{employee.documentNumber}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <span>{employee.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span>Ingreso: {formatDate(employee.hireDate)}</span>
              </div>
              {employee.terminationDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span>Salida: {formatDate(employee.terminationDate)}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-sm mb-2">Salario</h3>
            <p className="font-display text-xl tabular-nums">{formatGTQ(employee.payRate)}</p>
            <p className="text-xs text-muted-foreground">{PAY_PERIODS[employee.payPeriod]}</p>
          </Card>

          {employee.notes && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm">{employee.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

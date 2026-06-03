import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatGTQ } from "@/lib/format"
import { EMPLOYEE_STATUSES, EMPLOYEE_STATUS_COLORS, PAY_PERIODS } from "@/lib/schemas/employee"
import { Users, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EmpleadosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { assignments: true } } },
    orderBy: { fullName: "asc" },
  })

  const active = employees.filter(e => e.status === "ACTIVE")

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Empleados" description={`${active.length} activos · ${employees.length} total`}>
        <Button asChild>
          <Link href="/empleados/nuevo"><Plus className="size-4 mr-1" />Nuevo empleado</Link>
        </Button>
      </PageHeader>

      {employees.length === 0 ? (
        <Card><EmptyState icon={Users} title="Sin empleados" description="Registra el primer empleado." action={{ label: "Nuevo empleado", href: "/empleados/nuevo" }} /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/empleados/${e.id}`} className="font-medium hover:underline">{e.fullName}</Link>
                  </TableCell>
                  <TableCell>{e.position}</TableCell>
                  <TableCell>{e.phone}</TableCell>
                  <TableCell>{formatDate(e.hireDate)}</TableCell>
                  <TableCell className="tabular-nums">{formatGTQ(e.payRate)} / {PAY_PERIODS[e.payPeriod]}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EMPLOYEE_STATUS_COLORS[e.status]}`}>
                      {EMPLOYEE_STATUSES[e.status]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

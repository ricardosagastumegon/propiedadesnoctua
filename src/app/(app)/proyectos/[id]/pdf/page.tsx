import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getProjectActivityTrail } from "@/lib/project-activity-trail"
import { PrintTrigger } from "./_print-trigger"
import { PrintButton } from "./_print-button"

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planificación", IN_PROGRESS: "En progreso", COMPLETED: "Completado",
  CANCELLED: "Cancelado", ON_HOLD: "En pausa",
}
const PARTIDA_STATUS: Record<string, string> = {
  PENDING_QUOTES: "Sin cotizaciones", AWAITING_APPROVAL: "Esperando aprobación",
  APPROVED: "Aprobada", IN_PROGRESS: "En progreso", DELIVERED: "Entregada",
  PAID: "Pagada", CANCELLED: "Cancelada",
}
const ACTION_LABELS: Record<string, string> = {
  CREATED: "Creado", UPDATED: "Actualizado", DELETED: "Eliminado",
  STATUS_CHANGED: "Cambio de estado", PAYMENT_REGISTERED: "Pago registrado",
  QUOTE_ADDED: "Cotización agregada", QUOTE_SELECTED: "Cotización seleccionada",
  APPROVED: "Aprobado", REJECTED: "Rechazado", COSIGNED: "Co-firmado",
  ESCALATED: "Escalado", CANCELLED: "Cancelado", DELIVERED: "Entregado",
  APPROVAL_REQUESTED: "Autorización solicitada",
}

function fmt(n: number) { return `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ProjectPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      partidas: {
        orderBy: { orderIndex: "asc" },
        include: {
          vendor: { select: { name: true } },
          approvedQuote: { include: { vendor: { select: { name: true } } } },
          payments: { orderBy: { date: "asc" } },
          quotes: { include: { vendor: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  })
  if (!project) notFound()

  const [approvalRequests, trail] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId, entityType: "PROJECT_PARTIDA", entityId: { in: project.partidas.map(p => p.id) } },
      include: {
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        rejectedBy: { select: { name: true } },
        cosigner: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getProjectActivityTrail(id, orgId),
  ])

  const approvalMap = new Map(approvalRequests.map(a => [a.entityId, a]))
  const totalApproved = project.partidas.reduce((s, p) => s + (p.amountApproved ?? 0), 0)
  const totalPaid = project.partidas.reduce((s, p) => s + p.amountPaid, 0)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page { size: A4; margin: 18mm 16mm; }
        @media print {
          aside, header, nav, [data-sidebar], .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        .pdf-body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; padding: 16px; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 20pt; font-weight: 700; margin-bottom: 4px; }
        h2 { font-size: 13pt; font-weight: 600; margin-bottom: 10px; margin-top: 20px; padding-bottom: 4px; border-bottom: 1.5px solid #e2e8f0; color: #0f172a; }
        h3 { font-size: 10pt; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
        .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
        .kpi-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
        .kpi-val { font-size: 14pt; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .kpi-val.green { color: #16a34a; }
        .kpi-val.red { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 12px; }
        th { background: #f1f5f9; text-align: left; padding: 7px 8px; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; font-weight: 600; }
        td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .badge { display: inline-block; padding: 2px 7px; border-radius: 100px; font-size: 8pt; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-blue { background: #dbeafe; color: #1d4ed8; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .badge-gray { background: #f1f5f9; color: #475569; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .partida-card { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
        .partida-header { background: #f8fafc; padding: 10px 12px; display: flex; justify-content: space-between; align-items: flex-start; }
        .partida-body { padding: 10px 12px; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
        .page-break { page-break-before: always; }
      `}</style>

      <PrintTrigger />

      <div className="pdf-body">
        {/* Print button — hidden when printing */}
        <div className="no-print" style={{ marginBottom: 24 }}>
          <PrintButton />
        </div>

        {/* Header */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1>{project.name}</h1>
              <p className="subtitle">
                {project.property?.name && `${project.property.name} · `}
                {STATUS_LABELS[project.status] ?? project.status}
                {project.startDate && ` · Inicio: ${fmtDate(project.startDate)}`}
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: "9pt", color: "#64748b" }}>
              <p>Generado: {fmtDate(new Date())}</p>
              <p>Informe de proyecto</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-label">Partidas</div>
            <div className="kpi-val">{project.partidas.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Total aprobado</div>
            <div className="kpi-val">{totalApproved > 0 ? fmt(totalApproved) : "—"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Total pagado</div>
            <div className="kpi-val green">{totalPaid > 0 ? fmt(totalPaid) : "—"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Saldo pendiente</div>
            <div className={`kpi-val ${totalApproved - totalPaid > 0 ? "red" : "green"}`}>
              {totalApproved > 0 ? fmt(totalApproved - totalPaid) : "—"}
            </div>
          </div>
        </div>

        {/* Partidas */}
        <h2>Partidas y cotizaciones</h2>
        {project.partidas.map(p => {
          const approval = approvalMap.get(p.id)
          return (
            <div key={p.id} className="partida-card">
              <div className="partida-header">
                <div>
                  <strong style={{ fontSize: "11pt" }}>{p.name}</strong>
                  {p.description && <div style={{ fontSize: "9pt", color: "#64748b", marginTop: 2 }}>{p.description}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`badge ${p.status === "PAID" ? "badge-green" : p.status === "APPROVED" || p.status === "IN_PROGRESS" ? "badge-blue" : p.status === "CANCELLED" ? "badge-red" : "badge-gray"}`}>
                    {PARTIDA_STATUS[p.status] ?? p.status}
                  </span>
                  {(p.amountApproved ?? 0) > 0 && (
                    <div style={{ marginTop: 4, fontSize: "10pt" }}>
                      <strong>{fmt(p.amountApproved!)}</strong>
                      <span style={{ color: "#64748b", marginLeft: 8 }}>Pagado: {fmt(p.amountPaid)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="partida-body">
                {/* Quotes */}
                {p.quotes.length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>Monto</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.quotes.map(q => (
                        <tr key={q.id}>
                          <td>{q.vendor.name}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(q.total)}</td>
                          <td>
                            <span className={`badge ${q.status === "APPROVED" ? "badge-green" : q.status === "REJECTED" ? "badge-red" : "badge-amber"}`}>
                              {q.status === "APPROVED" ? "Aprobada" : q.status === "REJECTED" ? "Rechazada" : "Pendiente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Approval info */}
                {approval && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fafc", borderRadius: 4, fontSize: "9pt" }}>
                    <strong>Autorización:</strong>{" "}
                    <span className={`badge ${approval.status === "APPROVED" ? "badge-green" : approval.status === "REJECTED" ? "badge-red" : "badge-amber"}`}>
                      {approval.status === "APPROVED" ? "Aprobada" : approval.status === "REJECTED" ? "Rechazada" : approval.status === "PENDING_COSIGN" ? "Pendiente co-firma" : "Pendiente"}
                    </span>
                    {" · "} Solicitada por: {approval.requestedBy.name}
                    {approval.approvedBy && ` · Aprobada por: ${approval.approvedBy.name}`}
                    {approval.rejectedBy && ` · Rechazada por: ${approval.rejectedBy.name}`}
                    {approval.cosigner && ` · Co-firma: ${approval.cosigner.name}`}
                    {approval.rejectionReason && <span style={{ color: "#dc2626" }}> · "{approval.rejectionReason}"</span>}
                  </div>
                )}

                {/* Payments */}
                {p.payments.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <h3>Pagos registrados</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Método</th>
                          <th>%</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.payments.map(pay => (
                          <tr key={pay.id}>
                            <td>{fmtDate(pay.date)}</td>
                            <td>{pay.type}</td>
                            <td>{pay.method}{pay.reference ? ` (${pay.reference})` : ""}</td>
                            <td>{pay.percentageOfTotal != null ? `${pay.percentageOfTotal}%` : "—"}</td>
                            <td style={{ fontWeight: 600 }}>
                              {fmt(pay.amount)}
                              {pay.closesWithDiscount && pay.discountAmount && (
                                <span style={{ color: "#d97706", marginLeft: 4, fontSize: "8.5pt" }}>desc.{fmt(pay.discountAmount)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: "#f8fafc" }}>
                          <td colSpan={4} style={{ fontWeight: 600 }}>Total pagado</td>
                          <td style={{ fontWeight: 700 }}>{fmt(p.amountPaid)}</td>
                        </tr>
                        {(p.amountApproved ?? 0) > p.amountPaid && (
                          <tr>
                            <td colSpan={4} style={{ color: "#dc2626" }}>Saldo pendiente</td>
                            <td style={{ fontWeight: 700, color: "#dc2626" }}>{fmt((p.amountApproved ?? 0) - p.amountPaid)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Activity Trail */}
        {trail.length > 0 && (
          <>
            <h2 className="page-break">Trazabilidad — Audit trail</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Actor</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {trail.map(entry => {
                  const meta = entry.metadata
                  const detail = [
                    meta?.partida && `Partida: ${meta.partida}`,
                    meta?.name && `${meta.name}`,
                    meta?.vendor && `Proveedor: ${meta.vendor}`,
                    meta?.amount && `Q${(meta.amount as number).toFixed(2)}`,
                    meta?.method && `via ${meta.method}`,
                    meta?.percentageOfTotal && `${meta.percentageOfTotal}%`,
                    meta?.reason && `"${meta.reason}"`,
                  ].filter(Boolean).join(" · ")
                  return (
                    <tr key={entry.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(entry.createdAt)}</td>
                      <td><strong>{ACTION_LABELS[entry.action] ?? entry.action}</strong></td>
                      <td style={{ color: "#64748b" }}>{entry.entityType}</td>
                      <td style={{ color: "#0f172a" }}>{entry.actorName ?? "—"}</td>
                      <td style={{ color: "#64748b", fontSize: "9pt" }}>{detail || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="footer">
          <span>TU PROPIEDAD — Sistema de Gestión Inmobiliaria</span>
          <span>Generado el {fmtDate(new Date())}</span>
        </div>
      </div>
    </>
  )
}
